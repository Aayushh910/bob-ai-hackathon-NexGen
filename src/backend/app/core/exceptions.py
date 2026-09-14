import logging
from typing import Any, Optional
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("sentinelai.exceptions")

class SentinelAIException(Exception):
    """Base exception class for SentinelAI errors."""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR, details: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details

class ResourceNotFoundException(SentinelAIException):
    """Raised when a requested resource is not found."""
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} with identifier '{identifier}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND
        )

class DatabaseConnectionException(SentinelAIException):
    """Raised when the database connection fails."""
    def __init__(self, message: str = "Database connection error"):
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )

def register_exception_handlers(app: FastAPI) -> None:
    """Register application-wide exception handlers with FastAPI."""

    @app.exception_handler(SentinelAIException)
    async def sentinelai_exception_handler(request: Request, exc: SentinelAIException):
        logger.error("SentinelAI error occurred: %s (Path: %s)", exc.message, request.url.path)
        content = {
            "error": exc.__class__.__name__,
            "message": exc.message
        }
        if exc.details:
            content["details"] = exc.details
        return JSONResponse(status_code=exc.status_code, content=content)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.warning("HTTP %d error on %s: %s", exc.status_code, request.url.path, exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "HTTPException",
                "message": exc.detail,
                "status_code": exc.status_code
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning("Validation error on %s: %s", request.url.path, exc.errors())
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "ValidationError",
                "message": "Input validation failed",
                "errors": [
                    {
                        "loc": err.get("loc"),
                        "msg": err.get("msg"),
                        "type": err.get("type")
                    }
                    for err in exc.errors()
                ]
            }
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.critical("Unhandled server exception on %s: %s", request.url.path, str(exc), exc_info=True)
        # Avoid leaking internal secrets or database connection strings
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "InternalServerError",
                "message": "An unexpected error occurred. Please contact system administrator."
            }
        )
