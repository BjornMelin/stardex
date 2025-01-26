"use client";

export function RepositoryLoading() {
  return (
    <div className="h-[600px] rounded-md border flex items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"
        role="status"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

export function RepositoryEmptyState() {
  return (
    <div className="text-center text-muted-foreground">
      Search and select GitHub users to see their starred repositories
    </div>
  );
}
