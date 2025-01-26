"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { searchUsers, githubUsernameSchema } from "@/lib/github";
import { useGitHubStore } from "@/store/github";

export function UserSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { toast } = useToast();
  const debounceTimer = useRef<NodeJS.Timeout>();
  const {
    selectedUsers,
    addUser,
    removeUser,
    clearUsers,
    setShouldFetchRepos,
  } = useGitHubStore();

  const { data: users, isLoading } = useQuery({
    queryKey: ["githubUsers", searchValue],
    queryFn: () => searchUsers(searchValue),
    enabled: searchValue.length > 0,
    staleTime: 1000 * 60,
    retry: false,
  });

  const handleSearch = useCallback((search: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setSearchValue(search);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && selectedUsers.length > 0) {
        router.push("/");
      }
    },
    [router, selectedUsers.length]
  );

  const handleSelect = useCallback(
    (username: string) => {
      try {
        githubUsernameSchema.parse(username);
        addUser(username);
        setSearchValue("");
        setOpen(false);
      } catch (error) {
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
          <Badge key={user} variant="secondary" className="h-8 text-base gap-2">
            {user}
            <button
              className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
              className="w-full justify-between"
            >
              <Search className="mr-2 h-4 w-4" />
              Search GitHub users...
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput
                placeholder="Search GitHub users..."
                value={searchValue}
                onValueChange={handleSearch}
                onKeyDown={handleKeyDown}
                className="h-9"
              />
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {users?.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.login}
                      onSelect={handleSelect}
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
                  ))}
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
                router.push("/");
              }}
              className="shrink-0"
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
              className="shrink-0"
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
