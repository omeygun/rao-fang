"""Shared e5 embedding — must match app/src/ml/embed.ts exactly:
"query: " prefix, mean pooling over tokens, L2 normalisation (spec §4, §8.2).

`FakeEmbedder` exists ONLY to smoke-test the pipeline code without network access.
Its outputs are meaningless; never export heads or report metrics produced with it.
"""
from __future__ import annotations

import hashlib

import numpy as np

ENCODER = "intfloat/multilingual-e5-small"  # Python twin of Xenova/multilingual-e5-small
PREFIX = "query: "
DIM = 384


def e5_input(text: str) -> str:
    return PREFIX + text.strip()


def e5_aspect_input(text: str, aspect: str) -> str:
    return f"{PREFIX}{text.strip()} [aspect: {aspect}]"


class E5Embedder:
    fake = False

    def __init__(self, name: str = ENCODER, batch_size: int = 64):
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(name, device="cpu")
        self.batch_size = batch_size
        # Verify the pipeline is mean pooling, as transformers.js uses pooling: "mean".
        pool = [m for m in self.model if m.__class__.__name__ == "Pooling"]
        cfg = pool[0].get_config_dict() if pool else {}
        assert cfg.get("pooling_mode") == "mean" or cfg.get("pooling_mode_mean_tokens"), f"expected mean pooling, got {cfg}"

    def embed(self, inputs: list[str]) -> np.ndarray:
        """`inputs` must already carry the "query: " prefix."""
        return self.model.encode(
            inputs, batch_size=self.batch_size, normalize_embeddings=True,
            convert_to_numpy=True, show_progress_bar=len(inputs) > 500,
        ).astype(np.float32)


class FakeEmbedder:
    """Deterministic hashed bag-of-character-trigrams. For pipeline smoke tests only."""

    fake = True

    def embed(self, inputs: list[str]) -> np.ndarray:
        out = np.zeros((len(inputs), DIM), dtype=np.float32)
        for i, s in enumerate(inputs):
            for j in range(len(s) - 2):
                h = int(hashlib.md5(s[j : j + 3].encode()).hexdigest()[:8], 16)
                out[i, h % DIM] += 1.0
            n = np.linalg.norm(out[i])
            if n:
                out[i] /= n
        return out


def get_embedder(fake: bool = False):
    return FakeEmbedder() if fake else E5Embedder()
