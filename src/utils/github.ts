import { supabase } from './supabaseClient';

export class GitHubError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'GitHubError';
  }
}

/**
 * Attempts to extract the GitHub provider_token from the current Supabase session.
 * By default, Supabase only returns this if we ask it to during sign-in,
 * or it might be stored temporarily. If this fails, the user must re-authenticate.
 */
export const getProviderToken = async (): Promise<string> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.provider_token;
  if (!token) {
    throw new GitHubError('No GitHub access token found in session. Please log out and log back in using GitHub.', 401);
  }
  return token;
};

const gitFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getProviderToken();
  const config: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };

  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
  const res = await fetch(url, config);
  
  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
        const errData = await res.json();
        errorMsg = errData.message || errorMsg;
    } catch (e) {}
    throw new GitHubError(`GitHub API Error: ${errorMsg}`, res.status);
  }

  if (res.status === 204) return null;
  return res.json();
};

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string;
  default_branch: string;
}

export interface GitHubContent {
  type: 'file' | 'dir';
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  content?: string; // base64 encoded for files
}

export const listUserRepos = async (): Promise<GitHubRepo[]> => {
  return gitFetch('/user/repos?sort=updated&per_page=100');
};

export const getRepoContents = async (fullName: string, path: string = ''): Promise<GitHubContent | GitHubContent[]> => {
  return gitFetch(`/repos/${fullName}/contents/${path}`);
};

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export const fetchRepoTreeRecursive = async (fullName: string, branch: string = 'main'): Promise<GitHubTreeItem[]> => {
  const res: GitHubTreeResponse = await gitFetch(`/repos/${fullName}/git/trees/${branch}?recursive=1`);
  return res.tree;
};

export const fetchBlobContent = async (url: string): Promise<string> => {
  const res = await gitFetch(url);
  if (!res || !res.content) return '';
  // Github blobs are base64 encoded, sometimes with newlines
  const base64Clean = res.content.replace(/\n/g, '');
  try {
      return decodeURIComponent(escape(atob(base64Clean)));
  } catch (e) {
      return atob(base64Clean);
  }
};

export const createRepository = async (name: string, description: string = '', isPrivate: boolean = true): Promise<GitHubRepo> => {
  return gitFetch('/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: true
    })
  });
};

/**
 * Creates or updates a file in a GitHub repository
 */
export const pushFileToRepo = async (
    fullName: string, 
    path: string, 
    content: string, 
    message: string, 
    branch: string = 'main',
    sha?: string
) => {
  // Convert standard string to base64
  const base64Content = btoa(unescape(encodeURIComponent(content)));
  
  const body: any = {
      message,
      content: base64Content,
      branch
  };
  if (sha) {
      body.sha = sha;
  }

  return gitFetch(`/repos/${fullName}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify(body)
  });
};
