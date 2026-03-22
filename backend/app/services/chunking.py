from collections.abc import Iterable


def split_transcript(text: str, *, target_words: int = 120) -> list[dict]:
    words = text.split()
    if not words:
        return []

    chunks: list[dict] = []
    for index in range(0, len(words), target_words):
        part = words[index:index + target_words]
        chunks.append(
            {
                "chunk_index": len(chunks),
                "text": " ".join(part),
                "start_seconds": float(index * 2),
                "end_seconds": float((index + len(part)) * 2),
                "speaker": "Speaker 1" if len(chunks) % 2 == 0 else "Speaker 2",
            }
        )
    return chunks


def format_bullets(items: Iterable[str]) -> str:
    return "\n".join(f"- {item}" for item in items)

