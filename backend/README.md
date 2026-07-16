# Stardex Backend

Backend service for the GitHub Stars Explorer, providing advanced repository clustering using scikit-learn.

## Features

- **Unified clustering endpoint**: One API call returns the algorithms that are valid for the repository count:

  - Sparse K-means clustering for every non-empty set
  - Ward hierarchical clustering for sets of 2 through 250 repositories
  - PCA + hierarchical clustering for sets of 2 through 250 repositories

- **Performance metrics**: Read processing time for each algorithm
- **Flexible parameters**: Set clustering behavior within documented bounds
- **Cross-origin resource sharing (CORS)**: Configure frontend origins

## Prerequisites

- Python 3.11 or higher
- uv

## Installation

### 1. Install Dependencies

```bash
cd backend
uv sync
```

### 2. Start the Development Server

```bash
# Start the FastAPI server with hot reload
uv run uvicorn app.main:app --reload --port 8000
```

The API will be available at [http://localhost:8000](http://localhost:8000)

### 3. CORS Configuration

Set allowed frontend origins with `CORS_ORIGINS` (comma-separated). Example:

```bash
export CORS_ORIGINS="http://localhost:3000"
```

## API Documentation

### Main Endpoints

#### POST /clustering

Performs clustering on the provided repository data. Every valid request returns K-means. A singleton or a set larger than 250 omits hierarchical result fields.

Requests may contain 1 to 1,000 repositories in at most 16 MiB. Each repository
may include up to 20 topics of at most 50 characters each, matching GitHub's
topic limits.

This singleton request asks for more clusters and PCA components than the data supports:

```json
{
  "repositories": [
    {
      "id": 1,
      "name": "example-repo",
      "full_name": "example/example-repo",
      "description": "An example repository",
      "html_url": "https://github.com/example/example-repo",
      "stargazers_count": 1,
      "forks_count": 0,
      "open_issues_count": 0,
      "size": 1,
      "watchers_count": 1,
      "language": "Python",
      "topics": ["machine-learning", "data-science"],
      "owner": {
        "login": "example",
        "avatar_url": "https://example.com/avatar.png"
      },
      "updated_at": "2026-07-12T00:00:00Z"
    }
  ],
  "kmeans_clusters": 5,
  "hierarchical_threshold": 1.5,
  "pca_components": 10
}
```

The response reports the effective K-means value and omits unavailable dense results:

```json
{
  "status": "success",
  "kmeans_clusters": {
    "algorithm": "kmeans",
    "clusters": {
      "0": [0]
    },
    "parameters": {"num_clusters": 1},
    "processing_time_ms": 0.1
  },
  "total_processing_time_ms": 0.1
}
```

#### GET /health

Health check endpoint returning service status.

Example response:

```json
{
  "status": "healthy",
  "timestamp": 1730000000.0,
  "clustering_service": "available"
}
```

For complete API documentation, visit:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Project Structure

```plaintext
backend/
├── app/
│   ├── main.py          # FastAPI application and unified clustering endpoint
│   ├── models.py        # Pydantic models for request/response
│   ├── clustering.py    # Clustering implementations using scikit-learn
├── .venv/               # Virtual environment (not in git)
├── pyproject.toml       # Project configuration (PEP 621)
├── uv.lock              # Lock file (should be committed)
└── README.md          # This file
```

## Implementation Details

### Clustering Algorithms

1. **K-Means Clustering**

   - Groups repositories into at most k clusters
   - Uses TF-IDF vectorization for text data
   - Clamps k to the repository count

2. **Hierarchical Clustering**

   - Produces flat groups from a hierarchical model
   - Uses Ward's method for linkage
   - Adjustable distance threshold for cluster formation

3. **PCA + Hierarchical Clustering**
   - Reduces dimensionality before clustering
   - Clamps components to the repository and TF-IDF feature counts
   - Runs only within the 250-repository dense-computation boundary

### Text Processing

- Uses TF-IDF vectorization for repository descriptions
- Handles multiple languages
- Removes common stop words

## Development Guidelines

1. **Dependencies**

   - Use uv for managing dependencies
   - The `uv.lock` file should be committed
   - Add new dependencies: `uv add package-name`
   - Add dev dependencies: `uv add --group dev package-name`

2. **Code Style**
   - Format and lint with Ruff:

     ```bash
     uv run ruff format
     uv run ruff check
     ```

3. **Type Checking**

   ```bash
   uv run pyright
   ```

4. **Tests**

   ```bash
   uv run python -m pytest
   ```

## Performance Considerations

The clustering service uses:

- Sparse term frequency-inverse document frequency (TF-IDF) input for K-means
- A 250-repository boundary around dense Ward/PCA computation
- Effective parameter reporting so callers can explain clamped values

Sets of 251 through 1,000 repositories use sparse K-means only.

## Limits and Validation

The `POST /clustering` request model enforces safe defaults and limits:

- `repositories`: 1 to 1,000 items
- `kmeans_clusters`: 1 to 20, clamped to the repository count
- `hierarchical_threshold`: greater than 0 and at most 10
- `pca_components`: 1 to 50, clamped to the repository and TF-IDF feature counts

Responses omit unavailable algorithm fields and report the effective K-means and PCA values actually used.

## Contributing

1. Create a new branch for your feature
2. Ensure all tests pass
3. Update documentation as needed
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
