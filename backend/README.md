# Stardex Backend

Backend service for the GitHub Stars Explorer, providing advanced repository clustering using scikit-learn.

## Features

- **Unified Clustering Endpoint**: Single API call performs multiple clustering algorithms:

  - K-means clustering for broad grouping of repositories
  - Hierarchical clustering for detailed relationship analysis
  - PCA + Hierarchical clustering for improved performance on large datasets

- **Performance Metrics**: Get processing time for each algorithm
- **Flexible Parameters**: Customize clustering behavior with adjustable parameters
- **CORS Support**: Built-in support for frontend integration

## Prerequisites

- Python 3.10 or higher
- Poetry package manager
- Virtual environment (recommended)

## Installation

### 1. Set Up Python Virtual Environment

```bash
# Create virtual environment
cd backend
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate
```

### 2. Install Poetry

```bash
# Install poetry if you haven't already
pip install poetry

# Verify installation
poetry --version
```

### 3. Install Dependencies

```bash
# Install project dependencies
poetry install --no-root
```

### 4. Start the Development Server

```bash
# Start the FastAPI server with hot reload
poetry run uvicorn app.main:app --reload --port 8000
```

The API will be available at [http://localhost:8000](http://localhost:8000)

## API Documentation

### Main Endpoints

#### POST /clustering

Performs all clustering algorithms on the provided repository data.

Request Body:

```json
{
  "repositories": [
    {
      "id": 1,
      "name": "example-repo",
      "description": "An example repository",
      "language": "Python",
      "topics": ["machine-learning", "data-science"],
      ...
    }
  ],
  "kmeans_clusters": 5,
  "hierarchical_threshold": 1.5,
  "pca_components": 10
}
```

Response:

```json
{
  "status": "success",
  "kmeans_clusters": {
    "algorithm": "kmeans",
    "clusters": {
      "0": [0, 2, 4],
      "1": [1, 3, 5]
    },
    "parameters": {"num_clusters": 5},
    "processing_time_ms": 150.5
  },
  "hierarchical_clusters": {
    "algorithm": "hierarchical",
    "clusters": {...},
    "parameters": {"distance_threshold": 1.5},
    "processing_time_ms": 200.3
  },
  "pca_hierarchical_clusters": {
    "algorithm": "pca_hierarchical",
    "clusters": {...},
    "parameters": {
      "n_components": 10,
      "distance_threshold": 1.5
    },
    "processing_time_ms": 180.7
  },
  "total_processing_time_ms": 531.5
}
```

#### GET /health

Health check endpoint returning service status.

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
│   └── services/        # Additional services (if needed)
├── .venv/               # Virtual environment (not in git)
├── pyproject.toml       # Poetry project configuration
├── poetry.lock         # Lock file (should be committed)
└── README.md          # This file
```

## Implementation Details

### Clustering Algorithms

1. **K-Means Clustering**

   - Groups repositories into k distinct clusters
   - Uses TF-IDF vectorization for text data
   - Configurable number of clusters

2. **Hierarchical Clustering**

   - Creates hierarchical relationships between repositories
   - Uses Ward's method for linkage
   - Adjustable distance threshold for cluster formation

3. **PCA + Hierarchical Clustering**
   - Reduces dimensionality before clustering
   - Improves performance on large datasets
   - Configurable number of components

### Text Processing

- Uses TF-IDF vectorization for repository descriptions
- Handles multiple languages
- Removes common stop words

## Development Guidelines

1. **Dependencies**

   - Use Poetry for managing dependencies
   - The `poetry.lock` file should be committed
   - Add new dependencies: `poetry add package-name`
   - Add dev dependencies: `poetry add -D package-name`

2. **Code Style**
   - Use black for code formatting:

     ```bash
     poetry run black app/
     ```

## Performance Considerations

The clustering service is optimized for:

- Efficient text vectorization
- Memory usage with scipy sparse matrices
- Parallel processing where applicable

For large datasets, consider:

1. Adjusting PCA components to reduce dimensionality
2. Increasing the hierarchical clustering threshold
3. Reducing the number of K-means clusters

## Contributing

1. Create a new branch for your feature
2. Ensure all tests pass
3. Update documentation as needed
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
