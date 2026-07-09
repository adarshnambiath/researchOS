"""
Application configuration loaded from environment variables or .env file.

This module centralizes all configuration in a single Settings object.
Uses pydantic_settings for type-safe environment variable parsing.

Extension point: when new configuration values are needed, add them
here as typed fields.  The .env file or OS environment variables
provide their values at runtime.
"""

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./research_os.db"
    workspace_root: str = str(
        Path(__file__).parent.parent.parent / "workspace"
    )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
