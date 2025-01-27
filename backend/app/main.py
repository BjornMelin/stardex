from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from .clustering import get_clusters
from .models import Repository, ClusterRequest
import os

app = FastAPI(
    title="Stardex API",
    description="Backend API for Stardex GitHub Repository Analysis",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://stardex.bjornmelin.io",
        "https://www.stardex.bjornmelin.io",
        # Allow localhost for development
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.post("/clustering/repositories")
async def cluster_repositories(request: ClusterRequest):
    """Cluster GitHub repositories based on provided parameters"""
    try:
        clusters = get_clusters(
            repositories=request.repositories,
            n_clusters=request.n_clusters,
            min_samples=request.min_samples,
            min_cluster_size=request.min_cluster_size,
        )
        return {"clusters": clusters}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Stardex API",
        "version": "1.0.0",
        "docs_url": "/docs",
    }

# Create Lambda handler
handler = Mangum(app, lifespan="off")

# If running locally
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
