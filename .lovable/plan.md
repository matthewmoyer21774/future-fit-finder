

# Simplify: Remove Vector DB, Pass All Programmes Directly to GPT

## Why

The vector database (ChromaDB + OpenAI embeddings) exists to narrow 62 programmes down to ~15 before sending them to GPT-4o-mini. But 62 short programme summaries fit easily in GPT's context window. The vector DB adds:
- 2-5 minute startup delay (the "System is starting up" error)
- ChromaDB dependency
- Extra OpenAI embedding API calls and costs
- The bug we've been debugging

## What Changes

| File | Change |
|------|--------|
| `backend/recommender.py` | Replace `search_programmes()` (ChromaDB query) with `load_all_programmes()` that reads the JSON files directly and passes all 62 to GPT |
| `backend/main.py` | Remove the `build_db()` startup task and the `is_ready` guard — server is ready immediately |
| `backend/build_vectordb.py` | Can be deleted entirely (or kept for future use) |

## Detail: recommender.py

Replace the `get_collection()` and `search_programmes()` functions with a simple function that:
1. Reads all programme JSON files from `programme_pages/`
2. Builds a short summary for each (title, category, fee, format, location, description snippet)
3. Passes ALL of them to GPT-4o-mini in the prompt

The `recommend()` function stays mostly the same — it still builds the candidate profile context and calls GPT. The only change is where the programme list comes from (JSON files instead of ChromaDB).

## Detail: main.py

- Remove the `startup()` event that builds the vector DB in a background thread
- Remove the `is_ready` flag and the guard in `/recommend`
- The server is ready to serve requests immediately on startup

## Result

- No more "System is starting up" errors
- Instant Railway startup
- One fewer dependency (ChromaDB)
- Fewer OpenAI API calls (no embeddings)
- Same recommendation quality — GPT handles 62 programmes easily
