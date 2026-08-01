import { ChatCerebras } from "@langchain/cerebras";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { fetchReadme, fetchFileTree, fetchCommits, fetchBranches, fetchFileContent } from "@/lib/github";

export const maxDuration = 60;

function extractMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          if ("text" in item && typeof (item as { text: unknown }).text === "string") {
            return (item as { text: string }).text;
          }
          if ("type" in item && (item as { type: string }).type === "text" && "text" in item) {
            return String((item as { text: unknown }).text);
          }
        }
        return "";
      })
      .join(" ");
  }
  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text: unknown }).text);
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const { repoFullName, userMessage, conversationHistory = [], githubToken } = await req.json();

    if (!repoFullName || !userMessage) {
      return new Response(JSON.stringify({ reply: "Missing repoFullName or userMessage", toolCalls: [] }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const apiKey = process.env.CEREBRAS_API_KEY;
    const modelName = process.env.CEREBRAS_MODEL || "gemma-4-31b";

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          reply: "Error: CEREBRAS_API_KEY is not configured in .env.local.",
          toolCalls: [],
        }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const parts = repoFullName.split('/');
    const owner = parts[0];
    const repo = parts[1];

    const [readme, branches, commits, defaultTree] = await Promise.all([
      fetchReadme(owner, repo, githubToken),
      fetchBranches(owner, repo, githubToken),
      fetchCommits(owner, repo, 20, githubToken),
      fetchFileTree(owner, repo, 'HEAD', githubToken)
    ]);

    const commitsText = commits
      .map(c => `- ${c.commit.author.date.slice(0, 10)} (${c.commit.author.name}): ${c.commit.message}`)
      .join('\n');

    const branchesText = branches.join(', ');
    const treeText = defaultTree.slice(0, 200).join('\n') + (defaultTree.length > 200 ? `\n... and ${defaultTree.length - 200} more files` : '');

    const systemPrompt = `You are an expert AI software architect and code consultant for the GitHub repository: ${repoFullName}.
You must ground all your answers in the actual repository data provided below or obtained via tools, never making assumptions or using hallucinated knowledge. Do not use any emojis in your response. Use clean markdown formatting (including bold text, bulleted lists, and code blocks) to organize your answers.
When you call a tool to inspect a file, you must read the tool output and clearly summarize or answer the user's question about the file contents in your final text response.

## Loaded Memory for ${repoFullName}:

### Branches:
${branchesText || 'None found'}

### Recent 20 Commits:
${commitsText || 'No commits available'}

### Repository File Tree (HEAD):
${treeText || 'Empty repository or tree unavailable'}

### README.md Content:
${readme.slice(0, 4000)}

You have access to a tool called \`read_file\` that allows you to inspect the exact content of any file in this repository by providing its filePath and branch name (defaults to HEAD or master/main if unknown). Use this tool proactively when asked about implementation details, code architecture, or specific file logic!`;

    const readFileTool = tool(
      async ({ filePath, branch }) => {
        const content = await fetchFileContent(owner, repo, filePath, branch || 'HEAD', githubToken);
        return content.length > 10000 ? content.slice(0, 10000) + '\n[File truncated at 10,000 chars]' : content;
      },
      {
        name: "read_file",
        description: "Read the exact source code or content of any file inside this repository. Use whenever you need to inspect implementation details.",
        schema: z.object({
          filePath: z.string().describe("Path to the file from repository root, e.g. 'src/index.ts' or 'package.json'"),
          branch: z.string().describe("Branch name to read from (e.g. 'main', 'master', or 'HEAD')"),
        }),
      }
    );

    const tools = [readFileTool];

    const baseLlm = new ChatCerebras({
      model: modelName,
      apiKey: apiKey,
    });

    const llm = baseLlm.bindTools(tools);

    const agentNode = async (state: typeof MessagesAnnotation.State) => {
      const response = await llm.invoke(state.messages);
      return { messages: [response] };
    };

    const workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", agentNode)
      .addNode("tools", new ToolNode(tools))
      .addEdge("__start__", "agent")
      .addConditionalEdges("agent", toolsCondition)
      .addEdge("tools", "agent");

    const app = workflow.compile();

    const allMessages: BaseMessage[] = [new SystemMessage(systemPrompt)];
    for (const msg of conversationHistory) {
      if (msg.role === 'user') {
        allMessages.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        allMessages.push(new AIMessage(msg.content));
      }
    }
    allMessages.push(new HumanMessage(userMessage));

    const result = await app.invoke({ messages: allMessages });
    const finalMessages = result.messages || [];
    let cleanTextReply = "";
    const executedTools: Array<{ name: string; params: Record<string, unknown> }> = [];

    for (let i = allMessages.length; i < finalMessages.length; i++) {
      const m = finalMessages[i] as {
        type?: string;
        _getType?: () => string;
        content?: unknown;
        tool_calls?: Array<{ name: string; args: Record<string, unknown> }>;
      };
      const mType = (typeof m._getType === "function" ? m._getType() : m.type || "").toLowerCase();

      if ((mType === "aimessage" || mType === "ai" || mType === "assistant" || mType === "model") && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
        for (const tc of m.tool_calls) {
          executedTools.push({
            name: tc.name,
            params: (tc.args && typeof tc.args === "object" ? tc.args : { arg: String(tc.args || "") }) as Record<string, unknown>,
          });
        }
        const textContent = extractMessageText(m.content);
        if (textContent.trim().length > 0) {
          cleanTextReply += textContent.trim() + "\n\n";
        }
      } else if (mType === "aimessage" || mType === "ai" || mType === "assistant" || mType === "model") {
        const textContent = extractMessageText(m.content);
        if (textContent.trim().length > 0) {
          cleanTextReply += textContent.trim() + "\n\n";
        }
      }
    }

    if (!cleanTextReply.trim() && executedTools.length > 0) {
      for (let i = allMessages.length; i < finalMessages.length; i++) {
        const m = finalMessages[i] as { type?: string; _getType?: () => string; content?: unknown };
        const mType = (typeof m._getType === "function" ? m._getType() : m.type || "").toLowerCase();
        if (mType === "tool" || mType === "toolmessage") {
          const toolOutput = extractMessageText(m.content);
          if (toolOutput.trim().length > 0) {
            cleanTextReply = `Here is the inspected content from ${executedTools[0].name}:\n\n\`\`\`\n${toolOutput.trim()}\n\`\`\``;
            break;
          }
        }
      }
    }

    const cleanReply = cleanTextReply.trim();

    return new Response(
      JSON.stringify({
        reply: cleanReply || "No text answer returned by agent.",
        toolCalls: executedTools,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  } catch (err) {
    const errorMsg = `Error: ${err instanceof Error ? err.message : "Internal server error in repo chat"}`;
    return new Response(
      JSON.stringify({
        reply: errorMsg,
        toolCalls: [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
}
