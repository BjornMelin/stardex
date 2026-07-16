from collections.abc import Iterator
from typing import cast

import pytest
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


@pytest.mark.asyncio
async def test_valid_multiframe_body_is_coalesced_before_forwarding() -> None:
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

    await middleware(make_scope(), receive, send)

    assert observed == [
        {"type": "http.request", "body": b"12345678", "more_body": False}
    ]
    assert sent[0]["status"] == 200


@pytest.mark.asyncio
async def test_oversized_multiframe_body_is_rejected_before_forwarding() -> None:
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

    await middleware(make_scope(), receive, send)

    assert not downstream_called
    assert sent[0]["status"] == 413


@pytest.mark.asyncio
async def test_excessive_empty_frames_are_rejected_before_forwarding() -> None:
    downstream_called = False

    async def downstream(scope: Scope, receive: Receive, send: Send) -> None:
        nonlocal downstream_called
        downstream_called = True
        await JSONResponse({"status": "ok"})(scope, receive, send)

    middleware = RequestBodyLimitMiddleware(
        cast("ASGIApp", downstream), max_bytes=8, max_messages=2
    )
    receive = make_receive(
        iter(
            [
                {"type": "http.request", "body": b"", "more_body": True},
                {"type": "http.request", "body": b"", "more_body": True},
                {"type": "http.request", "body": b"", "more_body": False},
            ]
        )
    )
    sent: list[Message] = []

    async def send(message: Message) -> None:
        sent.append(message)

    await middleware(make_scope(), receive, send)

    assert not downstream_called
    assert sent[0]["status"] == 413
