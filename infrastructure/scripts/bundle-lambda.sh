#!/bin/bash
set -e

# Create a temporary directory for the build
BUILD_DIR="$(mktemp -d)"
echo "Building in $BUILD_DIR"

# Copy backend code
cp -r ../backend/* "$BUILD_DIR/"

# Install dependencies
cd "$BUILD_DIR"
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -t .
deactivate

# Clean up unnecessary files
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete
rm -rf .venv
rm -rf tests

# Create zip file
zip -r9 ../function.zip .

# Cleanup
cd ..
rm -rf "$BUILD_DIR"

echo "Lambda function bundle created at function.zip"
