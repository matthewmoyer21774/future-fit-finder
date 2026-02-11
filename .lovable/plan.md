

# Switch to Python RAG Backend (Railway) + Live Architecture View

## Overview
Replace the current backend recommendation logic with the Python FastAPI backend deployed on Railway, and add a live pipeline visualization page in the admin dashboard that shows each processing step in real-time.

## Part 1: Railway Python Backend Integration

### What changes
The Lovable frontend will call your Python FastAPI server (deployed on Railway) instead of the current backend recommendation function. This means the full Python pipeline runs: CV parsing -> profile extraction -> zero-shot classification (BART) -> ChromaDB vector search -> GPT-4o-mini synthesis.

### Steps

**1. Prepare Python backend for Railway**
- Add a `Dockerfile` or `Procfile` and `railway.json` to `backend/`
- Add a `Nixpacks`-compatible setup (Railway auto-detects Python)
- The backend needs `OPENAI_API_KEY` set as a Railway env var
- ChromaDB data must be built at deploy time (add `build_vectordb.py` to the build step or pre-build it)
- The `programme_pages/` folder must be accessible to the backend

**2. Create a proxy edge function (`backend-proxy`)**
- A new backend function that forwards requests to the Railway FastAPI URL
- This avoids CORS issues and keeps the Railway URL private
- Stores `RAILWAY_BACKEND_URL` as a secret
- Forwards the CV file (as base64) + career goals + linkedin text to Railway's `/recommend` endpoint

**3. Update `Index.tsx`**
- Change the submission flow to call the proxy function
- Pass raw inputs (CV file, form data, linkedin text) rather than pre-parsed profile
- The Python backend handles all parsing and processing
- The proxy returns: `profile`, `top_categories`, `recommendations`, `email_draft`

**4. Update `Results.tsx`**
- Adapt to the slightly different response shape from the Python backend (e.g. `title` vs `programmeTitle`, `reason` vs `reasoning`)

**5. Update `save-submission`**
- Adapt field mapping for the Python backend response format

## Part 2: Live Pipeline Visualization (Admin)

### What it shows
A new tab/page in the admin dashboard with an animated pipeline diagram. When a recommendation request runs, each stage lights up in sequence:

```text
[Upload CV] --> [Parse Text] --> [Extract Profile] --> [Zero-Shot Classify] --> [Vector Search (ChromaDB)] --> [LLM Synthesis (GPT-4o-mini)] --> [Results]
```

### Implementation

**1. Create `src/pages/AdminArchitecture.tsx`**
- Visual pipeline with animated nodes using Framer Motion
- Each node shows: stage name, technology used, brief description
- A "Run Demo" button that simulates the pipeline with timed animations
- Shows sample data flowing between stages (e.g. "Extracted 3 categories: Strategy (85%), Leadership (72%)...")

**2. Add architecture route**
- Add `/admin/architecture` route in `App.tsx`
- Add a tab or nav link in the Admin page header

### Pipeline nodes displayed:
1. **Input** -- CV/Form/LinkedIn text
2. **Text Extraction** -- PyPDF / python-docx
3. **Profile Extraction** -- GPT-4o-mini structured extraction
4. **Zero-Shot Classification** -- facebook/bart-large-mnli -> top 3 categories
5. **Vector Search** -- ChromaDB + all-MiniLM-L6-v2 embeddings -> top 8 matches
6. **LLM Synthesis** -- GPT-4o-mini RAG -> top 3 recommendations + email draft
7. **Output** -- Recommendations + outreach email

Each node animates from grey to green with a progress indicator when the demo runs.

## Technical Details

### New secret needed
- `RAILWAY_BACKEND_URL` -- the public URL of your Railway deployment (e.g. `https://your-app.up.railway.app`)

### Files to create
- `supabase/functions/backend-proxy/index.ts` -- proxy to Railway
- `src/pages/AdminArchitecture.tsx` -- live pipeline page
- `backend/Procfile` -- `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
- `backend/railway.json` -- build config

### Files to modify
- `src/pages/Index.tsx` -- call proxy instead of current functions
- `src/pages/Results.tsx` -- adapt response shape
- `src/pages/Admin.tsx` -- add link to architecture page
- `src/App.tsx` -- add `/admin/architecture` route
- `supabase/config.toml` -- add `backend-proxy` function config
- `supabase/functions/save-submission/index.ts` -- adapt field names

### Railway deployment steps (you do this outside Lovable)
1. Push the `backend/` folder to a GitHub repo
2. Connect it to Railway
3. Set env vars: `OPENAI_API_KEY`, `PORT`
4. Railway will auto-detect Python, install requirements, and run uvicorn
5. Run `python build_vectordb.py` as part of the build or include pre-built `chroma_db/`

