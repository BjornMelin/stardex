"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export function RepositoryViewToggle({
  viewMode,
  onViewModeChange,
}: ViewToggleProps) {
  return (
    <div className="flex items-center border rounded-md">
      <Button
        variant={viewMode === "grid" ? "secondary" : "ghost"}
        size="icon"
        onClick={() => onViewModeChange("grid")}
        className="rounded-r-none"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="sr-only">Grid view</span>
      </Button>
      <Button
        variant={viewMode === "list" ? "secondary" : "ghost"}
        size="icon"
        onClick={() => onViewModeChange("list")}
        className="rounded-l-none"
      >
        <List className="h-4 w-4" />
        <span className="sr-only">List view</span>
      </Button>
    </div>
  );
}
