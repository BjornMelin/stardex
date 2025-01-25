"use client";

import { useEffect, useState } from 'react';
import { useGitHubStore } from '@/store/github';
import { clusterRepositories } from '@/lib/clustering';
import { GitHubRepo } from '@/lib/github';
import { Star, Calendar, Code, ChevronRight, Boxes } from 'lucide-react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClusterGroup {
  id: number;
  name: string;
  description: string;
  repos: GitHubRepo[];
  commonLanguages: string[];
  commonTopics: string[];
  primaryLanguage: string | null;
  totalStars: number;
}

type ViewMode = 'grid' | 'list';

function generateClusterName(group: Omit<ClusterGroup, 'name' | 'description'>): { name: string; description: string } {
  const { commonLanguages, commonTopics, repos, primaryLanguage, totalStars } = group;
  
  const getMostCommonWord = () => {
    const words = repos
      .flatMap(repo => repo.name.toLowerCase().split(/[-_\s]/))
      .filter(word => word.length > 3);
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0];
  };

  let name = '';
  let description = '';

  if (primaryLanguage && commonTopics.length > 0) {
    name = `${primaryLanguage} ${commonTopics[0].charAt(0).toUpperCase() + commonTopics[0].slice(1)} Projects`;
    description = `A collection of ${primaryLanguage} repositories focused on ${commonTopics.join(', ')}`;
  } else if (primaryLanguage) {
    const commonWord = getMostCommonWord();
    name = `${primaryLanguage} ${commonWord ? commonWord.charAt(0).toUpperCase() + commonWord.slice(1) : 'Development'} Tools`;
    description = `Various ${primaryLanguage} projects and tools`;
  } else if (commonTopics.length > 0) {
    name = `${commonTopics[0].charAt(0).toUpperCase() + commonTopics[0].slice(1)} Collection`;
    description = `Repositories centered around ${commonTopics.join(', ')}`;
  } else {
    const avgStars = Math.round(totalStars / repos.length);
    name = `General ${avgStars > 1000 ? 'Popular ' : ''}Projects`;
    description = `A diverse collection of repositories with an average of ${avgStars.toLocaleString()} stars`;
  }

  return { name, description };
}

