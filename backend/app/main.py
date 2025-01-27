from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import time
from typing import List, Tuple

from app.models import ClusteringRequest, ClusteringResponse, ClusterResult
from app.clustering import (
    perform_kmeans,
    perform_hierarchical,
    perform_pca_hierarchical,
)

app = FastAPI(
    title="Stardex Backend",
    version="0.1.0",
    description="API for clustering GitHub repositories using multiple algorithms",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle ValueError exceptions."""
    return ClusteringResponse(
        status="error", error_message=str(exc), total_processing_time_ms=0
    )

def extract_repo_data(repositories: List[dict]) -> Tuple[List[str], List[str]]:
    """
    Extract descriptions and READMEs from repositories.
    
    Args:
        repositories: List of repository objects
        
    Returns:
        Tuple[List[str], List[str]]: Lists of descriptions and README contents
    """
    descriptions = []
    readmes = []
    
    for repo in repositories:
        # Use name if description is None
        descriptions.append(repo.description or repo.name)
        # Add README content if available
        readmes.append(repo.readme_content or "")
        
    return descriptions, readmes

@app.post("/clustering", response_model=ClusteringResponse)
def perform_all_clustering(request: ClusteringRequest):
    """
    Perform all clustering algorithms on the provided repository data.

    This endpoint runs:
    1. K-means clustering
    2. Hierarchical clustering
    3. PCA + Hierarchical clustering

    Each algorithm runs independently and their results are combined in the response.
    """
    start_time = time.time()
    descriptions, readmes = extract_repo_data(request.repositories)

    response = ClusteringResponse(status="success", total_processing_time_ms=0)

    try:
        # Perform K-means clustering
        kmeans_start = time.time()
        kmeans_clusters = perform_kmeans(descriptions, request.kmeans_clusters, readmes)
        kmeans_time = (time.time() - kmeans_start) * 1000

        response.kmeans_clusters = ClusterResult(
            algorithm="kmeans",
            clusters=kmeans_clusters,
            parameters={"num_clusters": request.kmeans_clusters},
            processing_time_ms=kmeans_time,
        )

        # Perform hierarchical clustering
        hierarchical_start = time.time()
        hierarchical_clusters = perform_hierarchical(
            descriptions,
            distance_threshold=request.hierarchical_threshold,
            readmes=readmes
        )
        hierarchical_time = (time.time() - hierarchical_start) * 1000

        response.hierarchical_clusters = ClusterResult(
            algorithm="hierarchical",
            clusters=hierarchical_clusters,
            parameters={"distance_threshold": request.hierarchical_threshold},
            processing_time_ms=hierarchical_time,
        )

        # Perform PCA + hierarchical clustering
        pca_start = time.time()
        pca_clusters = perform_pca_hierarchical(
            descriptions,
            n_components=request.pca_components,
            distance_threshold=request.hierarchical_threshold,
            readmes=readmes
        )
        pca_time = (time.time() - pca_start) * 1000

        response.pca_hierarchical_clusters = ClusterResult(
            algorithm="pca_hierarchical",
            clusters=pca_clusters,
            parameters={
                "n_components": request.pca_components,
                "distance_threshold": request.hierarchical_threshold,
            },
            processing_time_ms=pca_time,
        )

        # Calculate total processing time
        response.total_processing_time_ms = (time.time() - start_time) * 1000

        return response

    except Exception as e:
        return ClusteringResponse(
            status="error",
            error_message=str(e),
            total_processing_time_ms=(time.time() - start_time) * 1000,
        )

@app.get(
    "/health",
    summary="Health check endpoint",
    description="Returns the current status of the API service",
    response_description="Health status object",
)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "clustering_service": "available",
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
