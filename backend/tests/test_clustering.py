from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app import clustering
from app.clustering import DENSE_TFIDF_MAX_FEATURES, perform_pca_hierarchical
from app.main import app
from app.models import (
    MAX_CLUSTERING_REPOSITORIES,
    MAX_CLUSTERING_REQUEST_BYTES,
    ClusteringRequest,
)


RESULT_FIELDS = frozenset(
    {
        "kmeans_clusters",
        "hierarchical_clusters",
        "pca_hierarchical_clusters",
    }
)
KMEANS_ONLY = frozenset({"kmeans_clusters"})


def make_repository(index: int, description: str | None = None) -> dict[str, object]:
    """Build a deterministic GitHub repository payload."""
    return {
        "id": index + 1,
        "name": f"repo-{index}",
        "full_name": f"owner/repo-{index}",
        "description": description or f"python project topic{index}",
        "html_url": f"https://github.com/owner/repo-{index}",
        "stargazers_count": index,
        "forks_count": 0,
        "open_issues_count": 0,
        "size": 1,
        "watchers_count": 0,
        "language": "Python",
        "topics": [f"topic{index}"],
        "owner": {
            "login": "owner",
            "avatar_url": "https://example.com/avatar.png",
        },
        "updated_at": "2026-01-01T00:00:00Z",
    }


def make_repositories(count: int) -> list[dict[str, object]]:
    """Build a deterministic repository collection."""
    return [make_repository(index) for index in range(count)]


def assert_partition(result: object, count: int) -> None:
    """Assert that a cluster result contains each input index exactly once."""
    assert isinstance(result, dict)
    clusters = result.get("clusters")
    assert isinstance(clusters, dict)

    members: list[int] = []
    for indices in clusters.values():
        assert isinstance(indices, list)
        for index in indices:
            assert isinstance(index, int)
            members.append(index)

    assert len(members) == len(set(members))
    assert sorted(members) == list(range(count))


def result_parameters(payload: dict[str, object], field: str) -> dict[str, object]:
    """Return parameters from one serialized cluster result."""
    result = payload[field]
    assert isinstance(result, dict)
    parameters = result.get("parameters")
    assert isinstance(parameters, dict)
    return parameters


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.mark.parametrize(
    ("count", "expected_results", "expected_kmeans", "expected_pca"),
    [
        (1, KMEANS_ONLY, 1, None),
        (2, RESULT_FIELDS, 2, 2),
        (4, RESULT_FIELDS, 4, 4),
        (5, RESULT_FIELDS, 5, 5),
        (9, RESULT_FIELDS, 5, 9),
        (10, RESULT_FIELDS, 5, 10),
        (250, RESULT_FIELDS, 5, 10),
        (251, KMEANS_ONLY, 5, None),
    ],
)
def test_clustering_cardinality_contract(
    client: TestClient,
    count: int,
    expected_results: frozenset[str],
    expected_kmeans: int,
    expected_pca: int | None,
) -> None:
    response = client.post(
        "/clustering", json={"repositories": make_repositories(count)}
    )

    assert response.status_code == 200
    payload: dict[str, object] = response.json()
    assert payload["status"] == "success"
    assert RESULT_FIELDS.intersection(payload) == expected_results
    assert "error_message" not in payload

    for field in expected_results:
        assert_partition(payload[field], count)

    assert (
        result_parameters(payload, "kmeans_clusters")["num_clusters"] == expected_kmeans
    )
    if expected_pca is not None:
        assert (
            result_parameters(payload, "pca_hierarchical_clusters")["n_components"]
            == expected_pca
        )


@pytest.mark.parametrize("count", [251, MAX_CLUSTERING_REPOSITORIES])
def test_request_model_accepts_supported_large_repository_sets(count: int) -> None:
    request = ClusteringRequest.model_validate(
        {"repositories": make_repositories(count)}
    )

    assert len(request.repositories) == count


def test_request_rejects_repository_sets_above_limit(client: TestClient) -> None:
    repositories = make_repositories(MAX_CLUSTERING_REPOSITORIES + 1)
    repositories[0]["name"] = "must-not-be-reflected"

    response = client.post(
        "/clustering",
        json={"repositories": repositories},
    )

    assert response.status_code == 422
    payload: dict[str, object] = response.json()
    assert payload["status"] == "error"
    assert RESULT_FIELDS.isdisjoint(payload)
    assert "body.repositories" in str(payload["error_message"])
    assert "at most 1000 items" in str(payload["error_message"])
    assert "must-not-be-reflected" not in response.text
    assert len(response.content) < 2_048


@pytest.mark.parametrize("nested", [False, True])
def test_request_validation_never_reflects_extra_field_names(
    client: TestClient, nested: bool
) -> None:
    sentinel = "attacker-controlled-field-name"
    request: dict[str, object] = {"repositories": make_repositories(1)}
    if nested:
        repository = request["repositories"]
        assert isinstance(repository, list)
        assert isinstance(repository[0], dict)
        repository[0][sentinel] = True
    else:
        request[sentinel] = True

    response = client.post("/clustering", json=request)

    assert response.status_code == 422
    assert sentinel not in response.text
    assert len(response.content) < 2_048


