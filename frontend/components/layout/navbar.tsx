"use client";

import { Laptop, Menu, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Separator } from "@/components/ui/separator";

/**
 * Renders the primary navigation and theme controls.
 *
 * @returns The application navigation bar.
 */
export function Navbar() {
  const { setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center gap-3 sm:gap-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/" className="flex min-h-11 shrink-0 items-center space-x-2">
              <span className="text-2xl font-bold">Stardex</span>
            </Link>
            <Separator orientation="vertical" className="hidden h-6 md:block" />
            <p className="hidden truncate text-base font-medium md:block">
              Explore GitHub Stars Intelligently
            </p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-9 sm:w-9">
                  <Sun aria-hidden="true" className="h-[1.2rem] w-[1.2rem] dark:hidden" />
                  <Moon aria-hidden="true" className="hidden h-[1.2rem] w-[1.2rem] dark:block" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")} className="min-h-11 sm:min-h-0">
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="min-h-11 sm:min-h-0">
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("system")}
                  className="min-h-11 sm:min-h-0"
                >
                  <Laptop className="mr-2 h-4 w-4" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="h-11 px-3 sm:h-10 sm:px-4">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open navigation menu</span>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-4 w-[200px]">
                      <Link
                        href="/"
                        className="flex min-h-11 items-center space-x-2 rounded-md p-2 hover:bg-accent"
                      >
                        <span>Home</span>
                      </Link>
                      <Link
                        href="/about"
                        className="flex min-h-11 items-center space-x-2 rounded-md p-2 hover:bg-accent"
                      >
                        <span>About</span>
                      </Link>
                      <Link
                        href="/feedback"
                        className="flex min-h-11 items-center space-x-2 rounded-md p-2 hover:bg-accent"
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
