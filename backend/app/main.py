from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import time
from fastapi.responses import JSONResponse

from .models import GitHubRepo, ClusteredRepo, ClusteringRequest
from .services.clustering import ClusteringService

app = FastAPI(
    title="Stardex Backend",
    version="0.1.0",
    description="API for clustering GitHub repositories using TensorFlow"
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
    "/api/cluster",
    response_model=List[ClusteredRepo],
    response_description="List of repositories with cluster assignments and visualization coordinates",
    summary="Cluster GitHub repositories",
    description="""
    Analyzes and clusters GitHub repositories based on their features using TensorFlow.
    
    The clustering algorithm considers multiple repository metrics including:
    - Star count
    - Fork count
    - Issue engagement
    - Repository size
    - Overall activity
    - Topic diversity
    - Language presence
    
    Returns the repositories with cluster assignments and 2D coordinates for visualization.
    """
)
async def cluster_repositories(request: ClusteringRequest):
    """
    Cluster GitHub repositories based on their features.
    
    Args:
        request: ClusteringRequest containing list of repositories
        
    Returns:
        List[ClusteredRepo]: Clustered repositories with visualization coordinates
        
    Raises:
        HTTPException: If clustering fails or input is invalid
    """
    # Performance monitoring
    start_time = time.time()
    
    try:
        # Validate request size
        if len(request.repositories) > 1000:
            raise ValueError("Maximum number of repositories (1000) exceeded")
            
        # Perform clustering
        clustered_repos = clustering_service.cluster_repositories(request.repositories)
        
        # Log performance metrics
        processing_time = time.time() - start_time
        print(f"Clustering completed in {processing_time:.2f} seconds for {len(request.repositories)} repositories")
        
        return clustered_repos
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Error in clustering endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during clustering process"
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