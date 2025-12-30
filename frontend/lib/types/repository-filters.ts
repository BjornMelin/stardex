export type SortOption = "stars" | "updated" | "name";

export type FilterCriteria = {
  search: string;
  language: string | null;
  minStars: number;
  topics: string[];
  sortBy: SortOption;
};
