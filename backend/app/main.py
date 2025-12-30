"""FastAPI backend for Stardex GitHub repository clustering service."""

import logging
import os
import time
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.clustering import (
    perform_hierarchical,
    perform_kmeans,
    perform_pca_hierarchical,
)
from app.models import ClusteringRequest, ClusteringResponse, ClusterResult, GitHubRepo


logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(
    title="Stardex Backend",
    version="0.1.0",
    description="API for clustering GitHub repositories using multiple algorithms",
)


def parse_cors_origins(raw: str | None) -> list[str]:
    """Parse a comma-separated CORS origins string."""
    if not raw:
        return ["http://localhost:3000"]
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["http://localhost:3000"]


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(os.getenv("CORS_ORIGINS")),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return request validation errors using the ClusteringResponse shape."""
    payload = ClusteringResponse(
        status="error", error_message=str(exc), total_processing_time_ms=0
    ).model_dump()
    return JSONResponse(status_code=422, content=payload)


def extract_repo_descriptions(repositories: list[GitHubRepo]) -> list[str]:
    """Extract descriptions from repositories, handling None values."""
    return [(repo.description or "").strip() or repo.name for repo in repositories]


@app.post("/clustering")
def perform_all_clustering(
    request: ClusteringRequest, http_response: Response
) -> ClusteringResponse:
    """Perform all clustering algorithms on the provided repository data.

    This endpoint runs:
    1. K-means clustering
    2. Hierarchical clustering
    3. PCA + Hierarchical clustering

    Each algorithm runs independently and their results are combined in the response.
    """
    start_time = time.perf_counter()
    descriptions = extract_repo_descriptions(request.repositories)

    result = ClusteringResponse(status="success", total_processing_time_ms=0)

    try:
        # Perform K-means clustering
        kmeans_start = time.perf_counter()
        kmeans_clusters = perform_kmeans(descriptions, request.kmeans_clusters)
        kmeans_time = (time.perf_counter() - kmeans_start) * 1000

        result.kmeans_clusters = ClusterResult(
            algorithm="kmeans",
            clusters=kmeans_clusters,
            parameters={"num_clusters": request.kmeans_clusters},
            processing_time_ms=kmeans_time,
        )

        # Perform hierarchical clustering
        hierarchical_start = time.perf_counter()
        hierarchical_clusters = perform_hierarchical(
            descriptions, distance_threshold=request.hierarchical_threshold
        )
        hierarchical_time = (time.perf_counter() - hierarchical_start) * 1000

        result.hierarchical_clusters = ClusterResult(
            algorithm="hierarchical",
            clusters=hierarchical_clusters,
            parameters={"distance_threshold": request.hierarchical_threshold},
            processing_time_ms=hierarchical_time,
        )

        # Perform PCA + hierarchical clustering
        pca_start = time.perf_counter()
        pca_clusters = perform_pca_hierarchical(
            descriptions,
            n_components=request.pca_components,
            distance_threshold=request.hierarchical_threshold,
        )
        pca_time = (time.perf_counter() - pca_start) * 1000

        result.pca_hierarchical_clusters = ClusterResult(
            algorithm="pca_hierarchical",
            clusters=pca_clusters,
            parameters={
                "n_components": request.pca_components,
                "distance_threshold": request.hierarchical_threshold,
            },
            processing_time_ms=pca_time,
        )

        # Calculate total processing time
        result.total_processing_time_ms = (time.perf_counter() - start_time) * 1000

    except ValueError as exc:
        http_response.status_code = 400
        return ClusteringResponse(
            status="error",
            error_message=str(exc),
            total_processing_time_ms=(time.perf_counter() - start_time) * 1000,
        )

    except Exception:
        logger.exception("Clustering failed")
        http_response.status_code = 500
        return ClusteringResponse(
            status="error",
            error_message="An error occurred during clustering",
            total_processing_time_ms=(time.perf_counter() - start_time) * 1000,
        )

    return result


@app.get(
    "/health",
    summary="Health check endpoint",
    description="Returns the current status of the API service",
    response_description="Health status object",
)
async def health_check() -> dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "clustering_service": "available",
    }


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("UVICORN_HOST", "127.0.0.1")
    port = int(os.getenv("UVICORN_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
