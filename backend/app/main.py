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
DENSE_CLUSTERING_MAX_REPOSITORIES = 250
MAX_VALIDATION_ERROR_DETAILS = 5
MAX_VALIDATION_ERROR_MESSAGE_CHARS = 1_024

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


def summarize_request_validation_error(exc: RequestValidationError) -> str:
    """Summarize validation failures without reflecting rejected request data."""
    errors = exc.errors()
    details: list[str] = []

    for error in errors[:MAX_VALIDATION_ERROR_DETAILS]:
        if not isinstance(error, dict):
            continue

        location = error.get("loc")
        path = (
            ".".join(str(part) for part in location)
            if isinstance(location, (list, tuple))
            else ""
        )
        message = error.get("msg")
        if not isinstance(message, str):
            continue

        details.append(f"{path}: {message}" if path else message)

    summary = "Request validation failed"
    if details:
        summary = f"{summary}: {'; '.join(details)}"

    omitted = max(0, len(errors) - MAX_VALIDATION_ERROR_DETAILS)
    if omitted:
        summary = f"{summary}; {omitted} additional errors"

    return summary[:MAX_VALIDATION_ERROR_MESSAGE_CHARS]


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return request validation errors using the ClusteringResponse shape."""
    payload = ClusteringResponse(
        status="error",
        error_message=summarize_request_validation_error(exc),
        total_processing_time_ms=0,
    ).model_dump(exclude_none=True)
    return JSONResponse(status_code=422, content=payload)


def extract_repo_descriptions(repositories: list[GitHubRepo]) -> list[str]:
    """Extract descriptions from repositories, handling None values."""
    return [(repo.description or "").strip() or repo.name for repo in repositories]


@app.post("/clustering", response_model_exclude_none=True)
def perform_all_clustering(
    request: ClusteringRequest, http_response: Response
) -> ClusteringResponse:
    """Perform all clustering algorithms on the provided repository data.

    K-means runs for every non-empty repository set. Hierarchical algorithms run
    for sets of 2 through 250 repositories.
    """
    start_time = time.perf_counter()
    descriptions = extract_repo_descriptions(request.repositories)
    repository_count = len(descriptions)

    result = ClusteringResponse(status="success", total_processing_time_ms=0)

    try:
        # Perform K-means clustering
        kmeans_start = time.perf_counter()
        kmeans_clusters, effective_kmeans_clusters = perform_kmeans(
            descriptions, request.kmeans_clusters
        )
        kmeans_time = (time.perf_counter() - kmeans_start) * 1000

        result.kmeans_clusters = ClusterResult(
            algorithm="kmeans",
            clusters=kmeans_clusters,
            parameters={"num_clusters": effective_kmeans_clusters},
            processing_time_ms=kmeans_time,
        )

        if 2 <= repository_count <= DENSE_CLUSTERING_MAX_REPOSITORIES:
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

            pca_start = time.perf_counter()
            pca_clusters, effective_pca_components = perform_pca_hierarchical(
                descriptions,
                n_components=request.pca_components,
                distance_threshold=request.hierarchical_threshold,
            )
            pca_time = (time.perf_counter() - pca_start) * 1000

            result.pca_hierarchical_clusters = ClusterResult(
                algorithm="pca_hierarchical",
                clusters=pca_clusters,
                parameters={
                    "n_components": effective_pca_components,
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
