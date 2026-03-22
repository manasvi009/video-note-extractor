from pathlib import Path
from urllib.parse import urlparse

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings


ALLOWED_VIDEO_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "youtu.be",
    "vimeo.com",
    "www.vimeo.com",
    "loom.com",
    "www.loom.com",
}

DIRECT_MEDIA_EXTENSIONS = {".mp4", ".mp3", ".wav", ".mov", ".mkv", ".m4a", ".webm"}


def validate_source_url(source_url: str) -> None:
    parsed = urlparse(source_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid source URL")

    hostname = parsed.netloc.lower()
    path = parsed.path.lower()
    allowed_host = any(hostname == allowed or hostname.endswith(f".{allowed}") for allowed in ALLOWED_VIDEO_HOSTS)
    direct_media = any(path.endswith(extension) for extension in DIRECT_MEDIA_EXTENSIONS)

    if not allowed_host and not direct_media:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported video URL. Use YouTube, Vimeo, Loom, or a direct HTTPS media file.",
        )


def validate_upload(file: UploadFile) -> None:
    settings = get_settings()
    suffix = Path(file.filename or "").suffix.lower().lstrip(".")
    if suffix not in settings.allowed_upload_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(settings.allowed_upload_extensions)}",
        )
