from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class GitHubRepo(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str]
    html_url: str
    stargazers_count: int
    forks_count: int
    open_issues_count: int
    size: int
    watchers_count: int
    language: Optional[str]
    topics: List[str]
    owner: dict
    updated_at: str


class ClusteringRequest(BaseModel):
    repositories: List[GitHubRepo] = Field(
        ..., description="List of GitHub repositories to cluster"
    )
    kmeans_clusters: int = Field(
        default=5, description="Number of clusters for K-means clustering"
    )
    hierarchical_threshold: float = Field(
        default=1.5, description="Distance threshold for hierarchical clustering"
    )
    pca_components: int = Field(default=10, description="Number of components for PCA")


class ClusterResult(BaseModel):
    algorithm: str = Field(..., description="Name of the clustering algorithm")
    clusters: Dict[int, List[int]] = Field(
        ..., description="Mapping of cluster IDs to repository indices"
    )
    parameters: Dict[str, Any] = Field(
        ..., description="Parameters used for this clustering"
    )
    processing_time_ms: float = Field(
        ..., description="Time taken to perform clustering"
    )


class ClusteringResponse(BaseModel):
    status: str = Field(
        default="success", description="Status of the clustering operations"
    )
    kmeans_clusters: Optional[ClusterResult] = Field(
        None, description="Results from K-means clustering"
    )
    hierarchical_clusters: Optional[ClusterResult] = Field(
        None, description="Results from hierarchical clustering"
    )
    pca_hierarchical_clusters: Optional[ClusterResult] = Field(
        None, description="Results from PCA + hierarchical clustering"
    )
    error_message: Optional[str] = None
    total_processing_time_ms: float = Field(
        ..., description="Total time taken for all clustering operations"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "kmeans_clusters": {
                    "algorithm": "kmeans",
                    "clusters": {"0": [0, 2, 4], "1": [1, 3, 5]},
                    "parameters": {"num_clusters": 2},
                    "processing_time_ms": 150.5,
                },
                "hierarchical_clusters": {
                    "algorithm": "hierarchical",
                    "clusters": {"0": [0, 2], "1": [1, 3], "2": [4, 5]},
                    "parameters": {"distance_threshold": 1.5},
                    "processing_time_ms": 200.3,
                },
                "pca_hierarchical_clusters": {
                    "algorithm": "pca_hierarchical",
                    "clusters": {"0": [0, 2, 4], "1": [1, 3, 5]},
                    "parameters": {"n_components": 10, "distance_threshold": 1.5},
                    "processing_time_ms": 180.7,
                },
                "total_processing_time_ms": 531.5,
            }
        }
