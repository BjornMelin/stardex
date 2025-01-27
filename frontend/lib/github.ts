import { z } from "zod";

export const githubUsernameSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
    "Invalid GitHub username format"
  );

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  watchers_count: number;
  language: string | null;
  topics: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
  updated_at: string;
  readme_content?: string | null;
}

export interface GitHubList {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  repository_count: number;
  repositories: GitHubRepo[];
}

const GITHUB_API_BASE = "https://api.github.com";

// Default to environment variable, fallback to empty string
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';

export class RateLimitError extends Error {
  constructor(message: string, public resetTime: Date) {
    super(message);
    this.name = "RateLimitError";
  }
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const headers = new Headers({
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers as Record<string, string>,
      });

      // Add authorization header if token is available
      if (GITHUB_TOKEN) {
        headers.set('Authorization', `token ${GITHUB_TOKEN}`);
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        const resetTime = new Date(
          Number(response.headers.get("x-ratelimit-reset")) * 1000
        );
        
        if (rateLimitRemaining === '0') {
          throw new RateLimitError(
            `Rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`,
            resetTime
          );
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (error instanceof RateLimitError) throw error;

      if (i === retries - 1) throw error;

      await delay(Math.pow(2, i) * 1000);
    }
  }

  throw new Error("Failed after retries");
}

async function fetchReadmeContent(repo: GitHubRepo): Promise<string | null> {
  try {
    const response = await fetchWithRetry(
      `${GITHUB_API_BASE}/repos/${repo.full_name}/readme`
    );
    const data = await response.json();
    
    // GitHub returns README content as base64 encoded
    const content = data.content;
    if (!content) return null;
    
    // Decode base64 content
    const decoded = atob(content.replace(/\n/g, ''));
    return decoded;
  } catch (error) {
    console.warn(`Failed to fetch README for ${repo.full_name}:`, error);
    return null;
  }
}

export async function searchUsers(query: string): Promise<GitHubUser[]> {
  if (!query.trim()) return [];

  try {
    const response = await fetchWithRetry(
      `${GITHUB_API_BASE}/search/users?q=${encodeURIComponent(
        query
      )}+in:login&per_page=5`
    );

    const data = await response.json();
    return data.items;
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    console.error("Error searching GitHub users:", error);
    throw new Error("Failed to search GitHub users");
  }
}

export async function getStarredRepos(username: string): Promise<GitHubRepo[]> {
  try {
    const allRepos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 100; // Maximum allowed by GitHub API

    while (true) {
      const response = await fetchWithRetry(
        `${GITHUB_API_BASE}/users/${encodeURIComponent(
          username
        )}/starred?per_page=${perPage}&page=${page}`
      );

      const repos = await response.json();
      if (!repos.length) break;

      // Fetch README content for each repository
      const reposWithReadme = await Promise.all(
        repos.map(async (repo: GitHubRepo) => {
          const readme = await fetchReadmeContent(repo);
          return { ...repo, readme_content: readme };
        })
      );

      allRepos.push(...reposWithReadme);
      page++;

      if (repos.length < perPage) break;
    }

    return allRepos;
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    console.error("Error fetching starred repos:", error);
    throw new Error("Failed to fetch starred repositories");
  }
}

export async function getUserLists(username: string): Promise<GitHubList[]> {
  try {
    const starredRepos = await getStarredRepos(username);

    // Group repositories by common characteristics to create virtual lists
    const lists: GitHubList[] = [];

    // Create language-based lists
    const languageGroups = new Map<string, GitHubRepo[]>();
    starredRepos.forEach((repo) => {
      if (repo.language) {
        const repos = languageGroups.get(repo.language) || [];
        repos.push(repo);
        languageGroups.set(repo.language, repos);
      }
    });

    languageGroups.forEach((repos, language) => {
      if (repos.length >= 3) {
        // Only create lists for languages with 3+ repos
        lists.push({
          id: lists.length + 1,
          name: `${language} Projects`,
          description: `A collection of ${language} repositories`,
          html_url: `https://github.com/stars/${username}/${language.toLowerCase()}`,
          repository_count: repos.length,
          repositories: repos,
        });
      }
    });

    // Create topic-based lists
    const topicGroups = new Map<string, GitHubRepo[]>();
    starredRepos.forEach((repo) => {
      repo.topics.forEach((topic) => {
        const repos = topicGroups.get(topic) || [];
        repos.push(repo);
        topicGroups.set(topic, repos);
      });
    });

    topicGroups.forEach((repos, topic) => {
      if (repos.length >= 3) {
        // Only create lists for topics with 3+ repos
        lists.push({
          id: lists.length + 1,
          name: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Collection`,
          description: `Repositories related to ${topic}`,
          html_url: `https://github.com/stars/${username}/${topic}`,
          repository_count: repos.length,
          repositories: repos,
        });
      }
    });

    return lists.sort((a, b) => b.repository_count - a.repository_count);
  } catch (error) {
    console.error("Error creating user lists:", error);
    return []; // Return empty array if lists cannot be created
  }
}
