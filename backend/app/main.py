from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from .models import GitHubRepo, ClusteredRepo, ClusteringRequest
from .services.clustering import ClusteringService

app = FastAPI(title="Stardex Backend", version="0.1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
clustering_service = ClusteringService()

@app.post("/api/cluster", response_model=List[ClusteredRepo])
async def cluster_repositories(request: ClusteringRequest):
    """
    Cluster GitHub repositories based on their features.
    
    This endpoint accepts a list of GitHub repositories and returns them with
    clustering information, including cluster IDs and 2D coordinates for visualization.
    """
    try:
        clustered_repos = clustering_service.cluster_repositories(request.repositories)
        return clustered_repos
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)