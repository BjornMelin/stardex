from typing import List, Optional, Tuple, Dict, Union
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

class ClusteredRepo(BaseModel):
    repo: GitHubRepo
    cluster_id: int
    coordinates: Tuple[float, float]

class Cluster(BaseModel):
    id: int
    label: Optional[str]
    repositories: List[GitHubRepo]
    coordinates: Optional[Tuple[float, float]] = None

class ClusteringRequest(BaseModel):
    repositories: List[GitHubRepo]
    clustering_algorithm: Optional[str] = Field(
        default="kmeans",
        description="Algorithm to use for clustering: 'kmeans', 'dbscan', or 'hierarchical'"
    )
    algorithm_parameters: Optional[Dict[str, Union[int, float, str]]] = Field(
        default={},
        description="Parameters for the selected clustering algorithm"
    )
    features_to_use: Optional[List[str]] = Field(
        default=["description", "topics", "language"],
        description="Repository features to consider for clustering"
    )

class ClusteringResponse(BaseModel):
    status: str = Field(..., description="'success' or 'error'")
    clusters: Optional[List[Cluster]] = None
    processing_time_ms: Optional[float] = None
    error_message: Optional[str] = None