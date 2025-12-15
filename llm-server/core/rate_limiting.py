"""Rate limiting configuration for FastAPI application."""
from fastapi import FastAPI, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from core.config import Config


def setup_rate_limiting(app: FastAPI) -> Limiter:
    """Setup rate limiting middleware and return the limiter instance."""
    limiter = Limiter(key_func=get_remote_address, default_limits=[Config.DEFAULT_RATE_LIMIT])
    app.state.limiter = limiter
    app.add_exception_handler(
        RateLimitExceeded,
        lambda request, exc: HTTPException(status_code=429, detail="Too many requests")
    )
    app.add_middleware(SlowAPIMiddleware)
    return limiter
