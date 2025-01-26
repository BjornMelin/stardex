from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import time
from fastapi.responses import JSONResponse

from .models import GitHubRepo, ClusteringRequest, ClusteringResponse
from .services.clustering import ClusteringService

app = FastAPI(
    title="Stardex Backend",
    version="0.1.0",
    description="API for clustering GitHub repositories"
)

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

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle ValueError exceptions."""
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)}
    )

@app.post(
    "/api/clusters",
    response_model=ClusteringResponse,
    response_description="Clustered repositories with visualization data",
    summary="Cluster GitHub repositories",
    description="""
    Analyzes and clusters GitHub repositories based on selected features and algorithm.
    
    Available clustering algorithms:
    - kmeans: K-means clustering (default)
        Parameters:
        - n_clusters: Number of clusters (default: 5)
    - dbscan: DBSCAN clustering
        Parameters:
        - eps: Maximum distance between samples (default: 0.5)
        - min_samples: Minimum samples per cluster (default: 5)
    - hierarchical: Hierarchical clustering
        Parameters:
        - n_clusters: Number of clusters (default: 5)
    
    Available features:
    - description: Repository description text
    - topics: Repository topics
    - language: Primary programming language
    - metrics: Numerical metrics (stars, forks, etc.)
    
    Returns clustered repositories with cluster assignments and visualization coordinates.
    """
)
async def cluster_repositories(request: ClusteringRequest) -> ClusteringResponse:
    """
    Cluster GitHub repositories based on selected features and algorithm.
    
    Args:
        request: ClusteringRequest containing repositories and clustering options
        
    Returns:
        ClusteringResponse: Clustering results with visualization data
    """
    try:
        # Validate request size
        if len(request.repositories) > 1000:
            raise ValueError("Maximum number of repositories (1000) exceeded")
            
        # Perform clustering
        response = clustering_service.cluster_repositories(
            repos=request.repositories,
            algorithm=request.clustering_algorithm or "kmeans",
            params=request.algorithm_parameters or {},
            features_to_use=request.features_to_use or ["description", "topics", "language", "metrics"]
        )
        
        return response
        
    except ValueError as ve:
        return ClusteringResponse(
            status="error",
            clusters=None,
            processing_time_ms=None,
            error_message=str(ve)
        )
    except Exception as e:
        print(f"Error in clustering endpoint: {str(e)}")
        return ClusteringResponse(
            status="error",
            clusters=None,
            processing_time_ms=None,
            error_message="Internal server error during clustering process"
        )

@app.get(
    "/health",
    summary="Health check endpoint",
    description="Returns the current status of the API service",
    response_description="Health status object"
)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "clustering_service": "available"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)