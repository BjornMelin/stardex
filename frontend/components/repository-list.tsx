import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, GitFork, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { GitHubRepo, getStarredRepos } from '../lib/github';
import { useGitHubStore } from '../store/github';
import { useToast } from '../hooks/use-toast';
import { RepositoryClusters } from './repository-clusters';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface RepositoryListProps {
  username: string;
}

export function RepositoryList({ username }: RepositoryListProps) {
  const { toast } = useToast();
  const setRepositories = useGitHubStore((state) => state.setRepositories);

  const { data: repos, error, failureCount } = useQuery<GitHubRepo[]>({
    queryKey: ['starred-repos', username],
    queryFn: () => getStarredRepos(username),
    retry: (failureCount, error) => {
      if (error instanceof Error && error.name === 'RateLimitError') {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  useEffect(() => {
    if (repos) {
      setRepositories(repos);
    }
  }, [repos, setRepositories]);

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <p className="text-red-500">Failed to load repositories</p>
          <p className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </Card>
    );
  }

  if (!repos) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </Card>
    );
  }

  const sortedByStars = [...repos].sort((a, b) => {
    if (a.stargazers_count !== b.stargazers_count) {
      return b.stargazers_count - a.stargazers_count;
    }
    if (a.forks_count !== b.forks_count) {
      return b.forks_count - a.forks_count;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <Tabs defaultValue="list" className="space-y-4">
      <TabsList>
        <TabsTrigger value="list">List View</TabsTrigger>
        <TabsTrigger value="clusters">Cluster View</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Starred Repositories</h2>
          <p className="text-sm text-gray-500">
            {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
          </p>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {sortedByStars.map((repo) => (
              <Card key={repo.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={repo.owner.avatar_url} />
                        <AvatarFallback>
                          {repo.owner.login.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-semibold"
                        asChild
                      >
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {repo.name}
                        </a>
                      </Button>
                    </div>

                    {repo.description && (
                      <p className="text-sm text-gray-500">{repo.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {repo.language && (
                        <Badge variant="secondary">{repo.language}</Badge>
                      )}
                      {repo.topics.map((topic) => (
                        <Badge key={topic} variant="outline">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4" />
                      <span>{repo.stargazers_count.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <GitFork className="h-4 w-4" />
                      <span>{repo.forks_count.toLocaleString()}</span>
                    </div>
                    <div
                      className="flex items-center space-x-1"
                      title={new Date(repo.updated_at).toLocaleString()}
                    >
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatDistanceToNow(new Date(repo.updated_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="clusters">
        <RepositoryClusters repositories={repos} />
      </TabsContent>
    </Tabs>
  );
}