export function RepositoryClusters() {
  const { repos } = useGitHubStore();
  const [clusters, setClusters] = useState<ClusterGroup[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'stars' | 'updated' | 'name'>('stars');
  const { toast } = useToast();

  useEffect(() => {
    const allRepos = Object.values(repos).flat();
    if (allRepos.length === 0) return;

    const updateClusters = async () => {
      try {
        const clusteredPoints = await clusterRepositories(allRepos);
        
        // Get unique cluster IDs from DBSCAN results
        const clusterIds = Array.from(new Set(clusteredPoints.map(p => p.clusterId)));
        
        const groupedClusters: ClusterGroup[] = clusterIds.map((clusterId, i) => {
          const clusterRepos = clusteredPoints
            .filter(point => point.clusterId === clusterId)
            .map(point => point.repo);

          const languages = clusterRepos
            .map(repo => repo.language)
            .filter((lang): lang is string => lang !== null);
          const languageCounts = languages.reduce((acc, lang) => {
            acc[lang] = (acc[lang] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const primaryLanguage = Object.entries(languageCounts)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

          const allTopics = clusterRepos.flatMap(repo => repo.topics);
          const topicCounts = allTopics.reduce((acc, topic) => {
            acc[topic] = (acc[topic] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const commonTopics = Object.entries(topicCounts)
            .filter(([_, count]) => count > clusterRepos.length * 0.3)
            .map(([topic]) => topic)
            .sort();

          const totalStars = clusterRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

          const baseGroup = {
            id: i,
            repos: clusterRepos,
            commonLanguages: Array.from(new Set(languages)).filter(lang => lang !== null),
            commonTopics,
            primaryLanguage,
            totalStars,
          };

          return {
            ...baseGroup,
            ...generateClusterName(baseGroup),
          };
        }).filter(cluster => cluster.repos.length > 0);

        // Sort clusters by size and total stars
        groupedClusters.sort((a, b) => 
          b.repos.length - a.repos.length || 
          b.totalStars - a.totalStars
        );
        
        setClusters(groupedClusters);
        if (selectedCluster === null && groupedClusters.length > 0) {
          setSelectedCluster(groupedClusters[0].id);
        }
      } catch (error) {
        toast({
          title: 'Clustering Error',
          description: 'Failed to cluster repositories. Please try again.',
          variant: 'destructive',
        });
      }
    };

    updateClusters();
  }, [repos, toast]);

  const sortRepositories = (repos: GitHubRepo[]) => {
    return [...repos].sort((a, b) => {
      switch (sortBy) {
        case 'stars':
          return b.stargazers_count - a.stargazers_count;
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  };

  if (Object.values(repos).flat().length === 0) {
    return null;
  }

  const selectedClusterData = clusters.find(c => c.id === selectedCluster);

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5" />
              Repository Groups
            </CardTitle>
            <CardDescription>
              Discover similar repositories grouped by language, topics, and characteristics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: 'stars' | 'updated' | 'name') => setSortBy(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stars">Most Stars</SelectItem>
                <SelectItem value="updated">Recently Updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <div className="grid grid-cols-2 gap-0.5 h-4 w-4">
                  <div className="bg-current rounded-sm" />
                  <div className="bg-current rounded-sm" />
                  <div className="bg-current rounded-sm" />
                  <div className="bg-current rounded-sm" />
                </div>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <div className="flex flex-col gap-0.5 h-4 w-4">
                  <div className="h-0.5 w-full bg-current rounded-full" />
                  <div className="h-0.5 w-full bg-current rounded-full" />
                  <div className="h-0.5 w-full bg-current rounded-full" />
                </div>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">

          <div className="grid grid-cols-4 gap-6">
            <div className="space-y-2">
              {clusters.map((cluster) => (
                <button
                  key={cluster.id}
                  onClick={() => setSelectedCluster(cluster.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedCluster === cluster.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate">{cluster.name}</div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 ml-2" />
                  </div>
                  <div className="text-sm opacity-80">
                    {cluster.repos.length} repositories
                  </div>
                </button>
              ))}
            </div>

            <div className="col-span-3">
              {selectedClusterData && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedClusterData.name}</h3>
                    <p className="text-muted-foreground">{selectedClusterData.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedClusterData.commonLanguages.map(lang => (
                      <Badge key={lang} variant="secondary" className="gap-1">
                        <Code className="h-3 w-3" />
                        {lang}
                      </Badge>
                    ))}
                    {selectedClusterData.commonTopics.map(topic => (
                      <Badge key={topic} variant="outline">
                        {topic}
                      </Badge>
                    ))}
                  </div>

                  <ScrollArea className="h-[500px] pr-4">
                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
                      {sortRepositories(selectedClusterData.repos).map((repo) => (
                        <Card key={repo.id} className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
                                <AvatarFallback>{repo.owner.login[0]}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <a
                                    href={repo.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-lg font-semibold hover:underline truncate"
                                  >
                                    {repo.full_name}
                                  </a>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                                    <Star className="h-4 w-4" />
                                    {repo.stargazers_count.toLocaleString()}
                                  </div>
                                </div>
                                {repo.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {repo.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {repo.language && (
                                <Badge variant="secondary" className="gap-1">
                                  <Code className="h-3 w-3" />
                                  {repo.language}
                                </Badge>
                              )}
                              <Badge variant="outline" className="gap-1">
                                <Calendar className="h-3 w-3" />
                                Updated {format(new Date(repo.updated_at), 'MMM d, yyyy')}
                              </Badge>
                            </div>
                            {repo.topics.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {repo.topics.map((topic) => (
                                  <Badge key={topic} variant="secondary" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
