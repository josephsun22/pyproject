import logging
import time

logger = logging.getLogger(__name__)


class SimpleLoggingMiddleware:
    """Log each request and add response timing as a header."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        logger.info("%s %s", request.method, request.path)

        response = self.get_response(request)

        duration_ms = (time.monotonic() - start) * 1000
        response["X-Request-Duration-Ms"] = f"{duration_ms:.2f}"
        logger.info(
            "LoggingMiddleware: %s %s -> %s (%.2fms)",
            request.method,
            request.path,
            response.status_code,
            duration_ms,
        )

        return response
