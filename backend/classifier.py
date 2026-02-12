"""
Embedding-based classification of candidate career goals into Vlerick programme categories.
Uses OpenAI text-embedding-3-small embeddings with cosine similarity against category exemplars.

HOW IT WORKS:
  1. We define 12 Vlerick programme categories, each with ~12 "exemplar"
     phrases that describe typical career goals/skills for that category.
  2. On first call, we embed ALL 144 exemplar phrases (12 categories x 12
     phrases) into vectors using OpenAI's text-embedding-3-small model.
  3. For each category, we average its 12 exemplar vectors to get a single
     "centroid" vector — this represents the category's meaning in embedding
     space.
  4. When a candidate's text comes in, we embed it into the same space and
     compute cosine similarity against each category centroid.
  5. We return the top-k categories sorted by similarity score.

WHY THIS APPROACH?
  - More nuanced than keyword matching — captures semantic meaning.
  - The exemplar phrases act as "training examples" that define each
    category's semantic region without needing labelled data.
  - Centroids are cached after first computation, so subsequent calls
    only need to embed the candidate text (1 API call).
  - Uses OpenAI's text-embedding-3-small model which is fast and cheap.

This module is called by main.py (Step 3) to determine which programme
categories best match the candidate before the recommendation step.
"""

import os
from openai import OpenAI
import numpy as np

# ── The 12 Vlerick executive education categories ───────────────────
# Each category has 12 exemplar phrases that represent typical career
# goals, skills, or interests for someone who would benefit from
# programmes in that area. These are embedded and averaged into
# "centroid" vectors for classification.
CATEGORY_EXEMPLARS: dict[str, list[str]] = {
    "Accounting & Finance": [
        "financial reporting and analysis",
        "corporate finance strategy",
        "budgeting and forecasting",
        "risk management in banking",
        "investment portfolio management",
        "audit and compliance",
        "CFO leadership",
        "treasury management",
        "mergers and acquisitions valuation",
        "financial modelling",
        "capital markets",
        "cost accounting",
    ],
    "Digital Transformation and AI": [
        "digital transformation strategy",
        "AI implementation in business",
        "machine learning for enterprise",
        "data-driven decision making",
        "technology leadership",
        "digital innovation",
        "automation and process optimization",
        "cloud migration strategy",
        "cybersecurity management",
        "digital product development",
        "tech startup scaling",
        "AI governance",
    ],
    "Entrepreneurship": [
        "launching a startup",
        "venture capital fundraising",
        "business model innovation",
        "scaling a new venture",
        "entrepreneurial mindset",
        "lean startup methodology",
        "founder leadership",
        "growth hacking strategies",
        "building an MVP",
        "social entrepreneurship",
        "family business succession",
        "corporate entrepreneurship",
    ],
    "General Management": [
        "executive leadership development",
        "general management skills",
        "cross-functional leadership",
        "business administration",
        "corporate governance",
        "organisational management",
        "executive MBA preparation",
        "senior management transition",
        "business strategy execution",
        "C-suite readiness",
        "multi-unit management",
        "international business management",
    ],
    "Healthcare Management": [
        "hospital administration",
        "healthcare policy",
        "pharmaceutical management",
        "health system transformation",
        "clinical leadership",
        "patient care quality improvement",
        "health tech innovation",
        "medical device commercialisation",
        "public health strategy",
        "healthcare operations",
        "nursing leadership",
        "biotech management",
    ],
    "Human Resource Management": [
        "talent acquisition strategy",
        "employee engagement",
        "compensation and benefits design",
        "HR digital transformation",
        "workforce planning",
        "diversity and inclusion programs",
        "organisational development",
        "HR analytics",
        "labour relations",
        "learning and development strategy",
        "employer branding",
        "succession planning",
    ],
    "Innovation Management": [
        "product innovation strategy",
        "design thinking",
        "R&D management",
        "open innovation",
        "innovation culture building",
        "technology transfer",
        "creative problem solving",
        "disruptive innovation",
        "innovation portfolio management",
        "intrapreneurship",
        "commercialising research",
        "innovation ecosystems",
    ],
    "Marketing & Sales": [
        "brand strategy and management",
        "digital marketing campaigns",
        "B2B sales leadership",
        "customer experience optimisation",
        "marketing analytics",
        "content marketing strategy",
        "sales team management",
        "go-to-market strategy",
        "consumer behaviour insights",
        "pricing strategy",
        "key account management",
        "omnichannel marketing",
    ],
    "Operations & Supply Chain Management": [
        "supply chain optimisation",
        "lean manufacturing",
        "logistics management",
        "procurement strategy",
        "quality management systems",
        "operations excellence",
        "inventory management",
        "production planning",
        "global supply chain resilience",
        "warehouse automation",
        "Six Sigma",
        "demand forecasting",
    ],
    "People Management & Leadership": [
        "team leadership development",
        "executive coaching skills",
        "conflict resolution",
        "performance management",
        "leadership communication",
        "change management",
        "emotional intelligence in leadership",
        "cross-cultural team management",
        "coaching and mentoring",
        "servant leadership",
        "leading remote teams",
        "stakeholder management",
    ],
    "Strategy": [
        "corporate strategy development",
        "competitive analysis",
        "strategic planning",
        "market entry strategy",
        "business transformation",
        "strategic partnerships",
        "scenario planning",
        "portfolio strategy",
        "strategic decision making",
        "industry disruption analysis",
        "growth strategy",
        "strategic consulting",
    ],
    "Sustainability": [
        "ESG strategy and reporting",
        "sustainable business models",
        "circular economy",
        "carbon footprint reduction",
        "corporate social responsibility",
        "sustainable supply chains",
        "green finance",
        "climate risk management",
        "sustainability leadership",
        "impact investing",
        "environmental compliance",
        "net zero strategy",
    ],
}

