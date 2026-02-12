"""
Builds a ChromaDB vector store from the scraped programme JSON files.
Each programme becomes one or more documents with metadata.
Run this once before starting the API server.

HOW IT WORKS:
  1. Scans all JSON files under programme_pages/ (one per scraped programme).
  2. For each programme, combines title, description, sections, testimonials,
     etc. into a single searchable text document.
  3. Extracts structured metadata (title, url, category, fee, etc.) for filtering.
  4. Embeds all documents using OpenAI's text-embedding-3-small model.
  5. Stores the embeddings + metadata in a ChromaDB persistent collection
     with cosine similarity indexing.

WHY A VECTOR DB?
  - Enables semantic search: "leadership skills for finance" will match
    programmes about financial leadership even without exact keyword overlap.
  - ChromaDB stores everything locally on disk — no external DB server needed.
  - The pre-built index makes vector search fast at query time.

NOTE: This script is run ONCE during setup (or when programme data changes).
The resulting chroma_db/ folder is then used by the API server at runtime.

USAGE:
  python build_vectordb.py
"""

import json
import os
import glob
import time
import chromadb
from chromadb.utils import embedding_functions

# ── Path configuration ──────────────────────────────────────────────
# PROGRAMME_PAGES_DIR : where the scraped JSON files live (one per programme)
# CHROMA_DIR          : where the ChromaDB persistent database is stored
# COLLECTION_NAME     : name of the single collection inside ChromaDB
PROGRAMME_PAGES_DIR = os.path.join(os.path.dirname(__file__), "programme_pages")
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "vlerick_programmes"


def load_programmes():
    """
    Load all programme JSON files from the scraped data directory.

    Scans programme_pages/ recursively for .json files. Skips any file
    that isn't a dict (e.g. programmes_database.json which is an array)
    or that contains an "error" key (scraping failures).

    Returns:
        List of programme dicts, each containing scraped fields like
        title, url, key_facts, description, sections, etc.
    """
    programmes = []
    json_files = glob.glob(os.path.join(PROGRAMME_PAGES_DIR, "**", "*.json"), recursive=True)

    for path in json_files:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Skip files that had errors during scraping
        if not isinstance(data, dict):
            continue
        if "error" in data:
            continue

        programmes.append(data)

    return programmes


def build_document(prog):
    """
    Build a single text document from a programme's scraped data.

    Combines all relevant fields into one searchable passage that will
    be embedded into a vector. The more text we include, the richer
    the embedding — but we cap sections at 2000 chars and testimonials
    at 500 chars to keep document sizes reasonable.

    Content is deduplicated using a set to avoid repeating the same
    text from different scraped fields.

    Args:
        prog : a programme dict from load_programmes()

    Returns:
        A single string with all programme info, sections separated by
        double newlines.
    """
    parts = []

    # Programme title (most important for matching)
    title = prog.get("title", "").strip()
    if title:
        parts.append(f"Programme: {title}")

    # Subtitle (often contains a summary tagline)
    subtitle = prog.get("subtitle", "").strip()
    if subtitle:
        parts.append(f"Subtitle: {subtitle}")

    # Key facts (fee, format, location, etc.) — pipe-separated for readability
    kf = prog.get("key_facts", {})
    if kf:
        facts = []
        for k, v in kf.items():
            facts.append(f"{k}: {v}")
        parts.append("Key Facts: " + " | ".join(facts))

    # Main description
    description = prog.get("description", "").strip()
    if description:
        parts.append(f"Description: {description}")

    # Programme content sections (deduplicated to avoid repeated text)
    seen_content = set()
    for section in prog.get("sections", []):
        heading = section.get("heading", "").strip()
        content = section.get("content", "").strip()
        # Only include sections with meaningful content (>20 chars)
        if content and content not in seen_content and len(content) > 20:
            seen_content.add(content)
            parts.append(f"{heading}: {content[:2000]}")  # cap at 2000 chars

    # Foldable sections (often contain detailed module breakdowns)
    for fold in prog.get("foldable_sections", []):
        fold = fold.strip()
        if fold and fold not in seen_content and len(fold) > 20:
            seen_content.add(fold)
            parts.append(fold[:2000])

    # Testimonials from past participants
    for t in prog.get("testimonials", []):
        t = t.strip()
        if t and len(t) > 20:
            parts.append(f"Testimonial: {t[:500]}")  # cap at 500 chars

    return "\n\n".join(parts)


