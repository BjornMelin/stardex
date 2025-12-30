"""Clustering algorithms for repository analysis."""

from scipy.cluster.hierarchy import fcluster, linkage
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.feature_extraction.text import TfidfVectorizer

from app.errors import (
    EmptyDescriptionsError,
    InvalidNumClustersError,
    InvalidPcaComponentsError,
    TooFewRepositoriesError,
)


def _validate_inputs(data: list[str]) -> None:
    if len(data) < 2:
        raise TooFewRepositoriesError

    if not any(text.strip() for text in data):
        raise EmptyDescriptionsError


def perform_kmeans(data: list[str], num_clusters: int) -> dict[int, list[int]]:
    """Perform K-Means clustering.

    Args:
        data: List of text descriptions for repositories.
        num_clusters: Number of clusters to create.

    Returns:
        Dictionary mapping cluster IDs to indices of data points.
    """
    _validate_inputs(data)
    if num_clusters > len(data):
        raise InvalidNumClustersError

    vectorizer = TfidfVectorizer(stop_words="english")
    features = vectorizer.fit_transform(data)

    kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init="auto")
    labels = kmeans.fit_predict(features)

    clusters: dict[int, list[int]] = {}
    for idx, label in enumerate(labels):
        clusters.setdefault(label, []).append(idx)

    return clusters


def perform_hierarchical(
    data: list[str], distance_threshold: float = 1.5
) -> dict[int, list[int]]:
    """Perform hierarchical clustering.

    Args:
        data: List of text descriptions for repositories.
        distance_threshold: Threshold for cutting the dendrogram.

    Returns:
        Dictionary mapping cluster IDs to indices of data points.
    """
    _validate_inputs(data)

    vectorizer = TfidfVectorizer(stop_words="english")
    dense_features = vectorizer.fit_transform(data).toarray()  # type: ignore[union-attr]

    linkage_matrix = linkage(dense_features, method="ward")
    labels = fcluster(linkage_matrix, t=distance_threshold, criterion="distance")

    clusters: dict[int, list[int]] = {}
    for idx, label in enumerate(labels):
        clusters.setdefault(label, []).append(idx)

    return clusters


def perform_pca_hierarchical(
    data: list[str], n_components: int = 10, distance_threshold: float = 1.5
) -> dict[int, list[int]]:
    """Perform PCA followed by hierarchical clustering.

    Args:
        data: List of text descriptions for repositories.
        n_components: Number of dimensions to reduce to with PCA.
        distance_threshold: Threshold for cutting the dendrogram.

    Returns:
        Dictionary mapping cluster IDs to indices of data points.
    """
    _validate_inputs(data)
    if n_components > len(data):
        raise InvalidPcaComponentsError

    vectorizer = TfidfVectorizer(stop_words="english")
    dense_features = vectorizer.fit_transform(data).toarray()  # type: ignore[union-attr]

    pca = PCA(n_components=n_components)
    reduced_features = pca.fit_transform(dense_features)

    linkage_matrix = linkage(reduced_features, method="ward")
    labels = fcluster(linkage_matrix, t=distance_threshold, criterion="distance")

    clusters: dict[int, list[int]] = {}
    for idx, label in enumerate(labels):
        clusters.setdefault(label, []).append(idx)

    return clusters
