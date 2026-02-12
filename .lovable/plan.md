

# Fix Railway 502: Background Vector DB Build

## Problem
Railway returns "Application failed to respond" because `build_vectordb.py` runs before uvicorn starts. The OpenAI embedding calls for 62 programmes take 30-60 seconds, and Railway's health check times out waiting for the server.

## Solution
Start the web server immediately, build the vector DB in a background thread.

### Changes

**1. `backend/main.py`** -- Background build + ready flag
- Import `threading` and `build_vectordb.main`
- Add a global `is_ready` flag (starts as `False`)
- Add a `startup` event that spawns a background thread to run the vector DB build
- Update `/health` to return `{"status": "ok", "ready": is_ready}`
- Add a guard at the top of `/recommend` that returns a friendly "still loading" message if the DB isn't ready yet

**2. `backend/Procfile`** -- Remove the pre-build step
- Change from: `python build_vectordb.py && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Change to: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`

**3. `backend/railway.json`** -- Match the start command
- Update `startCommand` to: `uvicorn main:app --host 0.0.0.0 --port $PORT`

This way Railway sees a healthy server within seconds. The vector DB builds in the background (~30-60s). After redeploying, wait about a minute before testing the full recommendation flow.

