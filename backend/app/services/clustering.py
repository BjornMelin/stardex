import numpy as np
import tensorflow as tf
from typing import List, Dict
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN, AgglomerativeClustering
from sklearn.feature_extraction.text import TfidfVectorizer
from ..models import GitHubRepo, Cluster, ClusteringResponse

class ClusteringService:
    """Service for clustering GitHub repositories."""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.tfidf = TfidfVectorizer(stop_words='english')
        
    def _validate_input(self, repos: List[GitHubRepo]) -> None:
        if not repos:
            raise ValueError("No repositories provided")
        if len(repos) < 2:
            raise ValueError("At least 2 repositories are required")

    def extract_features(self, repos: List[GitHubRepo], features_to_use: List[str]) -> np.ndarray:
        """Extract features based on user selection."""
        feature_vectors = []
        
        for repo in repos:
            features = []
            
            if "metrics" in features_to_use:
                # Numerical metrics
                metrics = [
                    np.log1p(repo.stargazers_count),
                    np.log1p(repo.forks_count),
                    np.log1p(repo.size),
                    np.log1p(repo.watchers_count),
                    repo.open_issues_count / (repo.stargazers_count + 1)
                ]
                features.extend(metrics)
            
            if "language" in features_to_use and repo.language:
                # One-hot encode language
                features.append(1.0)
            else:
                features.append(0.0)
                
            if "topics" in features_to_use:
                # Topic count
                features.append(len(repo.topics) / 10.0)
            
            feature_vectors.append(features)
        
        # Convert to numpy array
        feature_matrix = np.array(feature_vectors, dtype=np.float32)
        
        if "description" in features_to_use:
            # Add TF-IDF features for descriptions
            descriptions = [repo.description or "" for repo in repos]
            tfidf_matrix = self.tfidf.fit_transform(descriptions).toarray()
            feature_matrix = np.hstack([feature_matrix, tfidf_matrix])
        
        return self.scaler.fit_transform(feature_matrix)

    def kmeans_clustering(self, features: np.ndarray, n_clusters: int = 5) -> np.ndarray:
        """
        Perform K-means clustering using TensorFlow, enforcing int64 consistency.
        """
        # Convert all shapes and parameters to int64
        features_tensor = tf.convert_to_tensor(features, dtype=tf.float32)
        num_points = tf.cast(tf.shape(features_tensor)[0], tf.int64)
        num_clusters = tf.cast(n_clusters, tf.int64)
        num_clusters = tf.minimum(num_clusters, num_points - 1)
        
        # Initialize centroids using k-means++
        first_idx = tf.random.uniform([], 0, num_points, dtype=tf.int64)
        first_centroid = tf.gather(features_tensor, first_idx)
        centroids = tf.expand_dims(first_centroid, 0)
        
        # Choose remaining centroids
        for _ in tf.range(num_clusters - 1, dtype=tf.int64):
            distances = tf.reduce_min(
                tf.reduce_sum(
                    tf.square(tf.expand_dims(features_tensor, 1) - tf.expand_dims(centroids, 0)),
                    axis=2
                ),
                axis=1
            )
            probs = distances / tf.reduce_sum(distances)
            next_centroid_idx = tf.cast(tf.random.categorical(tf.math.log([probs]), 1)[0, 0], tf.int64)
            next_centroid = tf.gather(features_tensor, next_centroid_idx)
            centroids = tf.concat([centroids, tf.expand_dims(next_centroid, 0)], axis=0)
        
        # Optimize clusters
        for _ in range(100):
            distances = tf.reduce_sum(
                tf.square(tf.expand_dims(features_tensor, 1) - tf.expand_dims(centroids, 0)),
                axis=2
            )
            assignments = tf.argmin(distances, axis=1, output_type=tf.int64)
            
            new_centroids = tf.zeros_like(centroids)
            for i in tf.range(num_clusters, dtype=tf.int64):
                mask = tf.cast(tf.equal(assignments, i), tf.float32)
                masked_sum = tf.reduce_sum(
                    tf.expand_dims(mask, 1) * features_tensor,
                    axis=0
                )
                count = tf.maximum(tf.reduce_sum(mask), 1.0)
                new_centroids = tf.tensor_scatter_nd_update(
                    new_centroids,
                    [[i]],
                    [masked_sum / count]
                )
            
            if tf.reduce_all(tf.abs(new_centroids - centroids) < 1e-6):
                break
            centroids = new_centroids
            
        # Cast back to int32 for external usage
        return tf.cast(assignments, tf.int32).numpy()

    def dbscan_clustering(self, features: np.ndarray, eps: float = 0.5, min_samples: int = 5) -> np.ndarray:
        """Perform DBSCAN clustering."""
        dbscan = DBSCAN(eps=eps, min_samples=min_samples)
        return dbscan.fit_predict(features)

    def hierarchical_clustering(self, features: np.ndarray, n_clusters: int = 5) -> np.ndarray:
        """Perform hierarchical clustering."""
        clustering = AgglomerativeClustering(n_clusters=n_clusters)
        return clustering.fit_predict(features)

    def reduce_dimensions(self, features: np.ndarray) -> np.ndarray:
        """Reduce dimensionality for visualization using TensorFlow SVD."""
        features_tensor = tf.convert_to_tensor(features, dtype=tf.float32)
        s, u, _ = tf.linalg.svd(features_tensor)
        reduced = tf.matmul(u[:, :2], tf.linalg.diag(s[:2]))
        reduced = reduced.numpy()
        
        # Normalize to [-1, 1] range
        min_vals = np.min(reduced, axis=0)
        max_vals = np.max(reduced, axis=0)
        return (reduced - min_vals) / (max_vals - min_vals + 1e-6) * 2 - 1

    def get_cluster_label(self, repos: List[GitHubRepo]) -> str:
        """Generate a label for a cluster based on common characteristics."""
        languages = [repo.language for repo in repos if repo.language]
        topics = [topic for repo in repos for topic in repo.topics]
        
        if languages and max(languages.count(lang) for lang in set(languages)) >= len(repos) / 2:
            # If majority uses same language
            most_common = max(set(languages), key=languages.count)
            return f"{most_common} Projects"
        elif topics:
            # Most common topic
            most_common = max(set(topics), key=topics.count)
            return most_common.title()
        else:
            return "Misc Projects"

    def cluster_repositories(
        self,
        repos: List[GitHubRepo],
        algorithm: str = "kmeans",
        params: Dict = {},
        features_to_use: List[str] = ["description", "topics", "language", "metrics"]
    ) -> ClusteringResponse:
        """Main clustering function."""
        try:
            start_time = tf.timestamp()
            
            # Validate input
            self._validate_input(repos)
            
            # Extract features
            features = self.extract_features(repos, features_to_use)
            
            # Perform clustering
            if algorithm == "kmeans":
                n_clusters = params.get("n_clusters", 5)
                labels = self.kmeans_clustering(features, n_clusters)
            elif algorithm == "dbscan":
                eps = params.get("eps", 0.5)
                min_samples = params.get("min_samples", 5)
                labels = self.dbscan_clustering(features, eps, min_samples)
            elif algorithm == "hierarchical":
                n_clusters = params.get("n_clusters", 5)
                labels = self.hierarchical_clustering(features, n_clusters)
            else:
                raise ValueError(f"Unknown algorithm: {algorithm}")
            
            # Get visualization coordinates
            coordinates = self.reduce_dimensions(features)
            
            # Group repositories by cluster
            clusters_dict = {}
            for i, repo in enumerate(repos):
                cluster_id = int(labels[i])
                if cluster_id not in clusters_dict:
                    clusters_dict[cluster_id] = []
                clusters_dict[cluster_id].append(repo)
            
            # Create cluster objects
            clusters = []
            for cluster_id, cluster_repos in clusters_dict.items():
                # Skip noise points from DBSCAN
                if cluster_id != -1:
                    cluster_coords = coordinates[labels == cluster_id]
                    clusters.append(Cluster(
                        id=cluster_id,
                        label=self.get_cluster_label(cluster_repos),
                        repositories=cluster_repos,
                        coordinates=(
                            float(np.mean(cluster_coords[:, 0])),
                            float(np.mean(cluster_coords[:, 1]))
                        )
                    ))
            
            processing_time = (tf.timestamp() - start_time).numpy() * 1000.0  # Convert to ms
            
            return ClusteringResponse(
                status="success",
                clusters=clusters,
                processing_time_ms=float(processing_time),
                error_message=None
            )
            
        except Exception as e:
            return ClusteringResponse(
                status="error",
                clusters=None,
                processing_time_ms=None,
                error_message=str(e)
            )