# ── Module-level cache ──────────────────────────────────────────────
# Once we embed all 144 exemplar phrases and compute the 12 centroids,
# we cache them here so we only pay for that API call once per server
# lifetime. Subsequent classify_goals() calls reuse these centroids.
_category_centroids: dict[str, np.ndarray] | None = None


def _get_client() -> OpenAI:
    """Create an OpenAI client using the OPENAI_API_KEY env var."""
    return OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def _embed(client: OpenAI, texts: list[str]) -> list[np.ndarray]:
    """
    Embed a list of text strings into vectors using OpenAI's API.

    Uses the text-embedding-3-small model which produces 1536-dimensional
    vectors. This is OpenAI's fastest/cheapest embedding model.

    Args:
        client : an initialised OpenAI client
        texts  : list of strings to embed

    Returns:
        List of numpy arrays, one per input text.
    """
    response = client.embeddings.create(model="text-embedding-3-small", input=texts)
    return [np.array(d.embedding, dtype=np.float32) for d in response.data]


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors.

    Cosine similarity measures how similar two vectors are in direction
    (ignoring magnitude). Returns a value between -1 and 1, where:
      1.0  = identical direction (perfect match)
      0.0  = orthogonal (no relationship)
     -1.0  = opposite direction

    Handles zero vectors gracefully by returning 0.0.
    """
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def _build_centroids(client: OpenAI) -> dict[str, np.ndarray]:
    """
    Embed all exemplar phrases and compute the mean centroid per category.

    How it works:
      1. Flatten all 144 exemplar phrases into a single list.
      2. Embed them all in ONE API call (efficient — stays under limits).
      3. Group the resulting vectors by category.
      4. Average (mean) each group to get a single centroid vector per category.

    The centroid represents the "semantic centre" of each category —
    candidate text that is close to a centroid in embedding space is
    a good fit for that category.

    Results are cached in _category_centroids after first computation.

    Args:
        client : an initialised OpenAI client

    Returns:
        Dict mapping category name → centroid numpy array.
    """
    global _category_centroids
    if _category_centroids is not None:
        return _category_centroids

    # Flatten all exemplars into one list, tracking which category each belongs to
    all_phrases: list[str] = []
    category_indices: list[tuple[str, int, int]] = []  # (category_name, start_idx, end_idx)

    for category, phrases in CATEGORY_EXEMPLARS.items():
        start = len(all_phrases)
        all_phrases.extend(phrases)
        end = len(all_phrases)
        category_indices.append((category, start, end))

    # Embed all 144 phrases in one API call (well within rate limits)
    all_embeddings = _embed(client, all_phrases)

    # Compute centroid (mean vector) for each category
    centroids: dict[str, np.ndarray] = {}
    for category, start, end in category_indices:
        category_embeddings = np.array(all_embeddings[start:end])
        centroids[category] = np.mean(category_embeddings, axis=0)

    _category_centroids = centroids
    return centroids


def classify_goals(text: str, top_k: int = 3) -> list[dict]:
    """
    Classify a candidate's career goals/profile text against the 12 Vlerick categories.

    Pipeline:
      1. Build (or retrieve cached) category centroid embeddings.
      2. Embed the candidate's text into the same vector space.
      3. Compute cosine similarity between the candidate vector and each centroid.
      4. Return the top-k categories sorted by similarity (highest first).

    Args:
        text  : the candidate's career goals, skills, and background combined
                into a single string.
        top_k : how many top categories to return (default 3).

    Returns:
        List of dicts sorted by score descending, e.g.:
        [
            {"category": "Strategy",           "score": 0.8521},
            {"category": "General Management", "score": 0.7103},
            {"category": "Marketing & Sales",  "score": 0.5890},
        ]
    """
    client = _get_client()

    # Build or retrieve cached centroid vectors for all 12 categories
    centroids = _build_centroids(client)

    # Embed the candidate text into the same vector space
    candidate_embedding = _embed(client, [text])[0]

    # Score the candidate against each category centroid
    scores = []
    for category, centroid in centroids.items():
        similarity = _cosine_similarity(candidate_embedding, centroid)
        scores.append({"category": category, "score": round(similarity, 4)})

    # Sort by score descending and return the top-k
    scores.sort(key=lambda x: x["score"], reverse=True)
    return scores[:top_k]
