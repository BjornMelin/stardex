# ⭐ Stardex - Explore GitHub Stars Intelligently

Understand your GitHub stars faster: fetch stars from one or more users, filter what you care about, then cluster repos by description similarity.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.8-F7931E?style=flat-square&logo=scikit-learn)](https://scikit-learn.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![GitHub](https://img.shields.io/badge/GitHub-BjornMelin-181717?logo=github)](https://github.com/BjornMelin)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev)

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Development](#development)
- [Author](#author)
- [How to Cite](#how-to-cite)
- [License](#license)

## Features

- Search GitHub users and pull their starred repositories (supports multiple users).
- Explore in a list view with search, language filtering, topic filtering, minimum stars, and sorting.
- Cluster repositories by description similarity using K-means, hierarchical clustering, or PCA + hierarchical clustering.
- Tune clustering parameters from the UI and switch between algorithms.
- Strong input validation in the backend (clear errors and safe limits).

## Technology Stack

- **Frontend**
  - Next.js (App Router) + React + TypeScript
  - TanStack Query for data fetching/caching
  - Zustand for client state
  - shadcn/ui-style components (Radix primitives + Tailwind)
  - Tailwind CSS
  - Zod for client-side validation

- **Backend**
  - FastAPI + Pydantic (Python 3.11+)
  - scikit-learn (TF-IDF, K-means, PCA)
  - SciPy hierarchical clustering (scikit-learn uses SciPy for hierarchical clustering)
  - uv for dependency management
  - Ruff + Pyright + pytest for quality gates

## How It Works

1. The frontend calls the GitHub REST API to fetch starred repositories for selected users.
2. The frontend sends repository metadata to the backend clustering API.
3. The backend vectorizes repository text (description/name) using TF-IDF and runs one or more clustering algorithms.
4. The frontend renders clusters and lets you filter/search within the results.

## Architecture

This repo is a monorepo with two services:

- `frontend/`: Next.js app (App Router).
- `backend/`: FastAPI service exposing the clustering API.

Data flow:

- Browser -> GitHub REST API (`/search/users`, `/users/:user/starred`)
- Browser -> Backend (`POST /clustering`)

## Getting Started

### Prerequisites

- Node.js (LTS) + `pnpm`
- Python 3.11+ + `uv`

### Install

```bash
pnpm install
(cd backend && uv sync)
```

### Run (recommended)

```bash
pnpm dev
```

### Run services separately

```bash
pnpm dev:frontend
pnpm dev:backend
```

Open the app at `http://localhost:3000`.

## Configuration

### Frontend

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend

- `CORS_ORIGINS`: comma-separated list of allowed origins. Default: `http://localhost:3000`.
- `UVICORN_HOST`: default `127.0.0.1` (only used when running `python app/main.py` directly).
- `UVICORN_PORT`: default `8000` (only used when running `python app/main.py` directly).

## API Reference

### POST /clustering

Runs clustering algorithms over repository descriptions and names. Every valid request returns K-means. Sets of 2 to 250 repositories also return hierarchical and PCA + hierarchical results. Other responses omit those fields.

- `repositories`: 1 or more items
- `kmeans_clusters`: 1 to 20, clamped to the repository count
- `hierarchical_threshold`: greater than 0 and at most 10
- `pca_components`: 1 to 50, clamped to the repository and term frequency-inverse document frequency (TF-IDF) feature counts

<details>
<summary>Request Body</summary>

```json
{
  "repositories": [
    {
      "id": number,
      "name": string,
      "full_name": string,
      "description": string | null,
      "html_url": string,
      "stargazers_count": number,
      "forks_count": number,
      "open_issues_count": number,
      "size": number,
      "watchers_count": number,
      "language": string | null,
      "topics": string[],
      "owner": {
        "login": string,
        "avatar_url": string
      },
      "updated_at": string
    }
  ],
  "kmeans_clusters": number,
  "hierarchical_threshold": number,
  "pca_components": number
}
```

</details>

<details>
<summary>Response</summary>

```json
{
  "status": "success",
  "kmeans_clusters": {
    "algorithm": "kmeans",
    "clusters": { "0": [0, 2, 4], "1": [1, 3, 5] },
    "parameters": { "num_clusters": 2 },
    "processing_time_ms": 150.5
  },
  "hierarchical_clusters": {
    "algorithm": "hierarchical",
    "clusters": { "1": [0, 2], "2": [1, 3], "3": [4, 5] },
    "parameters": { "distance_threshold": 1.5 },
    "processing_time_ms": 200.3
  },
  "pca_hierarchical_clusters": {
    "algorithm": "pca_hierarchical",
    "clusters": { "1": [0, 2, 4], "2": [1, 3, 5] },
    "parameters": { "n_components": 6, "distance_threshold": 1.5 },
    "processing_time_ms": 180.7
  },
  "total_processing_time_ms": 531.5
}
```

The response reports effective parameter values. For one repository or more than 250 repositories, only `kmeans_clusters` is present.

</details>

### GET /health

Health check endpoint.

```json
{
  "status": "healthy",
  "timestamp": 1730000000.0,
  "clustering_service": "available"
}
```

## Development

Run from repo root:

```bash
pnpm lint
pnpm biome
pnpm typecheck
pnpm test
pnpm build
```

Backend-only (from `backend/`):

```bash
uv run ruff format
uv run ruff check
uv run pyright
uv run python -m pytest
```

Notes:

- The frontend uses the public GitHub API from the browser. If you hit rate limits, wait for the reset time and retry.

## Author

### Bjorn Melin

- GitHub: [@BjornMelin](https://github.com/BjornMelin)
- Website: [bjornmelin.io](https://bjornmelin.io)
- LinkedIn: [@bjorn-melin](https://www.linkedin.com/in/bjorn-melin/)

## How to Cite

If you use Stardex in your research or project, please cite it as follows:

```bibtex
@software{melin2024stardex,
  author = {Melin, Bjorn},
  title = {Stardex: GitHub Stars Explorer},
  year = {2025},
  publisher = {GitHub},
  url = {https://github.com/BjornMelin/stardex},
  version = {0.1.0},
  description = {Explore and cluster GitHub starred repositories using a Next.js UI and a FastAPI clustering service}
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
Built by [Bjorn Melin](https://bjornmelin.io)
</p>
