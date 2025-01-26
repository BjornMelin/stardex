"use client";

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Selection, BaseType } from 'd3';
import { GitHubRepo } from '@/lib/github';
import { ClusteredRepo, clusterRepositories } from '@/lib/clustering-api';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface RepositoryClustersProps {
  repositories: GitHubRepo[];
}

interface TooltipData {
  pageX: number;
  pageY: number;
  repo: GitHubRepo;
}

export function RepositoryClusters({ repositories }: RepositoryClustersProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [clusteredRepos, setClusteredRepos] = useState<ClusteredRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function performClustering() {
      if (!repositories.length) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const clustered = await clusterRepositories(repositories);
        setClusteredRepos(clustered);
      } catch (error) {
        console.error('Clustering error:', error);
        toast({
          title: 'Clustering Error',
          description: 'Failed to cluster repositories. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    performClustering();
  }, [repositories, toast]);

  useEffect(() => {
    if (!svgRef.current || !clusteredRepos.length || loading) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up SVG dimensions
    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select<SVGSVGElement, unknown>(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([margin.left, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([innerHeight, margin.top]);

    // Create color scale for clusters
    const uniqueClusters = Array.from(
      new Set(clusteredRepos.map((r: ClusteredRepo) => r.cluster_id))
    ).map(String);
    
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(uniqueClusters)
      .range(d3.schemeCategory10);

    // Create tooltip
    const tooltip = d3
      .select<HTMLDivElement, unknown>('body')
      .append('div')
      .attr('class', 'absolute hidden p-2 bg-white border rounded shadow-lg')
      .style('pointer-events', 'none') as Selection<HTMLDivElement, unknown, HTMLElement, unknown>;

    // Draw points
    const points = svg
      .selectAll<SVGCircleElement, ClusteredRepo>('circle')
      .data(clusteredRepos)
      .enter()
      .append('circle')
      .attr('cx', (d: ClusteredRepo) => xScale(d.coordinates[0]))
      .attr('cy', (d: ClusteredRepo) => yScale(d.coordinates[1]))
      .attr('r', 6)
      .attr('fill', (d: ClusteredRepo) => colorScale(String(d.cluster_id)))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    // Add hover interactions
    points
      .on('mouseover', (event: MouseEvent, d: ClusteredRepo) => {
        const target = event.currentTarget as SVGCircleElement;
        d3.select(target)
          .transition()
          .duration(200)
          .attr('r', 8);

        tooltip
          .html(
            `
            <div class="space-y-1">
              <p class="font-semibold">${d.repo.name}</p>
              <p class="text-sm text-gray-600">${
                d.repo.description || 'No description'
              }</p>
              <p class="text-xs text-gray-500">
                ⭐ ${d.repo.stargazers_count.toLocaleString()} · 
                🔀 ${d.repo.forks_count.toLocaleString()}
              </p>
            </div>
          `
          )
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY + 10}px`)
          .classed('hidden', false);
      })
      .on('mouseout', (event: MouseEvent) => {
        const target = event.currentTarget as SVGCircleElement;
        d3.select(target)
          .transition()
          .duration(200)
          .attr('r', 6);

        tooltip.classed('hidden', true);
      })
      .on('click', (_: MouseEvent, d: ClusteredRepo) => {
        window.open(d.repo.html_url, '_blank');
      });

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [clusteredRepos, loading]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-[600px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </Card>
    );
  }

  if (!repositories.length) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-[600px] text-gray-500">
          No repositories to display
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-center">
        <svg ref={svgRef} />
      </div>
    </Card>
  );
}