"""Configuration management for the LLM server."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""
    
    # API Keys
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    SERPER_API_KEY = os.getenv("SERPER_API_KEY")
    AGENTOPS_API_KEY = os.getenv("AGENTOPS_API_KEY")
    
    # Server
    PORT = int(os.getenv("PORT", 8000))
    HOST = os.getenv("HOST", "0.0.0.0")
    
    # Rate Limits
    DEFAULT_RATE_LIMIT = "20/minute, 200/day"
    CONCERT_RESEARCH_RATE_LIMIT = "10/minute"
    
    # CORS
    CORS_ORIGINS = ["https://bayareashows.org", "http://localhost:3000"]
    
    # LLM Settings
    QUICK_MODEL = "gpt-4o-mini"
    DETAILED_MODEL = "gpt-4o"
    QUICK_MAX_TOKENS = 512
    DETAILED_MAX_TOKENS = 4096
    TEMPERATURE = 0.3
    TEMPERATURE_STRICT = 0.2
    
    # Timeouts
    ARTIST_DATAPOINT_TIMEOUT = int(os.getenv("ARTIST_DATAPOINT_TIMEOUT", "25"))
    
    # Paths
    BASE_DIR = Path(__file__).resolve().parent.parent
    CACHE_DIR = BASE_DIR / "tasks" / "logs" / "cache"
    LOGS_DIR = BASE_DIR / "logs"
    
    @classmethod
    def ensure_dirs(cls):
        """Ensure required directories exist."""
        cls.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cls.LOGS_DIR.mkdir(parents=True, exist_ok=True)
