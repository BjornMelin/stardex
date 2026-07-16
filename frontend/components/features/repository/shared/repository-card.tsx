"use client";

import { format } from "date-fns";
import { Calendar, CircleDot, Code, ExternalLink, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type GitHubRepo, getContributionIssuesUrl } from "@/lib/github";
import { cn } from "@/lib/utils";

interface RepositoryCardProps {
  repo: GitHubRepo;
  viewMode: "grid" | "list";
}

/**
 * Displays repository metadata and contribution links for one repository.
 *
 * @param props - The repository and selected presentation mode.
 * @returns A repository summary card.
 */
export function RepositoryCard({ repo, viewMode }: RepositoryCardProps) {
  return (
    <Card className={cn("p-4 hover:bg-muted/50 transition-colors", viewMode === "list" && "p-3")}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
        <Avatar className={cn("h-12 w-12 rounded-lg", viewMode === "list" && "h-10 w-10")}>
          <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
          <AvatarFallback>{repo.owner.login[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h3 className={cn("font-semibold leading-none", viewMode === "list" && "text-sm")}>
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 max-w-full items-center gap-2 hover:underline sm:min-h-6"
                >
                  <span className="truncate">{repo.full_name}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </h3>
              {repo.description && viewMode === "grid" && (
                <p className="text-sm text-muted-foreground line-clamp-2">{repo.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-500" />
              {repo.stargazers_count.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="col-span-2 flex min-w-0 flex-wrap gap-2 sm:col-span-1 sm:col-start-2">
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
          {repo.open_issues_count > 0 && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-auto min-h-11 max-w-full gap-1 whitespace-normal px-2 py-2 text-left text-xs leading-tight sm:h-7 sm:min-h-0 sm:whitespace-nowrap sm:py-0"
            >
              <a
                href={getContributionIssuesUrl(repo.full_name)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Find contribution issues for ${repo.full_name}`}
              >
                <CircleDot aria-hidden="true" />
                Find contribution issues
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          )}
          {viewMode === "grid" &&
            repo.topics.map((topic: string) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
        </div>
      </div>
    </Card>
  );
}
