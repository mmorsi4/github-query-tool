export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  html_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  updated_at: string;
  open_issues_count: number;
  fork: boolean;
  default_branch: string;
}

export interface GitHubEvent {
  type: string;
  created_at: string;
  payload: {
    commits?: Array<{ message: string }>;
  };
}

export interface ComparisonMetrics {
  username: string;
  avatarUrl: string;
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  totalStars: number;
  totalForks: number;
  recentCommits: number;
  topLanguages: string[];
  accountAge: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

export interface GitHubTreeEntry {
  path: string;
  type: string;
  size?: number;
}

export interface NoteRow {
  id: string;
  target_type: 'user' | 'repo';
  target_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationRow {
  id: string;
  repo_full_name: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at: string;
}