def build_metadata(prog):
    """
    Extract structured metadata for a programme document.

    This metadata is stored alongside the embedding in ChromaDB and
    can be returned in search results without needing to parse the
    full document text.

    The category is extracted from the programme URL path:
      e.g. ".../programmes-in-accounting-finance/..." → "Accounting Finance"

    Args:
        prog : a programme dict from load_programmes()

    Returns:
        Dict with: title, url, category, fee, format, location, start_date
    """
    kf = prog.get("key_facts", {})
    url = prog.get("url", "")

    # Extract category from URL path pattern
    category = ""
    if "/programmes/programmes-in-" in url:
        cat_part = url.split("/programmes/programmes-in-")[1].split("/")[0]
        category = cat_part.replace("-", " ").title()

    return {
        "title": prog.get("title", "").strip(),
        "url": url,
        "category": category,
        "fee": kf.get("fee", ""),
        "format": kf.get("format", ""),
        "location": kf.get("location", ""),
        "start_date": kf.get("start_date", ""),
    }


def main():
    """
    Main entry point — builds the vector database from scratch.

    Steps:
      1. Load all programme JSON files from disk.
      2. Set up ChromaDB with OpenAI's text-embedding-3-small model.
      3. Delete any existing collection (clean rebuild each time).
      4. Build text documents + metadata for each programme.
      5. Embed and store in batches of 20, with retry logic for API errors.
    """
    print("Loading scraped programme data...")
    programmes = load_programmes()
    print(f"  Found {len(programmes)} programmes\n")

    # ── Set up ChromaDB with OpenAI embeddings ──────────────────────
    # ChromaDB's OpenAI integration looks for CHROMA_OPENAI_API_KEY by default.
    # We fall back from OPENAI_API_KEY if CHROMA_OPENAI_API_KEY isn't set.
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if api_key and not os.environ.get("CHROMA_OPENAI_API_KEY"):
        os.environ["CHROMA_OPENAI_API_KEY"] = api_key
    print("Initializing ChromaDB with OpenAI embeddings...")
    ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-3-small",  # fast, cheap, 1536-dim vectors
    )

    # PersistentClient saves the DB to disk so it survives server restarts
    client = chromadb.PersistentClient(path=CHROMA_DIR)

    # Delete existing collection if it exists (clean rebuild each time)
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    # Create a new collection with cosine similarity indexing
    # HNSW (Hierarchical Navigable Small World) is the underlying
    # approximate nearest-neighbor algorithm used by ChromaDB.
    collection = client.create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},  # use cosine distance for similarity
    )

    # ── Build documents and metadata ────────────────────────────────
    documents = []
    metadatas = []
    ids = []

    for i, prog in enumerate(programmes):
        doc = build_document(prog)
        meta = build_metadata(prog)

        if not doc.strip():
            continue

        documents.append(doc)
        metadatas.append(meta)
        ids.append(f"prog_{i}")

        print(f"  [{i+1}/{len(programmes)}] {meta['title'][:50]}... "
              f"({len(doc)} chars, category: {meta['category']})")

    # ── Embed and store in batches ──────────────────────────────────
    # We batch in groups of 20 to avoid hitting OpenAI's rate limits.
    # Each batch is retried up to 3 times with exponential backoff
    # (2s, 4s, 8s) in case of transient API errors.
    BATCH_SIZE = 20
    MAX_RETRIES = 3
    print(f"\nEmbedding {len(documents)} documents in batches of {BATCH_SIZE}...")

    for start in range(0, len(documents), BATCH_SIZE):
        end = min(start + BATCH_SIZE, len(documents))
        batch_docs = documents[start:end]
        batch_metas = metadatas[start:end]
        batch_ids = ids[start:end]

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                collection.add(documents=batch_docs, metadatas=batch_metas, ids=batch_ids)
                print(f"  Batch {start // BATCH_SIZE + 1} ({start+1}-{end}) embedded OK")
                break
            except Exception as e:
                wait = 2 ** attempt  # exponential backoff: 2s, 4s, 8s
                print(f"  Batch {start // BATCH_SIZE + 1} attempt {attempt} failed: {e}")
                if attempt == MAX_RETRIES:
                    raise  # give up after 3 attempts
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)

    print(f"\n{'=' * 50}")
    print(f"  Vector DB built successfully!")
    print(f"  Documents: {collection.count()}")
    print(f"  Location:  {CHROMA_DIR}")
    print(f"{'=' * 50}")


if __name__ == "__main__":
    main()
