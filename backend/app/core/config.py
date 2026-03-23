from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    secret_key: str = "change-me"
    api_v1_prefix: str = "/api/v1"
    api_base_url: str = "http://localhost:8000"
    database_url: str = Field(default="postgresql+psycopg://postgres:postgres@localhost:5432/video_notes")
    redis_url: str = "redis://localhost:6379/0"
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None
    storage_mode: str = "local"
    local_storage_path: str = "./storage"
    s3_endpoint: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_bucket: str = "video-note-extractor"
    openai_api_key: str | None = None
    openai_api_base: str = "https://api.openai.com/v1"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4.1-mini"
    openai_transcription_model: str = "whisper-1"
    whisper_model: str = "base"
    enable_demo_data: bool = True
    auth_provider: str = "nextauth"
    cors_origins: list[str] = ["http://localhost:3000"]
    max_requests_per_minute: int = 60
    allowed_upload_extensions: list[str] = ["mp4", "mp3", "wav", "mov", "mkv"]
    max_upload_size_mb: int = 1024

    @property
    def storage_path(self) -> Path:
        path = Path(self.local_storage_path)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
