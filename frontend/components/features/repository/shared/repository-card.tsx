"use client";

import { Star, Calendar, Code, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { GitHubRepo } from "@/lib/github";
import { cn } from "@/lib/utils";

interface RepositoryCardProps {
  repo: GitHubRepo;
  viewMode: "grid" | "list";
}

export function RepositoryCard({ repo, viewMode }: RepositoryCardProps) {
  return (
    <Card
      className={cn(
        "p-4 hover:bg-muted/50 transition-colors",
        viewMode === "list" && "p-3"
      )}
    >
      <div
        className={cn(
          "space-y-4",
          viewMode === "list" && "flex items-center gap-4"
        )}
      >
        <div
          className={cn(
            "flex items-start gap-4",
            viewMode === "list" && "flex-1 min-w-0"
          )}
        >
          <Avatar
            className={cn(
              "h-12 w-12 rounded-lg",
              viewMode === "list" && "h-10 w-10"
            )}
          >
            <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
            <AvatarFallback>{repo.owner.login[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3
                  className={cn(
                    "font-semibold leading-none",
                    viewMode === "list" && "text-sm"
                  )}
                >
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
                {repo.description && viewMode === "grid" && (
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
            <div
              className={cn(
                "mt-4 flex flex-wrap gap-2",
                viewMode === "list" && "mt-1"
              )}
            >
              {repo.language && (
                <Badge variant="secondary" className="gap-1">
                  <Code className="h-3 w-3" />
                  {repo.language}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                Updated {format(new Date(repo.updated_at), "MMM d, yyyy")}
              </Badge>
              {viewMode === "grid" &&
                repo.topics.map((topic: string) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
