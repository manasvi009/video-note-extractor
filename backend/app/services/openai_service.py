from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx

from app.core.config import get_settings
from app.models.entities import OutputMode
from app.prompts.templates import QA_PROMPT, SUMMARY_PROMPTS


class OpenAIService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return bool(self.settings.openai_api_key)

    def transcribe(self, audio_path: Path) -> dict[str, Any]:
        with audio_path.open("rb") as audio_file:
            response = self._request(
                "POST",
                "/audio/transcriptions",
                files={
                    "file": (audio_path.name, audio_file, "application/octet-stream"),
                    "model": (None, self.settings.openai_transcription_model),
                    "response_format": (None, "verbose_json"),
                    "timestamp_granularities[]": (None, "segment"),
                },
                timeout=1800,
            )
        return response.json()

    def embed_texts(self, texts: list[str]) -> tuple[str, list[list[float]]]:
        response = self._request(
            "POST",
            "/embeddings",
            json={
                "model": self.settings.openai_embedding_model,
                "input": texts,
            },
            timeout=300,
        )
        payload = response.json()
        vectors = [item["embedding"] for item in payload["data"]]
        return payload["model"], vectors

    def summarize(self, *, title: str, mode: OutputMode, transcript_chunks: list[dict[str, Any]]) -> dict[str, Any]:
        messages = [
            {
                "role": "system",
                "content": (
                    f"{SUMMARY_PROMPTS[mode.value]}\n"
                    "Return valid JSON with keys: overview, section_summary, key_takeaways, questions_discussed, "
                    "key_decisions, definitions, action_items, important_timestamps, exam_notes, meeting_minutes, "
                    "bullet_summary_markdown, qa_guidance."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "title": title,
                        "mode": mode.value,
                        "transcript_chunks": transcript_chunks,
                    }
                ),
            },
        ]
        payload = self._chat_json(messages)
        payload.setdefault("overview", f"Processed notes for {title}.")
        payload.setdefault("section_summary", [])
        payload.setdefault("key_takeaways", [])
        payload.setdefault("questions_discussed", [])
        payload.setdefault("key_decisions", [])
        payload.setdefault("definitions", [])
        payload.setdefault("action_items", [])
        payload.setdefault("important_timestamps", [])
        payload.setdefault("exam_notes", [])
        payload.setdefault("meeting_minutes", [])
        payload.setdefault("bullet_summary_markdown", "")
        payload.setdefault("qa_guidance", "Cite transcript evidence and be explicit about uncertainty.")
        payload["mode"] = mode.value
        return payload

    def answer_question(self, *, title: str, question: str, chunks: list[dict[str, Any]]) -> str:
        messages = [
            {"role": "system", "content": QA_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "title": title,
                        "question": question,
                        "evidence": chunks,
                    }
                ),
            },
        ]
        response = self._request(
            "POST",
            "/chat/completions",
            json={
                "model": self.settings.openai_chat_model,
                "messages": messages,
                "temperature": 0.2,
            },
            timeout=300,
        )
        payload = response.json()
        return payload["choices"][0]["message"]["content"].strip()

    def _chat_json(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        response = self._request(
            "POST",
            "/chat/completions",
            json={
                "model": self.settings.openai_chat_model,
                "messages": messages,
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
            timeout=300,
        )
        payload = response.json()
        return json.loads(payload["choices"][0]["message"]["content"])

    def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        headers = {"Authorization": f"Bearer {self.settings.openai_api_key}"}
        with httpx.Client(base_url=self.settings.openai_api_base, headers=headers) as client:
            response = client.request(method, path, **kwargs)
            response.raise_for_status()
            return response
