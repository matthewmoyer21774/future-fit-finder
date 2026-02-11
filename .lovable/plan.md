

# Fix Railway Deployment by Replacing Heavy ML Libraries with OpenAI API

## Problem
The Railway build keeps failing ("context canceled") because the Python dependencies include **torch** (~2GB), **transformers** (~500MB), and **sentence-transformers** -- making the Docker image too large to export within Railway's limits.

## Solution
Replace the local ML models with OpenAI API calls you already have access to. This keeps the exact same functionality but shrinks the build from ~5GB to ~200MB.

### What stays the same
- FastAPI server structure
- CV parsing (pypdf, python-docx)
- Profile extraction (already uses OpenAI)
- ChromaDB vector search logic
- Recommendation synthesis (already uses OpenAI)
- The proxy edge function and frontend -- no changes needed

### What changes

**1. `backend/requirements.txt`** -- Remove heavy libraries
- Remove: `torch`, `transformers`, `sentence-transformers`
- The remaining deps (fastapi, chromadb, openai, pypdf, etc.) are lightweight

**2. `backend/classifier.py`** -- Replace BART with OpenAI
- Instead of running facebook/bart-large-mnli locally, call GPT-4o-mini to classify career goals into the 12 Vlerick categories
- Same input/output format: takes text, returns top 3 categories with scores

**3. `backend/build_vectordb.py`** -- Replace sentence-transformers with OpenAI embeddings
- Use ChromaDB's OpenAI embedding function instead of SentenceTransformerEmbeddingFunction
- Model: `text-embedding-3-small` (fast, cheap, high quality)
- Requires OPENAI_API_KEY at build time (already configured as Railway env var)

**4. `backend/recommender.py`** -- Match embedding function
- Update `get_collection()` to use the same OpenAI embedding function so queries match the stored embeddings

**5. `backend/build_vectordb.py`** -- Fix programme_pages path
- Since Railway's root directory is `backend/`, the `../programme_pages` path won't exist
- Copy the `programme_pages/` folder into `backend/programme_pages/` so it ships with the deploy
- Update the path reference accordingly

**6. `backend/Procfile`** -- No changes needed
- Already runs `python build_vectordb.py && uvicorn main:app ...`

## Technical Details

### New `requirements.txt`
```
fastapi
uvicorn[standard]
python-multipart
pypdf
python-docx
trafilatura
chromadb
openai
```

### Classifier change (classifier.py)
Replace the BART pipeline with an OpenAI call that returns JSON with category scores. Same interface: `classify_goals(text, top_k=3) -> list[dict]`

### Embedding change (build_vectordb.py + recommender.py)
```python
from chromadb.utils import embedding_functions
ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key=os.environ.get("OPENAI_API_KEY"),
    model_name="text-embedding-3-small"
)
```

### Programme data
Copy `programme_pages/` into `backend/programme_pages/` and update the path in `build_vectordb.py` and `main.py` to look in the local directory.

## After deployment
Once Railway builds successfully (should take under 2 minutes), visit `https://your-domain.up.railway.app/health` to confirm, then test the full CV upload flow in the app.

