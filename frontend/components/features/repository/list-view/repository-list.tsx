"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { RepositoryFilters } from "@/components/features/repository/list-view/repository-filters";
import {
  RepositoryEmptyState,
  RepositoryLoading,
} from "@/components/features/repository/list-view/repository-loading";
import { RepositoryPagination } from "@/components/features/repository/list-view/repository-pagination";
import { RepositoryViewToggle } from "@/components/features/repository/list-view/repository-view-toggle";
import { RepositoryCard } from "@/components/features/repository/shared/repository-card";
import { RepositoryClusters } from "@/components/features/repository/shared/repository-clusters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { GitHubRepo, getStarredRepos, RateLimitError } from "@/lib/github";
import { useGitHubStore } from "@/store/github";

export function RepositoryList() {
  const {
    selectedUsers,
    setRepos,
    shouldFetchRepos,
    pagination: { currentPage, itemsPerPage },
    setCurrentPage,
    resetPagination,
  } = useGitHubStore();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ["starredRepos", selectedUsers],
    queryFn: async () => {
      const results = await Promise.all(
        selectedUsers.map(async (username) => {
          const repos = await getStarredRepos(username);
          return { username, repos };
        })
      );
      return results;
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
    resetPagination();
  }, [selectedUsers, resetPagination]);

  useEffect(() => {
    if (error) {
      if (error instanceof RateLimitError) {
        const waitMinutes = Math.ceil((error.resetTime.getTime() - Date.now()) / 60000);
        toast({
          title: "Rate Limit Exceeded",
          description: `GitHub API rate limit exceeded. Please try again in ${waitMinutes} minutes.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch repositories",
          variant: "destructive",
        });
      }
    }
  }, [error, toast]);

  const currentPageRepos = useGitHubStore((state) => state.getCurrentPageRepos());
  const allRepos = useGitHubStore((state) => state.getFilteredAndSortedRepos());

  if (selectedUsers.length === 0) {
    return <RepositoryEmptyState />;
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
              <RepositoryViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>

            {isLoading ? (
              <RepositoryLoading />
            ) : (
              <ScrollArea className="h-[600px] rounded-md border">
                <div className="p-4 space-y-4">
                  {currentPageRepos.map((repo: GitHubRepo) => (
                    <RepositoryCard key={repo.id} repo={repo} viewMode={viewMode} />
                  ))}
                </div>
                <RepositoryPagination
                  currentPage={currentPage}
                  totalItems={allRepos.length}
                  itemsPerPage={itemsPerPage}
                  isLoading={isLoading}
                  onPageChange={setCurrentPage}
                />
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        <TabsContent value="similar" className="mt-6">
          <RepositoryClusters repositories={allRepos} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
