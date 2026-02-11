

# Get the Python Backend Running on Railway

## What's Wrong Today

The Railway deployment fails because the vector DB build (ChromaDB + OpenAI embeddings) runs at startup and either times out or crashes before completing. Railway's health check fails, and the service restarts in a loop.

Additionally, the architecture page is a pure frontend simulation -- it doesn't actually hit your Railway backend.

## Plan

### 1. Add a Dockerfile for reliable Railway deployment
Nixpacks sometimes misconfigures Python builds. A Dockerfile gives full control over the environment, ensures `programme_pages/` data is included, and sets the correct working directory.

### 2. Make the vector DB build more robust
- Add retry logic with exponential backoff to `build_vectordb.py` (OpenAI embedding calls can transiently fail)
- Batch the 61 programmes into smaller groups (ChromaDB's `add()` with 61 docs at once can cause memory spikes)
- Add a `/health` response that distinguishes "starting" vs "ready" so Railway doesn't kill the process prematurely

### 3. Update `main.py` startup to be more resilient
- Increase Railway health check grace period via `railway.json` (`healthcheckTimeout`)
- Keep the background thread approach but add proper error logging and retry

### 4. Make the Architecture page call the REAL Railway backend
Instead of `setTimeout` simulations, the "Run Demo" button will:
- Call `backend-proxy` edge function with a sample profile
- Show real responses at each pipeline stage (using the proxy's response data)
- Fall back to the simulation if Railway is down

### 5. Fix architecture page tech labels to match actual code
The code uses **OpenAI GPT-4o-mini** for classification (not BART) and **OpenAI text-embedding-3-small** for embeddings (not all-MiniLM-L6-v2). The labels will be updated to reflect reality.

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/Dockerfile` | Create -- multi-stage Python image |
| `backend/build_vectordb.py` | Edit -- add retry logic and batching |
| `backend/main.py` | Edit -- improve startup error handling |
| `backend/railway.json` | Edit -- add health check timeout |
| `src/pages/AdminArchitecture.tsx` | Edit -- real backend call + fix tech labels |

## What You'll Need To Do on Railway

1. Make sure your Railway service's **Root Directory** is set to `backend/`
2. Ensure `OPENAI_API_KEY` is set in Railway environment variables (confirmed)
3. After we push changes, Railway will auto-deploy from GitHub
4. The first deploy will take 2-3 minutes (building vector DB with 61 programmes)

## Technical Details

**Dockerfile approach:**
```text
python:3.11-slim base image
Install dependencies from requirements.txt
Copy programme_pages/ data and all Python files
Expose $PORT, run uvicorn
```

**Retry logic for embeddings:**
- 3 retries with 2/4/8 second backoff
- Batch size of 20 documents per ChromaDB add() call
- Graceful fallback: server starts even if vector DB fails, returns helpful error

**Architecture page live demo:**
- Calls `/health` first to check if Railway is up
- If up, sends a sample profile to `backend-proxy`
- Maps response fields to pipeline stages in real time
- Shows actual profile extraction, categories, and recommendations from the backend

