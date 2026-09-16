# @omega-v/vector

Dense vector similarity search and semantic ledger recall for Ω∞v Oceanicos.

Connects to Qdrant vector database (`VectorMemory`) for storing block embeddings and performing semantic nearest-neighbor queries across ledger history.

## Role

* Stores and retrieves block embeddings with 384-dimensional cosine similarity.
* Graceful fallback: when Qdrant is offline, safely returns empty match results without throwing.
