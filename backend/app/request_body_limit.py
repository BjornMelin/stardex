"""ASGI middleware for rejecting oversized request bodies."""

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


DEFAULT_MAX_BODY_MESSAGES = 1_024


class RequestBodyLimitMiddleware:
    """Reject declared and streamed request bodies above a byte limit."""

    def __init__(
        self,
        app: ASGIApp,
        max_bytes: int,
        max_messages: int = DEFAULT_MAX_BODY_MESSAGES,
    ) -> None:
        self.app = app
        self.max_bytes = max_bytes
        self.max_messages = max_messages

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Forward a bounded request or return a 413 response."""
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
        for _message_count in range(self.max_messages):
            message = await receive()
            if message["type"] == "http.request":
                chunk = message.get("body", b"")
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
        return None

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
                    f"Request body exceeds the {max_mebibytes} MiB limit"
                ),
                "total_processing_time_ms": 0,
            },
        )
        await response(scope, receive, send)
