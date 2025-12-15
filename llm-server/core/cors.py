"""CORS configuration for FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import Config


def setup_cors(app: FastAPI) -> FastAPI:
    """Setup CORS middleware for frontend access."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=Config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app
