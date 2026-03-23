from __future__ import annotations

import json
import subprocess
from pathlib import Path

from app.core.config import get_settings
from app.models.entities import SourceType, VideoJob


class MediaPipelineService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def prepare_media(self, job: VideoJob) -> dict:
        workspace = self.settings.storage_path / "jobs" / job.id
        workspace.mkdir(parents=True, exist_ok=True)

        if job.source_type == SourceType.url:
            return self._download_from_url(job, workspace)

        if not job.filename:
            raise ValueError("Uploaded job is missing a filename")

        source_path = self.settings.storage_path / "uploads" / job.filename
        if not source_path.exists():
            raise ValueError("Uploaded source file could not be found")

        audio_path = self._ensure_audio_file(source_path, workspace / f"{source_path.stem}.mp3")
        return {
            "input_path": source_path,
            "audio_path": audio_path,
            "title": job.title,
            "author": job.author or "Uploaded Source",
            "duration_seconds": job.duration_seconds,
            "source_url": job.source_url,
        }

    def _download_from_url(self, job: VideoJob, workspace: Path) -> dict:
        if not job.source_url:
            raise ValueError("URL job is missing a source URL")

        metadata_cmd = ["yt-dlp", "--dump-single-json", "--no-playlist", job.source_url]
        metadata_result = subprocess.run(metadata_cmd, capture_output=True, text=True, check=True, timeout=600)
        metadata = json.loads(metadata_result.stdout)

        output_template = str(workspace / "source.%(ext)s")
        download_cmd = [
            "yt-dlp",
            "--no-playlist",
            "-f",
            "bestaudio",
            "--extract-audio",
            "--audio-format",
            "mp3",
            "-o",
            output_template,
            job.source_url,
        ]
        subprocess.run(download_cmd, capture_output=True, text=True, check=True, timeout=1800)

        audio_candidates = sorted(workspace.glob("source.*"))
        if not audio_candidates:
            raise ValueError("yt-dlp completed without producing an audio file")

        audio_path = audio_candidates[0]
        return {
            "input_path": audio_path,
            "audio_path": audio_path,
            "title": metadata.get("title") or job.title,
            "author": metadata.get("uploader") or metadata.get("channel") or "Online Source",
            "duration_seconds": metadata.get("duration"),
            "source_url": job.source_url,
        }

    def _ensure_audio_file(self, input_path: Path, output_path: Path) -> Path:
        if input_path.suffix.lower() in {".mp3", ".wav", ".m4a", ".mpga", ".mpeg", ".webm"}:
            return input_path

        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path),
            "-vn",
            "-acodec",
            "libmp3lame",
            str(output_path),
        ]
        subprocess.run(ffmpeg_cmd, capture_output=True, text=True, check=True, timeout=1800)
        return output_path
