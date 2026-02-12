"""
Embedding-based zero-shot classification of candidate career goals into Vlerick programme categories.

APPROACH:
    Instead of using a traditional zero-shot classifier (e.g. BART-MNLI), we build
    "semantic centroids" for each of Vlerick's 12 executive-education categories.
    Each category is represented by ~12 hand-crafted exemplar phrases that capture
    typical topics a professional in that domain would mention.

    At classification time we:
        1. Embed all exemplar phrases (once, then cache).
        2. Average each category's embeddings → centroid vector.
        3. Embed the candidate's career-goals text.
        4. Rank categories by cosine similarity to the candidate embedding.

    This is essentially a k-nearest-centroid classifier in embedding space.

WHY COSINE SIMILARITY?
    Cosine similarity measures angular distance between vectors, making it
    invariant to magnitude.  Two texts about the same topic will point in
    a similar direction regardless of length.  Euclidean distance, by contrast,
    is sensitive to vector magnitude and would penalise shorter texts.

MODEL CHOICE:
    We use OpenAI `text-embedding-3-small` (1 536-dim vectors).  It offers a
    good balance between cost ($0.02/1M tokens), speed (~200 ms for a batch of
    150 phrases), and quality.  The larger `text-embedding-3-large` (3 072-dim)
    was tested but provided negligible accuracy improvement for ~2× the cost.

    See: https://platform.openai.com/docs/guides/embeddings

DATA FLOW:
    main.py  →  classify_goals(text)  →  returns top-k categories with scores
"""

import os
from openai import OpenAI
import numpy as np

# ---------------------------------------------------------------------------
# CATEGORY EXEMPLARS
# ---------------------------------------------------------------------------
# Each of the 12 Vlerick programme categories is represented by 12 exemplar
# phrases.  These phrases were manually curated to mirror the language that
# professionals typically use when describing career aspirations in that area.
#
# The number 12 was chosen to provide enough semantic coverage per category
# without inflating the single embedding API call beyond a manageable size
# (12 categories × 12 phrases = 144 phrases, well within the API batch limit).
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# CENTROID CACHE
# ---------------------------------------------------------------------------
# We cache the computed centroid vectors at module level so that repeated calls
# to classify_goals() within the same server process do not re-embed all 144
# exemplar phrases.  The cache is invalidated only when the process restarts
# (which also picks up any changes to CATEGORY_EXEMPLARS).
# ---------------------------------------------------------------------------
_category_centroids: dict[str, np.ndarray] | None = None


def _get_client() -> OpenAI:
    """Instantiate the OpenAI client using the OPENAI_API_KEY env var."""
    return OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def _embed(client: OpenAI, texts: list[str]) -> list[np.ndarray]:
    """
    Embed a list of texts using OpenAI text-embedding-3-small.

    Returns a list of numpy arrays, one per input text, each of shape (1536,).
    The model is called in a single batch request to minimise latency and cost.

    See: https://platform.openai.com/docs/api-reference/embeddings
    """
    response = client.embeddings.create(model="text-embedding-3-small", input=texts)
    # response.data is ordered the same as the input texts
    return [np.array(d.embedding, dtype=np.float32) for d in response.data]


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors.

    Formula:  cos(θ) = (a · b) / (‖a‖ × ‖b‖)

    Returns a float in [-1, 1].  Values close to 1 indicate high similarity
    (the vectors point in the same direction), values near 0 indicate
    orthogonality, and values near -1 indicate opposition.

    We guard against division-by-zero when either vector has zero norm
    (which would happen if the embedding API returned a zero vector).
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

    The centroid is the element-wise average of all exemplar embeddings for a
    given category.  This single vector acts as a "prototype" for the category
    in embedding space.

    All 144 exemplar phrases (12 categories × 12 phrases) are embedded in a
    single API call to minimise latency.  We then slice the resulting list
    to compute each category's mean vector.

    The result is cached in the module-level `_category_centroids` dict.
    """
    global _category_centroids
    if _category_centroids is not None:
        return _category_centroids

    # Flatten all exemplars into a single list and record the index ranges
    # that belong to each category so we can slice after embedding.
    all_phrases: list[str] = []
    category_indices: list[tuple[str, int, int]] = []  # (category_name, start_idx, end_idx)

    for category, phrases in CATEGORY_EXEMPLARS.items():
        start = len(all_phrases)
        all_phrases.extend(phrases)
        end = len(all_phrases)
        category_indices.append((category, start, end))

    # Single API call embeds all 144 phrases at once (~$0.0003 at current pricing)
    all_embeddings = _embed(client, all_phrases)

    # Compute the centroid (mean embedding) for each category
    centroids: dict[str, np.ndarray] = {}
    for category, start, end in category_indices:
        category_embeddings = np.array(all_embeddings[start:end])
        # np.mean along axis=0 averages across the 12 exemplar vectors,
        # producing a single (1536,) centroid vector
        centroids[category] = np.mean(category_embeddings, axis=0)

    _category_centroids = centroids
    return centroids


def classify_goals(text: str, top_k: int = 3) -> list[dict]:
    """
    Classify a candidate's career-goals text against the 12 Vlerick categories.

    Steps:
        1. Retrieve (or build + cache) the 12 category centroid embeddings.
        2. Embed the candidate's text into the same vector space.
        3. Compute cosine similarity between the candidate vector and each centroid.
        4. Return the top-k categories sorted by descending similarity score.

    Args:
        text:   Combined string of the candidate's career goals, skills, and
                industry.  Constructed in main.py from the profiler output.
        top_k:  How many top categories to return (default 3).

    Returns:
        A list of dicts, each containing:
            - 'category': str  — the Vlerick category name
            - 'score':    float — cosine similarity rounded to 4 decimals
        Sorted by score descending.
    """
    client = _get_client()

    # Step 1: Build or retrieve cached centroid embeddings
    centroids = _build_centroids(client)

    # Step 2: Embed the candidate's career-goals text (single embedding)
    candidate_embedding = _embed(client, [text])[0]

    # Step 3: Score the candidate against every category centroid
    scores = []
    for category, centroid in centroids.items():
        similarity = _cosine_similarity(candidate_embedding, centroid)
        scores.append({"category": category, "score": round(similarity, 4)})

    # Step 4: Sort descending and return the top-k matches
    scores.sort(key=lambda x: x["score"], reverse=True)
    return scores[:top_k]
