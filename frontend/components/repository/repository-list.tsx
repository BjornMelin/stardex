"use client";

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Calendar, Code, BookOpen, ExternalLink, LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitHubRepo, getStarredRepos, RateLimitError } from '@/lib/github';
import { useGitHubStore } from '@/store/github';
import { useToast } from '@/hooks/use-toast';
import { RepositoryFilters } from './repository-filters';
import { RepositoryClusters } from './repository-clusters';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

export function RepositoryList() {
  const { selectedUsers, repos, setRepos, filters, shouldFetchRepos } = useGitHubStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['starredRepos', selectedUsers],
    queryFn: async () => {
      const allRepos = await Promise.all(
        selectedUsers.map(async (username) => {
          const userRepos = await getStarredRepos(username);
          return { username, repos: userRepos };
        })
      );
      return allRepos;
    },
    enabled: selectedUsers.length > 0 && shouldFetchRepos,
    retry: (failureCount, error) => {
      if (error instanceof RateLimitError) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });

  useEffect(() => {
    if (data) {
      data.forEach(({ username, repos }) => {
        setRepos(username, repos);
      });
    }
  }, [data, setRepos]);

  useEffect(() => {
    if (error) {
      if (error instanceof RateLimitError) {
        const waitMinutes = Math.ceil((error.resetTime.getTime() - Date.now()) / 60000);
        toast({
          title: 'Rate Limit Exceeded',
          description: `GitHub API rate limit exceeded. Please try again in ${waitMinutes} minutes.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to fetch repositories',
          variant: 'destructive',
        });
      }
    }
  }, [error, toast]);

  const filteredAndSortedRepos = useMemo(() => {
    let result = Object.values(repos).flat();

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        repo =>
          repo.name.toLowerCase().includes(searchLower) ||
          repo.description?.toLowerCase().includes(searchLower) ||
          repo.topics.some(topic => topic.toLowerCase().includes(searchLower))
      );
    }

    if (filters.language && filters.language !== '_all') {
      result = result.filter(repo => repo.language === filters.language);
    }

    if (filters.minStars > 0) {
      result = result.filter(repo => repo.stargazers_count >= filters.minStars);
    }

    if (filters.topics.length > 0) {
      result = result.filter(repo =>
        filters.topics.every(topic => repo.topics.includes(topic))
      );
    }

    switch (filters.sortBy) {
      case 'stars':
        result.sort((a, b) => b.stargazers_count - a.stargazers_count);
        break;
      case 'updated':
        result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [repos, filters]);

  if (selectedUsers.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        Search and select GitHub users to see their starred repositories
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            All Stars
          </TabsTrigger>
          <TabsTrigger value="similar" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Similar Repos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <RepositoryFilters />
              </div>
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="sr-only">Grid view</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                  <span className="sr-only">List view</span>
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="h-[600px] rounded-md border flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[600px] rounded-md border">
                <div className="p-4 space-y-4">
                  {filteredAndSortedRepos.map((repo) => (
                    <Card 
                      key={repo.id} 
                      className={cn(
                        "p-4 hover:bg-muted/50 transition-colors",
                        viewMode === 'list' && "p-3"
                      )}
                    >
                      <div className={cn(
                        "space-y-4",
                        viewMode === 'list' && "flex items-center gap-4"
                      )}>
                        <div className={cn(
                          "flex items-start gap-4",
                          viewMode === 'list' && "flex-1 min-w-0"
                        )}>
                          <Avatar className={cn(
                            "h-12 w-12 rounded-lg",
                            viewMode === 'list' && "h-10 w-10"
                          )}>
                            <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
                            <AvatarFallback>{repo.owner.login[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <h3 className={cn(
                                  "font-semibold leading-none",
                                  viewMode === 'list' && "text-sm"
                                )}>
                                  <a
                                    href={repo.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline inline-flex items-center gap-2"
                                  >
                                    {repo.full_name}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </h3>
                                {repo.description && viewMode === 'grid' && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {repo.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                                <Star className="h-4 w-4 text-yellow-500" />
                                {repo.stargazers_count.toLocaleString()}
                              </div>
                            </div>
                            <div className={cn(
                              "mt-4 flex flex-wrap gap-2",
                              viewMode === 'list' && "mt-1"
                            )}>
                              {repo.language && (
                                <Badge variant="secondary" className="gap-1">
                                  <Code className="h-3 w-3" />
                                  {repo.language}
                                </Badge>
                              )}
                              <Badge variant="outline" className="gap-1">
                                <Calendar className="h-3 w-3" />
                                Updated {format(new Date(repo.updated_at), 'MMM d, yyyy')}
                              </Badge>
                              {viewMode === 'grid' && repo.topics.map((topic) => (
                                <Badge key={topic} variant="secondary" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        <TabsContent value="similar" className="mt-6">
          <RepositoryClusters repositories={filteredAndSortedRepos} />
        </TabsContent>
      </Tabs>
    </div>
  );
}