def test_request_rejects_declared_body_above_byte_limit(client: TestClient) -> None:
    response = client.post(
        "/clustering",
        content=b"{}",
        headers={
            "Content-Type": "application/json",
            "Content-Length": str(MAX_CLUSTERING_REQUEST_BYTES + 1),
        },
    )

    assert response.status_code == 413
    assert response.json() == {
        "status": "error",
        "error_message": (
            "Request body exceeds the configured transport limits (16 MiB maximum)"
        ),
        "total_processing_time_ms": 0,
    }


def test_request_rejects_body_above_byte_limit_without_content_length(
    client: TestClient,
) -> None:
    chunk = b"x" * (1024 * 1024)

    response = client.post(
        "/clustering",
        content=(chunk for _ in range(17)),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 413
    assert response.json()["status"] == "error"


@pytest.mark.parametrize(
    "topics",
    [
        ["topic"] * 21,
        ["x" * 51],
    ],
)
def test_request_rejects_topics_outside_github_limits(
    client: TestClient, topics: list[str]
) -> None:
    repositories = make_repositories(1)
    repositories[0]["topics"] = topics

    response = client.post("/clustering", json={"repositories": repositories})

    assert response.status_code == 422
    assert response.json()["status"] == "error"


@pytest.mark.parametrize(
    "override",
    [
        {"repositories": []},
        {"kmeans_clusters": 0},
        {"pca_components": 0},
    ],
)
def test_request_validation_preserves_scalar_lower_bounds(
    client: TestClient, override: dict[str, object]
) -> None:
    payload: dict[str, object] = {"repositories": make_repositories(1)}
    payload.update(override)

    response = client.post("/clustering", json=payload)

    assert response.status_code == 422
    body: dict[str, object] = response.json()
    assert body["status"] == "error"
    assert isinstance(body["error_message"], str)
    assert RESULT_FIELDS.isdisjoint(body)


def test_large_request_never_calls_dense_algorithms(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fail_if_called(*_args: object, **_kwargs: object) -> None:
        pytest.fail("dense clustering must not run above 250 repositories")

    monkeypatch.setattr("app.main.perform_hierarchical", fail_if_called)
    monkeypatch.setattr("app.main.perform_pca_hierarchical", fail_if_called)

    response = client.post("/clustering", json={"repositories": make_repositories(251)})

    assert response.status_code == 200
    payload: dict[str, object] = response.json()
    assert RESULT_FIELDS.intersection(payload) == KMEANS_ONLY
    assert_partition(payload["kmeans_clusters"], 251)


def test_pca_components_clamp_to_feature_count() -> None:
    descriptions = [
        "python python data" if index % 2 else "python data data" for index in range(10)
    ]

    clusters, effective_components = perform_pca_hierarchical(
        descriptions, n_components=10
    )

    assert effective_components == 2
    assert_partition({"clusters": clusters}, len(descriptions))


def test_dense_algorithms_cap_tfidf_features(monkeypatch: pytest.MonkeyPatch) -> None:
    observed_limits: list[int | None] = []
    select_vectorizer = clustering._select_vectorizer  # noqa: SLF001

    def tracked_vectorizer(data: list[str], max_features: int | None = None) -> object:
        observed_limits.append(max_features)
        return select_vectorizer(data, max_features=max_features)

    monkeypatch.setattr(clustering, "_select_vectorizer", tracked_vectorizer)
    descriptions = ["python data", "typescript web"]

    clustering.perform_hierarchical(descriptions)
    clustering.perform_pca_hierarchical(descriptions)

    assert observed_limits == [DENSE_TFIDF_MAX_FEATURES, DENSE_TFIDF_MAX_FEATURES]


def test_stop_word_only_descriptions_use_character_fallback(
    client: TestClient,
) -> None:
    repositories = [
        make_repository(0, "the and"),
        make_repository(1, "or but"),
    ]

    response = client.post("/clustering", json={"repositories": repositories})

    assert response.status_code == 200
    payload: dict[str, object] = response.json()
    assert RESULT_FIELDS.intersection(payload) == RESULT_FIELDS
    for field in RESULT_FIELDS:
        assert_partition(payload[field], len(repositories))


def test_pca_hierarchical_is_repeatable_for_high_vocabulary_input() -> None:
    descriptions = [
        " ".join(f"topic{document}_{feature}" for feature in range(25))
        for document in range(30)
    ]

    first_clusters, first_components = perform_pca_hierarchical(
        descriptions, n_components=10, distance_threshold=0.5
    )
    second_clusters, second_components = perform_pca_hierarchical(
        descriptions, n_components=10, distance_threshold=0.5
    )

    assert first_components == second_components == 10
    assert first_clusters == second_clusters
