"use client";

import { useState, useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useGitHubStore } from "@/store/github";

export type SortOption = "stars" | "updated" | "name";
export type FilterCriteria = {
  search: string;
  language: string | null; // Updated to allow null
  minStars: number;
  topics: string[];
  sortBy: SortOption;
};

export function RepositoryFilters() {
  const [isOpen, setIsOpen] = useState(false);
  const { repos, filters, setFilters } = useGitHubStore();

  // Get unique languages and topics from all repos
  const allRepos = Object.values(repos).flat();
  const languages = Array.from(
    new Set(allRepos.map((repo) => repo.language).filter(Boolean))
  );
  const allTopics = Array.from(
    new Set(allRepos.flatMap((repo) => repo.topics))
  );
  const maxStars = Math.max(
    ...allRepos.map((repo) => repo.stargazers_count),
    0
  );

  const handleSearch = useCallback(
    (search: string) => {
      setFilters({ ...filters, search });
    },
    [filters, setFilters]
  );

  const handleFilterChange = useCallback(
    (key: keyof FilterCriteria, value: any) => {
      setFilters({ ...filters, [key]: value });
    },
    [filters, setFilters]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            className="pl-8"
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select
          value={filters.sortBy}
          onValueChange={(value: SortOption) =>
            handleFilterChange("sortBy", value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stars">Most Stars</SelectItem>
            <SelectItem value="updated">Recently Updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Repositories</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={filters.language ?? "_all"}
                  onValueChange={(value) =>
                    handleFilterChange(
                      "language",
                      value === "_all" ? null : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Languages</SelectItem>
                    {languages.sort().map((lang) => (
                      <SelectItem key={lang} value={lang as string}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Minimum Stars</Label>
                <div className="pt-2">
                  <Slider
                    value={[filters.minStars]}
                    onValueChange={([value]) =>
                      handleFilterChange("minStars", value)
                    }
                    max={maxStars}
                    step={1}
                  />
                  <div className="mt-1 text-sm text-muted-foreground">
                    {filters.minStars.toLocaleString()} stars
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Topics</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {allTopics.map((topic) => (
                    <Badge
                      key={topic}
                      variant={
                        filters.topics.includes(topic) ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        const newTopics = filters.topics.includes(topic)
                          ? filters.topics.filter((t) => t !== topic)
                          : [...filters.topics, topic];
                        handleFilterChange("topics", newTopics);
                      }}
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
