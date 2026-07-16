"""ASGI middleware for rejecting oversized request bodies."""

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


MIN_EFFICIENT_BODY_CHUNK_BYTES = 512
DEFAULT_MAX_TINY_BODY_MESSAGES = 1_024


class RequestBodyLimitMiddleware:
    """Reject declared and streamed request bodies above a byte limit."""

    def __init__(
        self,
        app: ASGIApp,
        max_bytes: int,
        max_tiny_messages: int = DEFAULT_MAX_TINY_BODY_MESSAGES,
    ) -> None:
        """Initialize the request body guard.

        Args:
            app: Downstream ASGI application.
            max_bytes: Maximum accepted request body size in bytes.
            max_tiny_messages: Maximum tiny continuation frames accepted.
        """
        self.app = app
        self.max_bytes = max_bytes
        self.max_tiny_messages = max_tiny_messages

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Forward a bounded request or return a 413 response.

        Args:
            scope: Current ASGI connection scope.
            receive: Callable that yields request messages.
            send: Callable that sends response messages.
        """
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        content_length = self._content_length(scope)
        if content_length is not None and content_length > self.max_bytes:
            await self._send_rejection(scope, receive, send)
            return

        request_message = await self._read_request_message(receive)
        if request_message is None:
            await self._send_rejection(scope, receive, send)
            return

        replayed = False

        async def replay_receive() -> Message:
            nonlocal replayed

            if replayed:
                return await receive()
            replayed = True
            return request_message

        await self.app(scope, replay_receive, send)

    async def _read_request_message(self, receive: Receive) -> Message | None:
        buffered_body = bytearray()
        tiny_messages = 0
        while True:
            message = await receive()
            if message["type"] == "http.request":
                chunk = message.get("body", b"")
                if len(chunk) < MIN_EFFICIENT_BODY_CHUNK_BYTES and message.get(
                    "more_body", False
                ):
                    tiny_messages += 1
                    if tiny_messages > self.max_tiny_messages:
                        return None
                if len(chunk) > self.max_bytes - len(buffered_body):
                    return None
                buffered_body.extend(chunk)
                if not message.get("more_body", False):
                    return {
                        "type": "http.request",
                        "body": bytes(buffered_body),
                        "more_body": False,
                    }
            elif message["type"] == "http.disconnect":
                return message

    @staticmethod
    def _content_length(scope: Scope) -> int | None:
        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    return int(value)
                except ValueError:
                    return None
        return None

    async def _send_rejection(self, scope: Scope, receive: Receive, send: Send) -> None:
        max_mebibytes = self.max_bytes // (1024 * 1024)
        response = JSONResponse(
            status_code=413,
            content={
                "status": "error",
                "error_message": (
                    "Request body exceeds the configured transport limits "
                    f"({max_mebibytes} MiB maximum)"
                ),
                "total_processing_time_ms": 0,
            },
        )
        await response(scope, receive, send)
