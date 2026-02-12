"""
Zero-shot classification of candidate career goals into Vlerick programme categories.
Uses OpenAI GPT-4o-mini for lightweight, fast classification.
"""

import json
import os
from openai import OpenAI

# The 12 Vlerick executive education categories
VLERICK_CATEGORIES = [
    "Accounting & Finance",
    "Digital Transformation and AI",
    "Entrepreneurship",
    "General Management",
    "Healthcare Management",
    "Human Resource Management",
    "Innovation Management",
    "Marketing & Sales",
    "Operations & Supply Chain Management",
    "People Management & Leadership",
    "Strategy",
    "Sustainability",
]

CLASSIFY_PROMPT = f"""You are a classifier. Given the candidate text, score each of these categories from 0.0 to 1.0 based on relevance:

{json.dumps(VLERICK_CATEGORIES)}

Return ONLY a JSON array of objects with "category" and "score" keys, sorted by score descending. Example:
[{{"category": "Strategy", "score": 0.85}}, ...]

Return ALL 12 categories with scores."""


def classify_goals(text: str, top_k: int = 3) -> list[dict]:
    """
    Classify career goals/profile text against the 12 Vlerick categories.

    Args:
        text: The candidate's career goals, skills, and background combined.
        top_k: Number of top categories to return.

    Returns:
        List of dicts with 'category' and 'score', sorted by score descending.
    """
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": CLASSIFY_PROMPT},
            {"role": "user", "content": text},
        ],
        temperature=0.3,
        max_tokens=500,
    )

    content = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]

    try:
        categories = json.loads(content)
        # Ensure proper format
        for cat in categories:
            cat["score"] = round(float(cat["score"]), 4)
        # Sort by score descending and return top_k
        categories.sort(key=lambda x: x["score"], reverse=True)
        return categories[:top_k]
    except (json.JSONDecodeError, KeyError):
        # Fallback: return first top_k categories with equal scores
        return [{"category": c, "score": round(1.0 / (i + 1), 4)} for i, c in enumerate(VLERICK_CATEGORIES[:top_k])]
