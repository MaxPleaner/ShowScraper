"""Logging and tracing utilities."""
import os
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, List
import agentops
from core.config import Config


# AgentOps compatibility helpers (older client may not expose start_trace/end_trace)
def _agentops_start_trace(*args, **kwargs):
    """Start an AgentOps trace if available."""
    start_fn = getattr(agentops, "start_trace", None)
    if callable(start_fn):
        return start_fn(*args, **kwargs)
    return None


def _agentops_end_trace(*args, **kwargs):
    """End an AgentOps trace if available."""
    end_fn = getattr(agentops, "end_trace", None)
    if callable(end_fn):
        return end_fn(*args, **kwargs)
    return None


def init_agentops():
    """Initialize AgentOps if API key is available."""
    if Config.AGENTOPS_API_KEY:
        agentops.init(api_key=Config.AGENTOPS_API_KEY, auto_start_session=True)
        print("✓ AgentOps initialized")
        return True
    return False


def start_trace(tags: List[str]):
    """Start a trace if AgentOps is configured."""
    if Config.AGENTOPS_API_KEY:
        return _agentops_start_trace(tags=tags)
    return None


def end_trace(trace_obj, end_state: str = "Success"):
    """End a trace if AgentOps is configured."""
    if Config.AGENTOPS_API_KEY and trace_obj:
        _agentops_end_trace(end_state=end_state)


def log_request(request_data: dict, log_dir: Path = None):
    """Log a request to a JSON file."""
    try:
        ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        log_dir = log_dir or Config.LOGS_DIR
        log_path = log_dir / f"req_{ts}_{os.getpid()}.json"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text(json.dumps(request_data, indent=2))
    except Exception:
        pass


def create_datapoint_logger(timestamp: str, run_id: str) -> callable:
    """Create a datapoint logger function."""
    log_dir = Config.LOGS_DIR
    log_dir.mkdir(parents=True, exist_ok=True)
    dp_log_path = log_dir / f"dp_{timestamp}_{run_id}.log"

    def log_dp(payload: dict):
        try:
            if dp_log_path.exists():
                dp_log_path.write_text(dp_log_path.read_text() + json.dumps(payload) + "\n")
            else:
                dp_log_path.write_text(json.dumps(payload) + "\n")
        except Exception:
            pass

    return log_dp
