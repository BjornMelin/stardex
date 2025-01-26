"use client";

import Link from "next/link";
import { Search, Menu, Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { UserSearch } from "@/components/user/user-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Navbar() {
  const { setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center gap-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold">Stardex</span>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <p className="text-base font-medium">
              Explore GitHub Stars Intelligently
            </p>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Desktop Search */}
            <div className="hidden md:flex w-64">
              <UserSearch variant="navbar" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Laptop className="mr-2 h-4 w-4" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>
                    <Menu className="h-4 w-4" />
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-4 w-[200px]">
                      <Link
                        href="/"
                        className="flex items-center space-x-2 hover:bg-accent rounded-md p-2"
                      >
                        <span>Home</span>
                      </Link>
                      <Link
                        href="/about"
                        className="flex items-center space-x-2 hover:bg-accent rounded-md p-2"
                      >
                        <span>About</span>
                      </Link>
                      <Link
                        href="/feedback"
                        className="flex items-center space-x-2 hover:bg-accent rounded-md p-2"
                      >
                        <span>Feedback</span>
                      </Link>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </nav>
      </div>
    </header>
  );
}
