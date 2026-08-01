# github-query-tool

<img width="1917" height="849" alt="image" src="https://github.com/user-attachments/assets/0fa9c049-4861-4219-9502-35ff0d52d83d" />

a minimal developer explorer and repository ai inspector built with next.js, langgraph, and cerebras.

## current architecture

1. typescript frontend
2. langchain / langgraph
3. data persists on local storage
4. deployed on vercel free tier
5. tested on a locally hosted model (qwen 3.6 27b)
6. deployed using gemma-4-31b through cerebras, which may rate-limit frequently.

## core ai functionalities

- profile summarizer: takes username, profile name, bio, location, join date, top 50 repos and extracted html from website/portfolio.- repo agent: takes a message with file structure, recent 20 commits, branch list and repo name. this agent has a tool that it can use, which allows it to read a specific file using its name and branch.

## running locally

clone the repository and install dependencies:

```bash
npm install
```

create a `.env.local` file in the project root with your cerebras configuration:

```env
CEREBRAS_API_KEY=your_cerebras_api_key_here
CEREBRAS_MODEL=gemma-4-31b
```

start the development server:

```bash
npm run dev
```
