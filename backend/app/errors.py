class ClusteringInputError(ValueError):
    """Base error for invalid clustering input."""


class TooFewRepositoriesError(ClusteringInputError):
    """Raised when fewer than 2 repositories are provided."""

    def __init__(self) -> None:
        super().__init__("At least 2 repositories are required for clustering")


class EmptyDescriptionsError(ClusteringInputError):
    """Raised when all repository descriptions are empty."""

    def __init__(self) -> None:
        super().__init__("Repository descriptions must not be all empty")


class InvalidNumClustersError(ClusteringInputError):
    """Raised when requested K-means clusters exceed repository count."""

    def __init__(self) -> None:
        super().__init__("num_clusters must be <= number of repositories")


class InvalidPcaComponentsError(ClusteringInputError):
    """Raised when requested PCA components exceed repository count."""

    def __init__(self) -> None:
        super().__init__("n_components must be <= number of repositories")


class InvalidClusteringParametersError(ClusteringInputError):
    """Raised when request parameters are inconsistent with input size."""

    def __init__(self, param_name: str) -> None:
        super().__init__(f"{param_name} must be <= number of repositories")
