"""Pydantic models for the Stardex API."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


MAX_CLUSTERING_REPOSITORIES = 1_000
MAX_DESCRIPTION_CHARS = 2_000
MAX_TOPICS = 50


class GitHubOwner(BaseModel):
    """GitHub repository owner."""

    login: str = Field(..., min_length=1, max_length=64)
    avatar_url: str = Field(..., min_length=1, max_length=2_048)

    model_config = ConfigDict(extra="forbid")


class GitHubRepo(BaseModel):
    """GitHub repository data model."""

    id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=200)
    full_name: str = Field(..., min_length=1, max_length=512)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_CHARS)
    html_url: str = Field(..., min_length=1, max_length=2_048)
    stargazers_count: int = Field(..., ge=0)
    forks_count: int = Field(..., ge=0)
    open_issues_count: int = Field(..., ge=0)
    size: int = Field(..., ge=0)
    watchers_count: int = Field(..., ge=0)
    language: str | None = Field(default=None, max_length=128)
    topics: list[str] = Field(default_factory=list, max_length=MAX_TOPICS)
    owner: GitHubOwner
    updated_at: str = Field(..., min_length=1, max_length=64)

    model_config = ConfigDict(extra="forbid")


class ClusteringRequest(BaseModel):
    """Request model for clustering endpoints."""

    repositories: list[GitHubRepo] = Field(
        ...,
        description="List of GitHub repositories to cluster",
        min_length=1,
        max_length=MAX_CLUSTERING_REPOSITORIES,
    )
    kmeans_clusters: int = Field(
        default=5,
        description="Number of clusters for K-means clustering",
        ge=1,
        le=20,
    )
    hierarchical_threshold: float = Field(
        default=1.5,
        description="Distance threshold for hierarchical clustering",
        gt=0.0,
        le=10.0,
    )
    pca_components: int = Field(
        default=10, description="Number of components for PCA", ge=1, le=50
    )

    model_config = ConfigDict(extra="forbid")


class ClusterResult(BaseModel):
    """Result from a single clustering algorithm."""

    algorithm: Literal["kmeans", "hierarchical", "pca_hierarchical"] = Field(
        ..., description="Name of the clustering algorithm"
    )
    clusters: dict[int, list[int]] = Field(
        ..., description="Mapping of cluster IDs to repository indices"
    )
    parameters: dict[str, Any] = Field(
        ..., description="Parameters used for this clustering"
    )
    processing_time_ms: float = Field(
        ..., description="Time taken to perform clustering"
    )

    model_config = ConfigDict(extra="forbid")


class ClusteringResponse(BaseModel):
    """Response model for clustering endpoints."""

    status: str = Field(
        default="success", description="Status of the clustering operations"
    )
    kmeans_clusters: ClusterResult | None = Field(
        default=None, description="Results from K-means clustering"
    )
    hierarchical_clusters: ClusterResult | None = Field(
        default=None, description="Results from hierarchical clustering"
    )
    pca_hierarchical_clusters: ClusterResult | None = Field(
        default=None, description="Results from PCA + hierarchical clustering"
    )
    error_message: str | None = Field(default=None, description="Error message, if any")
    total_processing_time_ms: float = Field(
        ..., description="Total time taken for all clustering operations"
    )

    model_config = ConfigDict(
        json_schema_extra={
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
                    "parameters": {"n_components": 6, "distance_threshold": 1.5},
                    "processing_time_ms": 180.7,
                },
                "total_processing_time_ms": 531.5,
            }
        }
    )
