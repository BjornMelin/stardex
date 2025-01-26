# Stardex Backend

Backend service for the GitHub Stars Explorer, providing repository clustering using TensorFlow.

## Prerequisites

- Python 3.9, 3.10, or 3.11 (TensorFlow compatibility)
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
poetry run uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

## API Documentation

Once the server is running, view the interactive API documentation at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Troubleshooting

### Common Installation Issues

1. **TensorFlow Installation Fails**

   ```
   Error: Unable to find installation candidates for tensorflow-io-gcs-filesystem
   ```

   Solution:

   - Try installing tensorflow-cpu separately first:
     ```bash
     pip install tensorflow-cpu==2.15.0
     poetry install --no-root
     ```
   - If that doesn't work, install dependencies directly with pip:
     ```bash
     pip install tensorflow-cpu==2.15.0 fastapi uvicorn numpy pydantic python-dotenv scikit-learn
     ```

2. **Python Version Compatibility**

   ```
   Error: Python version not supported
   ```

   Solution:

   - Ensure you're using Python 3.9-3.11 (check with `python --version`)
   - If needed, install a compatible Python version and create a new virtual environment

3. **Poetry Lock File Issues**

   ```
   Error: The lock file is not compatible
   ```

   Solution:

   ```bash
   poetry lock --no-update
   poetry install --no-root
   ```

4. **Memory Issues During Installation**
   - If you encounter memory errors during TensorFlow installation:

     ```bash
     # On Windows, use:
     set PYTHONOPTS=--no-cache-dir
     # On macOS/Linux:
     export PYTHONOPTS=--no-cache-dir

     poetry install --no-root
     ```

### Environment Issues

1. **SSL Certificate Errors**

   - If you encounter SSL errors:
     ```bash
     pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org poetry
     ```

2. **Path Issues**
   - After installing Poetry, if the `poetry` command isn't found:
     - Windows: Restart your terminal
     - macOS/Linux: Add Poetry to your PATH:
       ```bash
       export PATH="$HOME/.local/bin:$PATH"
       ```

## Project Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI application and routes
│   ├── models.py        # Pydantic models
│   └── services/
│       └── clustering.py # TensorFlow clustering implementation
├── .venv/               # Virtual environment (not in git)
├── .gitignore          # Git ignore file
├── pyproject.toml      # Poetry project configuration
├── poetry.lock         # Lock file (should be committed)
└── README.md          # This file
```

## Development Guidelines

1. **Dependencies**

   - Always use Poetry for managing dependencies
   - The `poetry.lock` file should be committed to ensure consistent installations
   - Use `poetry add package-name` to add new dependencies
   - Use `poetry add -D package-name` for dev dependencies

2. **Virtual Environment**

   - Always use a virtual environment
   - Activate it before running any Python commands
   - If you need to recreate the virtual environment:
     ```bash
     rm -rf .venv
     python -m venv .venv
     # Activate virtual environment (see above)
     poetry install --no-root
     ```

3. **Code Style**
   - The project uses black for code formatting
   - Run formatter before committing:
     ```bash
     poetry run black app/
     ```

## Performance Considerations

The clustering service is optimized for:

- Large datasets using TensorFlow's efficient operations
- Memory usage with batch processing
- CPU utilization with vectorized operations

For very large datasets, consider:

1. Increasing the server's timeout settings
2. Adjusting the clustering parameters in `app/services/clustering.py`
3. Using the CPU-only TensorFlow build for better compatibility

## Contributing

1. Create a new branch for your feature
2. Ensure all tests pass
3. Update documentation as needed
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
