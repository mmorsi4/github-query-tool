import { GitHubUser, GitHubRepo, GitHubEvent, ComparisonMetrics, GitHubCommit, GitHubTreeEntry } from '@/types/github';

function getHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('User not found');
    }
    if (res.status === 403 || res.status === 429) {
      throw new Error('API Rate Limit Exceeded. Please provide a Personal Access Token in settings.');
    }
    const errorText = await res.text();
    throw new Error(`GitHub API Error (${res.status}): ${errorText || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchUser(username: string, token?: string | null): Promise<GitHubUser> {
  const res = await fetch(`https://api.github.com/users/${username}`, {
    headers: getHeaders(token),
  });
  return handleResponse<GitHubUser>(res);
}

export async function fetchRepos(
  username: string,
  page: number = 1,
  token?: string | null
): Promise<{ repos: GitHubRepo[]; hasMore: boolean }> {
  const perPage = 30;
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=${perPage}&sort=stars&direction=desc&page=${page}`,
    {
      headers: getHeaders(token),
    }
  );
  const repos = await handleResponse<GitHubRepo[]>(res);
  return {
    repos,
    hasMore: repos.length === perPage,
  };
}

export async function fetchEvents(username: string, token?: string | null): Promise<GitHubEvent[]> {
  const res = await fetch(`https://api.github.com/users/${username}/events?per_page=100`, {
    headers: getHeaders(token),
  });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export function buildComparisonMetrics(
  user: GitHubUser,
  repos: GitHubRepo[],
  events: GitHubEvent[]
): ComparisonMetrics {
  const totalStars = repos.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0);
  const totalForks = repos.reduce((acc, repo) => acc + (repo.forks_count || 0), 0);

  const recentCommits = events
    .filter((e) => e.type === 'PushEvent' && e.payload?.commits)
    .reduce((acc, e) => acc + (e.payload.commits?.length || 0), 0);

  const languageCounts: Record<string, number> = {};
  repos.forEach((repo) => {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  });

  const topLanguages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);

  const createdYear = new Date(user.created_at).getFullYear();
  const currentYear = new Date().getFullYear();
  const ageYears = Math.max(0, currentYear - createdYear);
  const accountAge = ageYears === 0 ? '< 1 year' : `${ageYears} year${ageYears === 1 ? '' : 's'}`;

  return {
    username: user.login,
    avatarUrl: user.avatar_url,
    publicRepos: user.public_repos,
    publicGists: user.public_gists,
    followers: user.followers,
    following: user.following,
    totalStars,
    totalForks,
    recentCommits,
    topLanguages: topLanguages.length ? topLanguages : ['None'],
    accountAge,
  };
}

export async function fetchReadme(owner: string, repo: string, token?: string | null): Promise<string> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: getHeaders(token),
    });
    if (!res.ok) return 'No README found.';
    const data = await res.json();
    if (data.content && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return 'No README found.';
  } catch {
    return 'Failed to fetch README.';
  }
}

export async function fetchFileTree(owner: string, repo: string, branch: string, token?: string | null): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: getHeaders(token) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tree || [])
      .filter((entry: GitHubTreeEntry) => entry.type === 'blob')
      .map((entry: GitHubTreeEntry) => entry.path);
  } catch {
    return [];
  }
}

export async function fetchCommits(owner: string, repo: string, count: number = 20, token?: string | null): Promise<GitHubCommit[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${count}`,
      { headers: getHeaders(token) }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchBranches(owner: string, repo: string, token?: string | null): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches?per_page=30`,
      { headers: getHeaders(token) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((b: { name: string }) => b.name);
  } catch {
    return [];
  }
}

export async function fetchFileContent(owner: string, repo: string, path: string, branch: string, token?: string | null): Promise<string> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: getHeaders(token) }
    );
    if (!res.ok) return `Error: Could not read file ${path} on branch ${branch} (status ${res.status}).`;
    const data = await res.json();
    if (data.content && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return `File ${path} has no readable content.`;
  } catch {
    return `Error: Failed to fetch file ${path}.`;
  }
}
