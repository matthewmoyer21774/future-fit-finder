"""
Builds a ChromaDB vector store from the scraped programme JSON files.

PURPOSE:
    This script creates a persistent vector database (ChromaDB) that can be
    used for RAG (Retrieval-Augmented Generation) queries.  Each Vlerick
    programme becomes a rich text document that is embedded using OpenAI's
    text-embedding-3-small model and stored with metadata.

    Run this script ONCE before starting the API server:
        $ python build_vectordb.py

WHAT IS ChromaDB?
    ChromaDB is an open-source embedding database.  It stores documents as
    high-dimensional vectors and supports fast approximate nearest-neighbour
    search via an HNSW (Hierarchical Navigable Small World) index.  We use
    it with cosine distance to find programmes semantically similar to a
    candidate's profile.

    See: https://docs.trychroma.com/

EMBEDDING MODEL:
    OpenAI text-embedding-3-small (1 536 dimensions, $0.02/1M tokens).
    Chosen for its balance of quality, speed, and cost.  Each programme
    document is typically 1 000–5 000 characters (~250–1 250 tokens).

    See: https://platform.openai.com/docs/guides/embeddings

DATA FLOW:
    programme_pages/*.json  →  build_document()  →  ChromaDB collection
                                                     (stored at chroma_db/)
"""

import json
import os
import glob
import time
import chromadb
from chromadb.utils import embedding_functions

# Path to the scraped programme JSON files
PROGRAMME_PAGES_DIR = os.path.join(os.path.dirname(__file__), "programme_pages")
# Path where the persistent ChromaDB database will be stored
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
# Name of the ChromaDB collection (like a "table" in a traditional DB)
COLLECTION_NAME = "vlerick_programmes"


def load_programmes():
    """
    Load all programme JSON files from the scraped data directory.

    Skips files that:
        - Are not dicts (e.g. arrays or primitives)
        - Contain an "error" key (indicating a scraping failure)

    Returns:
        List of raw programme dicts as scraped by vlerick_scraper.py.
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
    Build a single searchable text document from a programme's scraped data.

    STRATEGY:
        We concatenate all relevant text fields from the programme into one
        long passage.  This gives the embedding model maximum context to
        create a rich vector representation.

    DEDUPLICATION:
        Some programmes have overlapping content between sections, foldable
        sections, and descriptions.  We use a `seen_content` set to skip
        duplicate paragraphs.

    TRUNCATION:
        Individual sections are truncated to 2 000 chars and testimonials
        to 500 chars to prevent any single section from dominating the
        embedding.

    Args:
        prog: Raw programme dict from the scraped JSON.

    Returns:
        A single string containing all programme information, ready for
        embedding.
    """
    parts = []

    # Programme title — most important for matching
    title = prog.get("title", "").strip()
    if title:
        parts.append(f"Programme: {title}")

    # Subtitle — often contains a short tagline
    subtitle = prog.get("subtitle", "").strip()
    if subtitle:
        parts.append(f"Subtitle: {subtitle}")

    # Key facts — fee, format, location, duration, etc.
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

    # Programme content sections (e.g. "What you'll learn", "Programme structure")
    # We deduplicate to avoid embedding the same content twice
    seen_content = set()
    for section in prog.get("sections", []):
        heading = section.get("heading", "").strip()
        content = section.get("content", "").strip()
        # Only include sections with meaningful content (>20 chars)
        if content and content not in seen_content and len(content) > 20:
            seen_content.add(content)
            parts.append(f"{heading}: {content[:2000]}")  # Truncate long sections

    # Foldable sections — often contain module details, "Who should attend", etc.
    for fold in prog.get("foldable_sections", []):
        fold = fold.strip()
        if fold and fold not in seen_content and len(fold) > 20:
            seen_content.add(fold)
            parts.append(fold[:2000])

    # Testimonials — provide social proof and programme context
    for t in prog.get("testimonials", []):
        t = t.strip()
        if t and len(t) > 20:
            parts.append(f"Testimonial: {t[:500]}")  # Truncate long testimonials

    # Join all parts with double newlines for clear separation
    return "\n\n".join(parts)


