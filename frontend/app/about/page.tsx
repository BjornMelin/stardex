import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, GitBranch, Code, Boxes } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">About Stardex</h1>
          <p className="text-lg text-muted-foreground">
            Discover and organize GitHub stars with intelligent grouping and analysis
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-background to-muted transition-transform hover:scale-105">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Smart Organization</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Stardex uses advanced machine learning algorithms to automatically group similar repositories,
                making it easier to discover and organize your GitHub stars.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-background to-muted transition-transform hover:scale-105">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <GitBranch className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Intelligent Search</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Find repositories quickly with our powerful search and filtering system that understands
                programming languages, topics, and repository characteristics.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-background to-muted transition-transform hover:scale-105">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Boxes className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Key Features</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Badge variant="secondary">Machine Learning Clustering</Badge>
                <p className="text-sm text-muted-foreground">
                  Automatically groups similar repositories using advanced algorithms
                </p>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary">Smart Search</Badge>
                <p className="text-sm text-muted-foreground">
                  Powerful search with language and topic filtering
                </p>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary">Visual Organization</Badge>
                <p className="text-sm text-muted-foreground">
                  Clean, modern interface for easy navigation
                </p>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary">Multi-User Support</Badge>
                <p className="text-sm text-muted-foreground">
                  Explore and compare stars from multiple GitHub users
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background to-muted transition-transform hover:scale-105">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Code className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">About the Author</h2>
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Hi, I&apos;m Bjorn Melin, a Senior Data Scientist specializing in machine learning and cloud solutions architecture. 
                Stardex was born from my passion for organizing and discovering
                interesting GitHub projects in a more intelligent way.
              </p>
              <p>
                Based in Salt Lake City, I bring expertise in AI/ML and cloud architecture to create
                tools that help researchers and developers be more productive. When I&apos;m not coding, 
                you can find me freestyle skiing in Utah&apos;s mountains.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}