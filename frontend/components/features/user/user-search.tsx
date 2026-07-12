"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { githubUsernameSchema, searchUsers } from "@/lib/github";
import { useGitHubStore } from "@/store/github";

export function UserSearch() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const { toast } = useToast();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { selectedUsers, addUser, removeUser, clearUsers, setShouldFetchRepos } = useGitHubStore();

  const { data: users, isLoading } = useQuery({
    queryKey: ["githubUsers", searchValue],
    queryFn: () => searchUsers(searchValue),
    enabled: searchValue.length > 0,
    staleTime: 1000 * 60,
    retry: false,
  });

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleSearch = useCallback((search: string) => {
    setInputValue(search);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (search.length === 0) {
      setSearchValue("");
      return;
    }

    debounceTimer.current = setTimeout(() => {
      setSearchValue(search);
    }, 250);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && selectedUsers.length > 0) {
        setShouldFetchRepos(true);
      }
    },
    [selectedUsers.length, setShouldFetchRepos]
  );

  const handleSelect = useCallback(
    (username: string) => {
      try {
        githubUsernameSchema.parse(username);
        addUser(username);
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        setInputValue("");
        setSearchValue("");
        setOpen(false);
      } catch {
        toast({
          title: "Invalid username",
          description: "Please enter a valid GitHub username",
          variant: "destructive",
        });
      }
    },
    [addUser, toast]
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
        {selectedUsers.map((user) => (
          <Badge
            key={user}
            variant="secondary"
            className="min-h-11 gap-2 text-base sm:h-8 sm:min-h-0"
          >
            {user}
            <button
              className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full ring-offset-background outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:h-7 sm:w-7"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  removeUser(user);
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => removeUser(user)}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              <span className="sr-only">Remove {user}</span>
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="min-h-11 w-full justify-between sm:min-h-0"
            >
              <Search className="mr-2 h-4 w-4" />
              Search GitHub users...
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput
                placeholder="Search GitHub users..."
                value={inputValue}
                onValueChange={handleSearch}
                onKeyDown={handleKeyDown}
                className="h-11 sm:h-9"
              />
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {isLoading ? (
                    <CommandItem value="__loading" disabled>
                      Searching...
                    </CommandItem>
                  ) : (
                    users?.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.login}
                        onSelect={handleSelect}
                        className="min-h-11 sm:min-h-0"
                      >
                        <Image
                          src={user.avatar_url}
                          alt={user.login}
                          width={24}
                          height={24}
                          className="mr-2 h-6 w-6 rounded-full"
                        />
                        {user.login}
                      </CommandItem>
                    ))
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedUsers.length > 0 && (
          <>
            <Button
              variant="default"
              onClick={() => {
                setShouldFetchRepos(true);
              }}
              className="min-h-11 shrink-0 sm:min-h-0"
            >
              Search
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShouldFetchRepos(false);
                clearUsers();
              }}
              className="h-11 w-11 shrink-0 sm:h-10 sm:w-10"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear all</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
