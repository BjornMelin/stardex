"use client";

import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GitHubRepo } from "@/lib/github";
import { clusterRepositories, Cluster } from "@/lib/clustering-api";

interface ClusterData {
  id: number;
  label?: string;
  repositories: GitHubRepo[];
}

interface RepositoryClustersProps {
  repositories: GitHubRepo[];
}

export default function RepositoryClusters({ repositories }: RepositoryClustersProps) {
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [activeCluster, setActiveCluster] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nClusters, setNClusters] = useState(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClusters(nClusters);
  }, [nClusters, repositories]);

  async function fetchClusters(num: number) {
    setLoading(true);
    try {
      const response = await clusterRepositories({
        repositories,
        clustering_algorithm: "kmeans",
        algorithm_parameters: { n_clusters: num },
        features_to_use: ["description", "topics", "language", "metrics"],
      });
      if (response.status === "success" && response.clusters) {
        // Cast to our local type
        setClusters(response.clusters as ClusterData[]);
        setActiveCluster(response.clusters.length ? response.clusters[0].id : null);
      } else {
        throw new Error(response.error_message || "Clustering failed");
      }
    } catch (error) {
      console.error("Clustering error:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectCluster(id: number) {
    setActiveCluster(id);
    setSearchQuery("");
  }

  const selectedCluster = clusters.find((c) => c.id === activeCluster);
  const filteredRepos = selectedCluster
    ? selectedCluster.repositories.filter((repo) =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-[600px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-row">
        <div className="w-1/4 border-r border-gray-300 p-2 flex flex-col">
          <div className="mb-2">Number of Clusters</div>
          <Slider
            defaultValue={[nClusters]}
            min={2}
            max={10}
            step={1}
            onValueChange={(val) => setNClusters(val[0])}
          />
          <div className="text-sm text-gray-500 mt-2 mb-4">Selected: {nClusters}</div>
          <div className="text-base font-semibold">Clusters</div>
          <div className="mt-2 overflow-y-auto flex-1">
            {clusters.map((cluster) => (
              <Button
                key={cluster.id}
                variant={cluster.id === activeCluster ? "default" : "outline"}
                className="mb-2 w-full"
                onClick={() => handleSelectCluster(cluster.id)}
              >
                {cluster.label || `Cluster #${cluster.id}`}
              </Button>
            ))}
          </div>
        </div>
        <div className="w-3/4 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="ml-auto text-sm text-gray-500">
              {filteredRepos.length} repositories
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {selectedCluster ? (
              filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="border rounded p-3 mb-2 bg-white shadow-sm"
                >
                  <div className="font-semibold">{repo.name}</div>
                  <div className="text-gray-600 text-sm">{repo.description}</div>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm">No cluster selected.</div>
            )}
          </div>
        </div>

      </div>
    </Card>
  );
}
