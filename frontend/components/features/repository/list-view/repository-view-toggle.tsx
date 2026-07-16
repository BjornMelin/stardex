"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

/**
 * Switches between grid and list repository layouts.
 *
 * @param props - The current layout and its change callback.
 * @returns The repository layout toggle group.
 */
export function RepositoryViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border rounded-md">
      <Button
        variant={viewMode === "grid" ? "secondary" : "ghost"}
        size="icon"
        aria-pressed={viewMode === "grid"}
        onClick={() => onViewModeChange("grid")}
        className="h-11 w-11 rounded-r-none sm:h-10 sm:w-10"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="sr-only">Grid view</span>
      </Button>
      <Button
        variant={viewMode === "list" ? "secondary" : "ghost"}
        size="icon"
        aria-pressed={viewMode === "list"}
        onClick={() => onViewModeChange("list")}
        className="h-11 w-11 rounded-l-none sm:h-10 sm:w-10"
      >
        <List className="h-4 w-4" />
        <span className="sr-only">List view</span>
      </Button>
    </div>
  );
}
