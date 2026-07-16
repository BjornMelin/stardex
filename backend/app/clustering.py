"""Clustering algorithms for repository analysis."""

from scipy.cluster.hierarchy import fcluster, linkage
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.feature_extraction.text import TfidfVectorizer


DENSE_TFIDF_MAX_FEATURES = 10_000


def _validate_inputs(data: list[str]) -> None:
    if not data:
        message = "At least 1 repository is required for clustering"
        raise ValueError(message)

    if not any(text.strip() for text in data):
        message = "Repository descriptions must not be all empty"
        raise ValueError(message)


def _validate_dense_inputs(data: list[str]) -> None:
    _validate_inputs(data)
    if len(data) < 2:
        message = "At least 2 repositories are required for hierarchical clustering"
        raise ValueError(message)


def _select_vectorizer(
    data: list[str], max_features: int | None = None
) -> TfidfVectorizer:
    """Use word features when available and character features as a fallback."""
    vectorizer = TfidfVectorizer(stop_words="english", max_features=max_features)
    analyze = vectorizer.build_analyzer()
    if any(analyze(text) for text in data):
        return vectorizer

    return TfidfVectorizer(
        analyzer="char_wb", ngram_range=(2, 5), max_features=max_features
    )


def perform_kmeans(
    data: list[str], num_clusters: int
) -> tuple[dict[int, list[int]], int]:
    """Perform K-Means clustering.

    Args:
        data: List of text descriptions for repositories.
        num_clusters: Number of clusters to create.

    Returns:
        Cluster mapping and the effective number of clusters.

    Raises:
        ValueError: If repository descriptions are missing or all blank.
    """
    _validate_inputs(data)
    effective_num_clusters = min(num_clusters, len(data))

    if len(data) == 1:
        return {0: [0]}, effective_num_clusters

    vectorizer = _select_vectorizer(data)
    features = vectorizer.fit_transform(data)

    kmeans = KMeans(n_clusters=effective_num_clusters, random_state=42, n_init="auto")
    labels = kmeans.fit_predict(features)

    clusters: dict[int, list[int]] = {}
    for idx, label in enumerate(labels):
        clusters.setdefault(label, []).append(idx)

    return clusters, effective_num_clusters


def perform_hierarchical(
    data: list[str], distance_threshold: float = 1.5
) -> dict[int, list[int]]:
    """Perform hierarchical clustering.

    Args:
        data: List of text descriptions for repositories.
        distance_threshold: Threshold for cutting the dendrogram.

    Returns:
        Dictionary mapping cluster IDs to indices of data points.

    Raises:
        ValueError: If fewer than two descriptions are provided or all are blank.
    """
    _validate_dense_inputs(data)

    vectorizer = _select_vectorizer(data, max_features=DENSE_TFIDF_MAX_FEATURES)
    dense_features = vectorizer.fit_transform(data).toarray()  # type: ignore[union-attr]

    linkage_matrix = linkage(dense_features, method="ward")
    labels = fcluster(linkage_matrix, t=distance_threshold, criterion="distance")

    clusters: dict[int, list[int]] = {}
    for idx, label in enumerate(labels):
        clusters.setdefault(label, []).append(idx)

    return clusters


def perform_pca_hierarchical(
    data: list[str], n_components: int = 10, distance_threshold: float = 1.5
) -> tuple[dict[int, list[int]], int]:
    """Perform PCA followed by hierarchical clustering.

    Args:
        data: List of text descriptions for repositories.
        n_components: Number of dimensions to reduce to with PCA.
        distance_threshold: Threshold for cutting the dendrogram.

    Returns:
        Cluster mapping and the effective number of PCA components.

    Raises:
        ValueError: If fewer than two descriptions are provided or all are blank.
    """
    _validate_dense_inputs(data)

    vectorizer = _select_vectorizer(data, max_features=DENSE_TFIDF_MAX_FEATURES)
    dense_features = vectorizer.fit_transform(data).toarray()  # type: ignore[union-attr]

    effective_components = min(n_components, len(data), dense_features.shape[1])

    pca = PCA(n_components=effective_components, random_state=42)
    reduced_features = pca.fit_transform(dense_features)

    linkage_matrix = linkage(reduced_features, method="ward")
    labels = fcluster(linkage_matrix, t=distance_threshold, criterion="distance")

    clusters: dict[int, list[int]] = {}
    for idx, label in enumerate(labels):
        clusters.setdefault(label, []).append(idx)

    return clusters, effective_components
