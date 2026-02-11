"""
Embedding-based classification of candidate career goals into Vlerick programme categories.
Uses OpenAI text-embedding-3-small embeddings with cosine similarity against category exemplars.
"""

import os
from openai import OpenAI
import numpy as np

# The 12 Vlerick executive education categories with exemplar phrases
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

# Module-level cache for category centroid embeddings
_category_centroids: dict[str, np.ndarray] | None = None


def _get_client() -> OpenAI:
    return OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def _embed(client: OpenAI, texts: list[str]) -> list[np.ndarray]:
    """Embed a list of texts using text-embedding-3-small."""
    response = client.embeddings.create(model="text-embedding-3-small", input=texts)
    return [np.array(d.embedding, dtype=np.float32) for d in response.data]


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def _build_centroids(client: OpenAI) -> dict[str, np.ndarray]:
    """Embed all exemplar phrases and compute mean centroid per category."""
    global _category_centroids
    if _category_centroids is not None:
        return _category_centroids

    # Flatten all exemplars and track which category each belongs to
    all_phrases: list[str] = []
    category_indices: list[tuple[str, int, int]] = []  # (category, start, end)

    for category, phrases in CATEGORY_EXEMPLARS.items():
        start = len(all_phrases)
        all_phrases.extend(phrases)
        end = len(all_phrases)
        category_indices.append((category, start, end))

    # Embed all phrases in one API call (144 phrases fits easily)
    all_embeddings = _embed(client, all_phrases)

    # Compute centroid per category
    centroids: dict[str, np.ndarray] = {}
    for category, start, end in category_indices:
        category_embeddings = np.array(all_embeddings[start:end])
        centroids[category] = np.mean(category_embeddings, axis=0)

    _category_centroids = centroids
    return centroids


def classify_goals(text: str, top_k: int = 3) -> list[dict]:
    """
    Classify career goals/profile text against the 12 Vlerick categories
    using embedding cosine similarity.

    Args:
        text: The candidate's career goals, skills, and background combined.
        top_k: Number of top categories to return.

    Returns:
        List of dicts with 'category' and 'score', sorted by score descending.
    """
    client = _get_client()

    # Build or retrieve cached centroids
    centroids = _build_centroids(client)

    # Embed the candidate text
    candidate_embedding = _embed(client, [text])[0]

    # Score against each category centroid
    scores = []
    for category, centroid in centroids.items():
        similarity = _cosine_similarity(candidate_embedding, centroid)
        scores.append({"category": category, "score": round(similarity, 4)})

    # Sort by score descending
    scores.sort(key=lambda x: x["score"], reverse=True)
    return scores[:top_k]
