from typing import List, Optional, Tuple
from pydantic import BaseModel

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

class ClusteringRequest(BaseModel):
    repositories: List[GitHubRepo]