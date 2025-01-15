import { UserSearch } from '@/components/user-search';
import { RepositoryList } from '@/components/repository-list';
import { Star, Search, GitBranch, Boxes } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-background via-background/95 to-muted/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,var(--primary-foreground)/3%,transparent_100%)]" />
        <div className="container mx-auto px-4 pt-20 pb-16 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-1 backdrop-blur">
                <div className="rounded-xl bg-gradient-to-br from-muted/80 to-muted/20 px-4 py-1.5 text-sm text-muted-foreground">
                  ✨ Discover repositories in a whole new way
                </div>
              </div>
            </div>
            
            <h1 className="text-6xl font-bold tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <span className="inline-block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Stardex
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000">
              Explore GitHub Stars Intelligently with advanced clustering and organization
            </p>

            <div className="animate-in fade-in slide-in-from-bottom-16 duration-1000">
              <UserSearch />
            </div>
          </div>
        </div>
      </div>

      {/* Repository List Section - Moved up */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <RepositoryList />
        </div>
      </div>

      {/* Features Section - Moved down */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="bg-gradient-to-br from-background to-muted transition-transform hover:scale-105">
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Smart Search</h3>
              <p className="text-muted-foreground">
                Find repositories quickly with intelligent search and filtering
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-background to-muted transition-transform hover:scale-105">
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Boxes className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">AI Clustering</h3>
              <p className="text-muted-foreground">
                Automatically group similar repositories using machine learning
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-background to-muted transition-transform hover:scale-105">
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Visual Organization</h3>
              <p className="text-muted-foreground">
                Beautiful, intuitive interface for managing your starred repos
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}