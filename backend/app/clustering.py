from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from scipy.cluster.hierarchy import linkage, fcluster
from typing import List, Dict


# Example function for K-Means clustering
def perform_kmeans(data: List[str], num_clusters: int) -> Dict[int, List[int]]:
    """
    Perform K-Means clustering.

    Args:
        data (List[str]): List of text descriptions for repositories.
        num_clusters (int): Number of clusters to create.

    Returns:
        Dict[int, List[int]]: Dictionary mapping cluster IDs to indices of data points.
    """
    # Vectorize text data
    from sklearn.feature_extraction.text import TfidfVectorizer

    vectorizer = TfidfVectorizer(stop_words="english")
    X = vectorizer.fit_transform(data)

    # Apply K-Means
    kmeans = KMeans(n_clusters=num_clusters, random_state=42)
    labels = kmeans.fit_predict(X)

    # Organize clusters
    clusters = {}
    for idx, label in enumerate(labels):
        clusters.setdefault(label, []).append(idx)

    return clusters


# Example function for hierarchical clustering
def perform_hierarchical(
    data: List[str], distance_threshold: float = 1.5
) -> Dict[int, List[int]]:
    """
    Perform hierarchical clustering.

    Args:
        data (List[str]): List of text descriptions for repositories.
        distance_threshold (float): Threshold for cutting the dendrogram.

    Returns:
        Dict[int, List[int]]: Dictionary mapping cluster IDs to indices of data points.
    """
    # Vectorize text data
    from sklearn.feature_extraction.text import TfidfVectorizer

    vectorizer = TfidfVectorizer(stop_words="english")
    X = vectorizer.fit_transform(data).toarray()

    # Perform hierarchical clustering
    Z = linkage(X, method="ward")
    labels = fcluster(Z, t=distance_threshold, criterion="distance")

    # Organize clusters
    clusters = {}
    for idx, label in enumerate(labels):
        clusters.setdefault(label, []).append(idx)

    return clusters


# Example function for PCA + hierarchical clustering
def perform_pca_hierarchical(
    data: List[str], n_components: int = 10, distance_threshold: float = 1.5
) -> Dict[int, List[int]]:
    """
    Perform PCA followed by hierarchical clustering.

    Args:
        data (List[str]): List of text descriptions for repositories.
        n_components (int): Number of dimensions to reduce to with PCA.
        distance_threshold (float): Threshold for cutting the dendrogram.

    Returns:
        Dict[int, List[int]]: Dictionary mapping cluster IDs to indices of data points.
    """
    # Vectorize text data
    from sklearn.feature_extraction.text import TfidfVectorizer

    vectorizer = TfidfVectorizer(stop_words="english")
    X = vectorizer.fit_transform(data).toarray()

    # Reduce dimensions with PCA
    pca = PCA(n_components=n_components)
    X_reduced = pca.fit_transform(X)

    # Perform hierarchical clustering
    Z = linkage(X_reduced, method="ward")
    labels = fcluster(Z, t=distance_threshold, criterion="distance")

    # Organize clusters
    clusters = {}
    for idx, label in enumerate(labels):
        clusters.setdefault(label, []).append(idx)

    return clusters
