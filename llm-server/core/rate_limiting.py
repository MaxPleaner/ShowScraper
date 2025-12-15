"""Rate limiting configuration for FastAPI application."""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from core.config import Config


async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceeded exceptions."""
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."}
    )


def setup_rate_limiting(app: FastAPI) -> Limiter:
    """Setup rate limiting middleware and return the limiter instance."""
    limiter = Limiter(key_func=get_remote_address, default_limits=[Config.DEFAULT_RATE_LIMIT])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
    app.add_middleware(SlowAPIMiddleware)
    return limiter
