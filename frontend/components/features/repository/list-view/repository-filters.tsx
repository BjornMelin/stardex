"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useCallback, useState } from "react";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import type { FilterCriteria, SortOption } from "@/lib/types/repository-filters";
import { cn } from "@/lib/utils";
import { useGitHubStore } from "@/store/github";

/** Renders search, sort, and sheet-based filters for the selected repositories. */
export function RepositoryFilters() {
  const [isOpen, setIsOpen] = useState(false);
  const { filters, setFilters, getSelectedRepos } = useGitHubStore();

  // Keep filter metadata aligned with the currently selected repository sources.
  const allRepos = getSelectedRepos();
  const languages = Array.from(
    new Set(
      allRepos
        .map((repo) => repo.language)
        .filter(
          (language): language is string => typeof language === "string" && language.length > 0
        )
    )
  );
  const allTopics = Array.from(new Set(allRepos.flatMap((repo) => repo.topics)));
  const maxStars = Math.max(...allRepos.map((repo) => repo.stargazers_count), 0);

  const handleSearch = useCallback(
    (search: string) => {
      setFilters({ ...filters, search });
    },
    [filters, setFilters]
  );

  const handleFilterChange = useCallback(
    <K extends keyof FilterCriteria>(key: K, value: FilterCriteria[K]) => {
      setFilters({ ...filters, [key]: value });
    },
    [filters, setFilters]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
        <div className="relative col-span-2 min-w-0 flex-1 sm:col-span-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
          />
          <Input
            aria-label="Search repositories"
            placeholder="Search repositories..."
            className="min-h-11 pl-8 text-base sm:min-h-0 sm:text-sm"
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select
          value={filters.sortBy}
          onValueChange={(value: SortOption) => handleFilterChange("sortBy", value)}
        >
          <SelectTrigger
            aria-label="Sort repositories"
            className="min-h-11 w-full min-w-0 text-base sm:min-h-0 sm:w-[180px] sm:text-sm"
          >
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stars" className="min-h-11 sm:min-h-0">
              Most Stars
            </SelectItem>
            <SelectItem value="updated" className="min-h-11 sm:min-h-0">
              Recently Updated
            </SelectItem>
            <SelectItem value="name" className="min-h-11 sm:min-h-0">
              Name
            </SelectItem>
          </SelectContent>
        </Select>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              aria-label="Filter repositories"
              variant="outline"
              size="icon"
              className="h-11 w-11 sm:h-10 sm:w-10"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Repositories</SheetTitle>
              <SheetDescription>
                Limit the selected repositories by language, stars, or topics.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={filters.language ?? "_all"}
                  onValueChange={(value) =>
                    handleFilterChange("language", value === "_all" ? null : value)
                  }
                >
                  <SelectTrigger aria-label="Language" className="h-11 sm:h-10">
                    <SelectValue placeholder="All Languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all" className="min-h-11 sm:min-h-0">
                      All Languages
                    </SelectItem>
                    {languages.sort().map((lang) => (
                      <SelectItem key={lang} value={lang} className="min-h-11 sm:min-h-0">
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
                    aria-label="Minimum Stars"
                    value={[filters.minStars]}
                    onValueChange={([value]) => handleFilterChange("minStars", value)}
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
                    <button
                      key={topic}
                      type="button"
                      aria-pressed={filters.topics.includes(topic)}
                      className={cn(
                        badgeVariants({
                          variant: filters.topics.includes(topic) ? "default" : "outline",
                        }),
                        "min-h-11 sm:min-h-7"
                      )}
                      onClick={() => {
                        const newTopics = filters.topics.includes(topic)
                          ? filters.topics.filter((t) => t !== topic)
                          : [...filters.topics, topic];
                        handleFilterChange("topics", newTopics);
                      }}
                    >
                      {topic}
                    </button>
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
