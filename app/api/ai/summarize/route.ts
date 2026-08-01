import { ChatCerebras } from "@langchain/cerebras";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { username, name, bio, location, created_at, repos, websiteUrl } = await req.json();

    let websiteText = '';
    if (websiteUrl) {
      try {
        const targetUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
        const webRes = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
        if (webRes.ok) {
          const html = await webRes.text();
          websiteText = html
            .replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, '')
            .replace(/<style[^>]*>([\S\s]*?)<\/style>/gim, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 3000);
        }
      } catch {
        // Silently fallback if website cannot be reached
      }
    }

    const apiKey = process.env.CEREBRAS_API_KEY;
    const modelName = process.env.CEREBRAS_MODEL || "gemma-4-31b";

    if (!apiKey) {
      return new Response(
        "Error: CEREBRAS_API_KEY is not configured in .env.local.",
        { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    const model = new ChatCerebras({
      model: modelName,
      apiKey: apiKey,
    });

    const systemPrompt = `You are an expert developer profile analyst. Given the following GitHub user data, provide a concise, engaging, and structured summary of who this developer is, what they work on, their apparent expertise areas, and any notable technical focus.
Do not use any emojis in your response. Use clean markdown formatting (like bold text and bulleted lists) to structure your analysis. Be specific and grounded — only reference information present in the provided data.`;

    const userMessageContent = `Analyze GitHub User @${username}:
Name: ${name || 'N/A'}
Bio: ${bio || 'No bio provided'}
Location: ${location || 'N/A'}
Joined: ${created_at}

Top Recent Repositories (up to 20):
${Array.isArray(repos) ? repos.map(r => `- ${r.name}: ${r.description || 'No description'}`).join('\n') : 'None'}

${websiteText ? `Content extracted from user website (${websiteUrl}):\n${websiteText}` : 'No personal website content available.'}

Provide your structured developer analysis now without emojis:`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessageContent),
    ]);

    const contentStr = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const cleanReply = contentStr.trim();

    return new Response(cleanReply || "No analysis returned by model.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const errText = error instanceof Error ? error.message : "Failed to generate summary";
    return new Response(
      errText,
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}
