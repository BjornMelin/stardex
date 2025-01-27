from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from scipy.cluster.hierarchy import linkage, fcluster
from typing import List, Dict, Optional


def combine_text_data(descriptions: List[str], readmes: Optional[List[str]] = None) -> List[str]:
    """
    Combine repository descriptions with their README content.

    Args:
        descriptions (List[str]): List of repository descriptions
        readmes (Optional[List[str]]): List of README contents, if available

    Returns:
        List[str]: Combined text data for each repository
    """
    if not readmes:
        return descriptions
    
    assert len(descriptions) == len(readmes), "Number of descriptions must match number of READMEs"
    
    # Combine description and README content for each repository
    combined_data = []
    for desc, readme in zip(descriptions, readmes):
        # Use description as primary text, append README content if available
        if readme and readme.strip():
            combined_text = f"{desc}\n\n{readme}"
        else:
            combined_text = desc
        combined_data.append(combined_text)
    
    return combined_data


# Example function for K-Means clustering
def perform_kmeans(
    data: List[str],
    num_clusters: int,
    readmes: Optional[List[str]] = None
) -> Dict[int, List[int]]:
    """
    Perform K-Means clustering.

    Args:
        data (List[str]): List of text descriptions for repositories.
        num_clusters (int): Number of clusters to create.
        readmes (Optional[List[str]]): List of README contents for repositories.

    Returns:
        Dict[int, List[int]]: Dictionary mapping cluster IDs to indices of data points.
    """
    # Combine description and README data
    combined_data = combine_text_data(data, readmes)

    # Vectorize text data
    from sklearn.feature_extraction.text import TfidfVectorizer

    vectorizer = TfidfVectorizer(stop_words="english")
    X = vectorizer.fit_transform(combined_data)

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
    data: List[str],
    distance_threshold: float = 1.5,
    readmes: Optional[List[str]] = None
) -> Dict[int, List[int]]:
    """
    Perform hierarchical clustering.

    Args:
        data (List[str]): List of text descriptions for repositories.
        distance_threshold (float): Threshold for cutting the dendrogram.
        readmes (Optional[List[str]]): List of README contents for repositories.

    Returns:
        Dict[int, List[int]]: Dictionary mapping cluster IDs to indices of data points.
    """
    # Combine description and README data
    combined_data = combine_text_data(data, readmes)

    # Vectorize text data
    from sklearn.feature_extraction.text import TfidfVectorizer

    vectorizer = TfidfVectorizer(stop_words="english")
    X = vectorizer.fit_transform(combined_data).toarray()

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
    data: List[str],
    n_components: int = 10,
    distance_threshold: float = 1.5,
    readmes: Optional[List[str]] = None
) -> Dict[int, List[int]]:
    """
    Perform PCA followed by hierarchical clustering.

    Args:
        data (List[str]): List of text descriptions for repositories.
        n_components (int): Number of dimensions to reduce to with PCA.
        distance_threshold (float): Threshold for cutting the dendrogram.
        readmes (Optional[List[str]]): List of README contents for repositories.

    Returns:
        Dict[int, List[int]]: Dictionary mapping cluster IDs to indices of data points.
    """
    # Combine description and README data
    combined_data = combine_text_data(data, readmes)

    # Vectorize text data
    from sklearn.feature_extraction.text import TfidfVectorizer

    vectorizer = TfidfVectorizer(stop_words="english")
    X = vectorizer.fit_transform(combined_data).toarray()

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
