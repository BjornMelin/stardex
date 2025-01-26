import { GitHubRepo } from './github';

export interface ClusteredRepo {
  repo: GitHubRepo;
  cluster_id: number;
  coordinates: [number, number];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function clusterRepositories(repos: GitHubRepo[]): Promise<ClusteredRepo[]> {
  try {
    const response = await fetch(`${API_BASE}/api/cluster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repositories: repos }),
    });

    if (!response.ok) {
      throw new Error(`Clustering API error: ${response.statusText}`);
    }

    const clusteredRepos = await response.json();
    return clusteredRepos;
  } catch (error) {
    console.error('Error clustering repositories:', error);
    throw new Error('Failed to cluster repositories');
  }
}

// Health check function for the backend service
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}