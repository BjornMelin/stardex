import numpy as np
import tensorflow as tf
from typing import List, Tuple
from ..models import GitHubRepo, ClusteredRepo

class ClusteringService:
    def __init__(self):
        self.eps = 0.2
        self.min_pts = 5

    def extract_features(self, repos: List[GitHubRepo]) -> np.ndarray:
        """Convert repositories to feature vectors."""
        features = []
        for repo in repos:
            features.append([
                repo.stargazers_count,
                repo.forks_count,
                repo.open_issues_count,
                repo.size,
                repo.watchers_count,
                len(repo.topics),
                1 if repo.language else 0
            ])
        return np.array(features, dtype=np.float32)

    def reduce_dimensions(self, features: np.ndarray) -> np.ndarray:
        """Reduce dimensionality using t-SNE like approach."""
        num_points = features.shape[0]
        
        # For very small datasets, use simpler scaling
        if num_points < 3:
            normalized = (features - np.min(features)) / (np.max(features) - np.min(features) + 1e-6)
            return normalized * 2 - 1

        # Center and scale the data
        mean = np.mean(features, axis=0)
        std = np.std(features, axis=0) + 1e-6
        normalized = (features - mean) / std

        # Calculate pairwise distances
        squared_dists = np.sum(normalized**2, axis=1)[:, np.newaxis] + \
                       np.sum(normalized**2, axis=1)[np.newaxis, :] - \
                       2 * np.dot(normalized, normalized.T)

        # Convert distances to probabilities
        sigma = 1.0
        probs = np.exp(-squared_dists / (2 * sigma**2))
        np.fill_diagonal(probs, 0)
        probs = probs / np.sum(probs, axis=1, keepdims=True)

        # Initialize low-dimensional representation
        output_dim = 2
        low_dim = np.random.normal(0, 0.0001, (num_points, output_dim))

        # Gradient descent
        learning_rate = 100
        num_iterations = min(100, max(50, int(num_points * 0.5)))

        for _ in range(num_iterations):
            # Calculate low-dimensional pairwise distances
            low_dim_dists = np.sum(low_dim**2, axis=1)[:, np.newaxis] + \
                           np.sum(low_dim**2, axis=1)[np.newaxis, :] - \
                           2 * np.dot(low_dim, low_dim.T)
            
            # Convert to probabilities
            low_dim_probs = np.exp(-low_dim_dists)
            np.fill_diagonal(low_dim_probs, 0)
            low_dim_probs = low_dim_probs / np.sum(low_dim_probs, axis=1, keepdims=True)

            # Calculate gradients
            gradients = np.dot(probs - low_dim_probs, low_dim) * learning_rate
            low_dim += gradients

        # Normalize output
        min_vals = np.min(low_dim, axis=0)
        max_vals = np.max(low_dim, axis=0)
        normalized = (low_dim - min_vals) / (max_vals - min_vals + 1e-6)

        return normalized

    def dbscan(self, points: np.ndarray) -> np.ndarray:
        """Perform DBSCAN clustering."""
        num_points = points.shape[0]
        labels = np.full(num_points, -1)
        
        # Calculate pairwise distances
        distances = np.sqrt(np.sum(points**2, axis=1)[:, np.newaxis] + 
                          np.sum(points**2, axis=1)[np.newaxis, :] - 
                          2 * np.dot(points, points.T))
        
        # Find neighbors
        neighbors = [np.where(distances[i] <= self.eps)[0] for i in range(num_points)]
        
        cluster_id = 0
        for i in range(num_points):
            if labels[i] != -1:
                continue
                
            if len(neighbors[i]) < self.min_pts:
                labels[i] = 0  # Noise
                continue
                
            cluster_id += 1
            labels[i] = cluster_id
            
            # Expand cluster
            seed_set = set(neighbors[i]) - {i}
            while seed_set:
                current = seed_set.pop()
                
                if labels[current] == 0:
                    labels[current] = cluster_id
                    
                if labels[current] != -1:
                    continue
                    
                labels[current] = cluster_id
                
                if len(neighbors[current]) >= self.min_pts:
                    seed_set.update(neighbors[current])
        
        return labels

    def cluster_repositories(self, repos: List[GitHubRepo]) -> List[ClusteredRepo]:
        """Main clustering function."""
        # Extract features
        features = self.extract_features(repos)
        
        # Reduce dimensions and cluster
        try:
            reduced = self.reduce_dimensions(features)
            labels = self.dbscan(reduced)
            
            # Create clustered repositories
            clustered_repos = []
            for i, repo in enumerate(repos):
                clustered_repos.append(ClusteredRepo(
                    repo=repo,
                    cluster_id=int(labels[i]),
                    coordinates=(float(reduced[i, 0]), float(reduced[i, 1]))
                ))
            
            return clustered_repos
            
        except Exception as e:
            print(f"Error in clustering: {e}")
            # Fallback to simple 2D projection
            normalized = (features - np.min(features)) / (np.max(features) - np.min(features) + 1e-6)
            coords = normalized[:, :2]
            
            return [
                ClusteredRepo(
                    repo=repo,
                    cluster_id=0,
                    coordinates=(float(coords[i, 0]), float(coords[i, 1]))
                )
                for i, repo in enumerate(repos)
            ]