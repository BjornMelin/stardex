import numpy as np
import tensorflow as tf
from typing import List, Tuple, Dict, Optional
from sklearn.preprocessing import StandardScaler
from ..models import GitHubRepo, ClusteredRepo

class ClusteringService:
    """Service for clustering GitHub repositories using TensorFlow."""
    
    def __init__(self, n_clusters: int = 5, min_samples: int = 3):
        """
        Initialize the clustering service.
        
        Args:
            n_clusters: Number of clusters for K-means (default: 5)
            min_samples: Minimum samples for considering a valid cluster (default: 3)
        """
        self.n_clusters = n_clusters
        self.min_samples = min_samples
        self.scaler = StandardScaler()
        
    def _validate_input(self, repos: List[GitHubRepo]) -> None:
        """
        Validate input repositories.
        
        Args:
            repos: List of repositories to validate
            
        Raises:
            ValueError: If input validation fails
        """
        if not repos:
            raise ValueError("No repositories provided")
        if len(repos) < self.min_samples:
            raise ValueError(f"At least {self.min_samples} repositories are required")

    def extract_features(self, repos: List[GitHubRepo]) -> np.ndarray:
        """
        Convert repositories to feature vectors using advanced metrics.
        
        Args:
            repos: List of repositories to extract features from
            
        Returns:
            numpy.ndarray: Feature matrix
        """
        features = []
        for repo in repos:
            # Calculate derived metrics
            activity_score = np.log1p(
                repo.stargazers_count + 
                repo.forks_count * 2 + 
                repo.watchers_count
            )
            
            issue_ratio = (repo.open_issues_count / (repo.stargazers_count + 1)
                          if repo.stargazers_count > 0 else 0)
            
            # Combine features with weights
            feature_vector = [
                np.log1p(repo.stargazers_count),  # Log-transform stars
                np.log1p(repo.forks_count),       # Log-transform forks
                issue_ratio,                      # Issue engagement metric
                np.log1p(repo.size),             # Log-transform size
                activity_score,                   # Combined activity metric
                len(repo.topics) / 10,           # Normalized topic count
                1 if repo.language else 0         # Has primary language
            ]
            features.append(feature_vector)
            
        feature_matrix = np.array(features, dtype=np.float32)
        return self.scaler.fit_transform(feature_matrix)

    @tf.function
    def kmeans_clustering(self, features: tf.Tensor) -> Tuple[tf.Tensor, tf.Tensor]:
        """
        Perform K-means clustering using TensorFlow.
        
        Args:
            features: Feature tensor to cluster
            
        Returns:
            Tuple containing cluster assignments and centroids
        """
        # Initialize centroids using k-means++ method
        num_points = tf.shape(features)[0]
        centroid_ids = tf.random.shuffle(tf.range(num_points))[:self.n_clusters]
        centroids = tf.gather(features, centroid_ids)
        
        # Optimize clusters
        for _ in tf.range(100):  # Max iterations
            # Calculate distances to centroids
            distances = tf.reduce_sum(
                tf.square(tf.expand_dims(features, 1) - tf.expand_dims(centroids, 0)),
                axis=2
            )
            
            # Assign points to nearest centroid
            assignments = tf.argmin(distances, axis=1)
            
            # Update centroids
            new_centroids = tf.zeros_like(centroids)
            for i in tf.range(self.n_clusters):
                mask = tf.cast(tf.equal(assignments, i), tf.float32)
                cluster_sum = tf.reduce_sum(
                    tf.multiply(tf.expand_dims(mask, 1), features),
                    axis=0
                )
                count = tf.reduce_sum(mask) + 1e-6  # Avoid division by zero
                new_centroids = tf.tensor_scatter_nd_update(
                    new_centroids,
                    [[i]],
                    [cluster_sum / count]
                )
            
            # Check convergence
            if tf.reduce_all(tf.abs(new_centroids - centroids) < 1e-6):
                break
                
            centroids = new_centroids
            
        return assignments, centroids

    def reduce_dimensions(self, features: np.ndarray) -> np.ndarray:
        """
        Reduce dimensionality for visualization using PCA-inspired approach.
        
        Args:
            features: Feature matrix to reduce
            
        Returns:
            numpy.ndarray: Reduced 2D coordinates
        """
        # Center the data
        centered = features - np.mean(features, axis=0)
        
        # Calculate covariance matrix
        cov = np.cov(centered.T)
        
        # Get eigenvalues and eigenvectors
        eigenvals, eigenvecs = np.linalg.eigh(cov)
        
        # Sort by eigenvalues in descending order
        idx = np.argsort(eigenvals)[::-1]
        eigenvecs = eigenvecs[:, idx]
        
        # Project onto first two principal components
        reduced = np.dot(centered, eigenvecs[:, :2])
        
        # Normalize to [-1, 1] range
        min_vals = np.min(reduced, axis=0)
        max_vals = np.max(reduced, axis=0)
        normalized = (reduced - min_vals) / (max_vals - min_vals + 1e-6) * 2 - 1
        
        return normalized

    def cluster_repositories(self, repos: List[GitHubRepo]) -> List[ClusteredRepo]:
        """
        Main clustering function that processes repositories and returns clustered results.
        
        Args:
            repos: List of repositories to cluster
            
        Returns:
            List[ClusteredRepo]: Clustered repositories with visualization coordinates
            
        Raises:
            ValueError: If input validation fails
        """
        try:
            # Validate input
            self._validate_input(repos)
            
            # Extract and preprocess features
            features = self.extract_features(repos)
            
            # Convert to TensorFlow tensor
            tf_features = tf.convert_to_tensor(features, dtype=tf.float32)
            
            # Perform clustering
            labels, centroids = self.kmeans_clustering(tf_features)
            labels = labels.numpy()
            
            # Reduce dimensions for visualization
            coordinates = self.reduce_dimensions(features)
            
            # Create response
            clustered_repos = []
            for i, repo in enumerate(repos):
                clustered_repos.append(ClusteredRepo(
                    repo=repo,
                    cluster_id=int(labels[i]),
                    coordinates=(float(coordinates[i, 0]), float(coordinates[i, 1]))
                ))
            
            return clustered_repos
            
        except Exception as e:
            raise ValueError(f"Clustering failed: {str(e)}")