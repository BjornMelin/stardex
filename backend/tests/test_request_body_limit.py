import asyncio
from collections.abc import Iterator
from typing import cast

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.request_body_limit import RequestBodyLimitMiddleware


def make_scope() -> Scope:
    """Build a minimal HTTP scope for direct ASGI middleware tests."""
    return cast(
        "Scope",
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/clustering",
            "raw_path": b"/clustering",
            "query_string": b"",
            "root_path": "",
            "headers": [],
            "client": ("127.0.0.1", 1),
            "server": ("testserver", 80),
            "state": {},
        },
    )


def make_receive(messages: Iterator[Message]) -> Receive:
    """Return an ASGI receive callable over deterministic messages."""

    async def receive() -> Message:
        try:
            return next(messages)
        except StopIteration:
            return {"type": "http.disconnect"}

    return receive


def test_valid_multiframe_body_is_coalesced_before_forwarding() -> None:
    """Coalesce a valid multiframe body before forwarding it."""
    observed: list[Message] = []

    async def downstream(scope: Scope, receive: Receive, send: Send) -> None:
        observed.append(await receive())
        await JSONResponse({"status": "ok"})(scope, receive, send)

    middleware = RequestBodyLimitMiddleware(cast("ASGIApp", downstream), max_bytes=8)
    receive = make_receive(
        iter(
            [
                {"type": "http.request", "body": b"1234", "more_body": True},
                {"type": "http.request", "body": b"5678", "more_body": False},
            ]
        )
    )
    sent: list[Message] = []

    async def send(message: Message) -> None:
        sent.append(message)

    asyncio.run(middleware(make_scope(), receive, send))

    assert observed == [
        {"type": "http.request", "body": b"12345678", "more_body": False}
    ]
    assert sent[0]["status"] == 200


def test_oversized_multiframe_body_is_rejected_before_forwarding() -> None:
    """Reject a multiframe body that exceeds the byte limit."""
    downstream_called = False

    async def downstream(scope: Scope, receive: Receive, send: Send) -> None:
        nonlocal downstream_called
        downstream_called = True
        await JSONResponse({"status": "ok"})(scope, receive, send)

    middleware = RequestBodyLimitMiddleware(cast("ASGIApp", downstream), max_bytes=8)
    receive = make_receive(
        iter(
            [
                {"type": "http.request", "body": b"1234", "more_body": True},
                {"type": "http.request", "body": b"56789", "more_body": False},
            ]
        )
    )
    sent: list[Message] = []

    async def send(message: Message) -> None:
        sent.append(message)

    asyncio.run(middleware(make_scope(), receive, send))

    assert not downstream_called
    assert sent[0]["status"] == 413


def test_excessive_empty_frames_are_rejected_before_forwarding() -> None:
    """Reject a body that exceeds the tiny-frame traffic limit."""
    downstream_called = False

    async def downstream(scope: Scope, receive: Receive, send: Send) -> None:
        nonlocal downstream_called
        downstream_called = True
        await JSONResponse({"status": "ok"})(scope, receive, send)

    middleware = RequestBodyLimitMiddleware(
        cast("ASGIApp", downstream), max_bytes=8, max_tiny_messages=2
    )
    receive = make_receive(
        iter(
            [
                {"type": "http.request", "body": b"", "more_body": True},
                {"type": "http.request", "body": b"", "more_body": True},
                {"type": "http.request", "body": b"", "more_body": True},
                {"type": "http.request", "body": b"", "more_body": False},
            ]
        )
    )
    sent: list[Message] = []

    async def send(message: Message) -> None:
        sent.append(message)

    asyncio.run(middleware(make_scope(), receive, send))

    assert not downstream_called
    assert sent[0]["status"] == 413


def test_valid_nine_mebibyte_body_accepts_eight_kibibyte_frames() -> None:
    """Accept a valid large body carried in ordinary-size frames."""
    observed: list[Message] = []

    async def downstream(scope: Scope, receive: Receive, send: Send) -> None:
        observed.append(await receive())
        await JSONResponse({"status": "ok"})(scope, receive, send)

    chunk = b"x" * (8 * 1024)
    chunk_count = 9 * 1024 * 1024 // len(chunk)
    middleware = RequestBodyLimitMiddleware(
        cast("ASGIApp", downstream), max_bytes=9 * 1024 * 1024
    )
    receive = make_receive(
        iter(
            [
                {
                    "type": "http.request",
                    "body": chunk,
                    "more_body": index < chunk_count - 1,
                }
                for index in range(chunk_count)
            ]
        )
    )
    sent: list[Message] = []

    async def send(message: Message) -> None:
        sent.append(message)

    asyncio.run(middleware(make_scope(), receive, send))

    assert len(observed) == 1
    assert observed[0]["body"] == chunk * chunk_count
    assert observed[0]["more_body"] is False
    assert sent[0]["status"] == 200
