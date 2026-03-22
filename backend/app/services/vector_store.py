from __future__ import annotations

from typing import Any

from qdrant_client import QdrantClient

from app.core.config import get_settings
from app.core.logging import logger


class VectorStoreService:
    def __init__(self) -> None:
        settings = get_settings()
        self.collection_name = "video_note_chunks"
        self.client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)

    def ensure_collection(self) -> None:
        try:
            collections = self.client.get_collections().collections
            if any(item.name == self.collection_name for item in collections):
                return
            self.client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config={"size": 1536, "distance": "Cosine"},
            )
        except Exception as error:  # pragma: no cover
            logger.warning("Qdrant unavailable during ensure_collection: %s", error)

    def upsert_chunk(self, vector_id: str, payload: dict[str, Any]) -> None:
        try:
            self.ensure_collection()
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    {
                        "id": vector_id,
                        "vector": payload.get("embedding") or [0.001] * 1536,
                        "payload": payload,
                    }
                ],
            )
        except Exception as error:  # pragma: no cover
            logger.warning("Qdrant unavailable during upsert_chunk: %s", error)

    def search(self, *, job_id: str) -> list[dict[str, Any]]:
        try:
            self.ensure_collection()
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=[0.001] * 1536,
                limit=5,
                query_filter={"must": [{"key": "job_id", "match": {"value": job_id}}]},
            )
            return [item.payload | {"score": item.score} for item in results]
        except Exception as error:  # pragma: no cover
            logger.warning("Qdrant unavailable during search: %s", error)
            return []