def build_metadata(prog):
    """
    Extract metadata for a programme document.

    Metadata is stored alongside the embedding in ChromaDB and can be used
    for filtering queries (e.g. "only show programmes in the Strategy category").

    The category is extracted from the programme URL following the pattern:
        .../programmes/programmes-in-<category-slug>/<programme-name>/

    Args:
        prog: Raw programme dict from the scraped JSON.

    Returns:
        Dict with keys: title, url, category, fee, format, location, start_date.
    """
    kf = prog.get("key_facts", {})
    url = prog.get("url", "")

    # Extract category from URL slug
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
    Main entry point — builds the complete vector database.

    Steps:
        1. Load all scraped programme JSON files.
        2. Initialise ChromaDB with OpenAI embedding function.
        3. Delete any existing collection (for a clean rebuild).
        4. Create a new collection with HNSW cosine distance index.
        5. Build text documents and metadata for each programme.
        6. Embed and insert documents in batches of 20 with retry logic.
    """
    print("Loading scraped programme data...")
    programmes = load_programmes()
    print(f"  Found {len(programmes)} programmes\n")

    # -----------------------------------------------------------------------
    # Set up ChromaDB with OpenAI embeddings
    # -----------------------------------------------------------------------
    # ChromaDB's OpenAIEmbeddingFunction expects CHROMA_OPENAI_API_KEY or
    # the key passed directly.  We fall back from the standard OPENAI_API_KEY.
    # -----------------------------------------------------------------------
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if api_key and not os.environ.get("CHROMA_OPENAI_API_KEY"):
        os.environ["CHROMA_OPENAI_API_KEY"] = api_key
    print("Initializing ChromaDB with OpenAI embeddings...")
    ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-3-small",  # 1536-dim embeddings
    )

    # PersistentClient stores the database on disk at CHROMA_DIR
    client = chromadb.PersistentClient(path=CHROMA_DIR)

    # Delete existing collection for a clean rebuild (idempotent)
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass  # Collection didn't exist — that's fine

    # Create collection with HNSW index using cosine distance
    # HNSW (Hierarchical Navigable Small World) is an approximate nearest-
    # neighbour algorithm that offers sub-millisecond query times.
    # "cosine" space means vectors are compared by angular similarity,
    # consistent with our classifier.py approach.
    collection = client.create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )

    # -----------------------------------------------------------------------
    # Build documents from scraped data
    # -----------------------------------------------------------------------
    documents = []
    metadatas = []
    ids = []

    for i, prog in enumerate(programmes):
        doc = build_document(prog)
        meta = build_metadata(prog)

        if not doc.strip():
            continue  # Skip programmes with no extractable text

        documents.append(doc)
        metadatas.append(meta)
        ids.append(f"prog_{i}")  # Unique ID per document

        print(f"  [{i+1}/{len(programmes)}] {meta['title'][:50]}... "
              f"({len(doc)} chars, category: {meta['category']})")

    # -----------------------------------------------------------------------
    # Embed and insert documents in batches
    # -----------------------------------------------------------------------
    # We batch in groups of 20 to avoid hitting OpenAI's rate limits.
    # Each batch triggers one embedding API call for 20 documents.
    # Exponential backoff retry logic handles transient API errors.
    # -----------------------------------------------------------------------
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
                # collection.add() embeds the documents using the configured
                # embedding function and stores them with metadata
                collection.add(documents=batch_docs, metadatas=batch_metas, ids=batch_ids)
                print(f"  Batch {start // BATCH_SIZE + 1} ({start+1}-{end}) embedded OK")
                break
            except Exception as e:
                # Exponential backoff: wait 2, 4, 8 seconds
                wait = 2 ** attempt
                print(f"  Batch {start // BATCH_SIZE + 1} attempt {attempt} failed: {e}")
                if attempt == MAX_RETRIES:
                    raise  # Give up after MAX_RETRIES
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)

    print(f"\n{'=' * 50}")
    print(f"  Vector DB built successfully!")
    print(f"  Documents: {collection.count()}")
    print(f"  Location:  {CHROMA_DIR}")
    print(f"{'=' * 50}")


if __name__ == "__main__":
    main()
