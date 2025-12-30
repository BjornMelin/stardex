from app.main import app


def test_app_imports() -> None:
    assert app is not None
