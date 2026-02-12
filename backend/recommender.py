"""
Programme recommender + personalised email generator.
Loads all programmes from JSON files and passes them to Anthropic Claude.
"""

import json
import os
import glob
import anthropic

PROGRAMME_PAGES_DIR = os.path.join(os.path.dirname(__file__), "programme_pages")

_programmes_cache = None


def load_all_programmes() -> list[dict]:
    """Load all programme JSON files and return summary dicts."""
    global _programmes_cache
    if _programmes_cache is not None:
        return _programmes_cache

    programmes = []
    json_files = glob.glob(
        os.path.join(PROGRAMME_PAGES_DIR, "**", "*.json"), recursive=True
    )

    for path in json_files:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            continue
        if "error" in data:
            continue

        url = data.get("url", "")
        category = ""
        if "/programmes/programmes-in-" in url:
            cat_part = url.split("/programmes/programmes-in-")[1].split("/")[0]
            category = cat_part.replace("-", " ").title()

        kf = data.get("key_facts", {})
        description = data.get("description", "")

        programmes.append({
            "title": data.get("title", "").strip(),
            "url": url,
            "category": category,
            "fee": kf.get("fee", ""),
            "format": kf.get("format", ""),
            "location": kf.get("location", ""),
            "start_date": kf.get("start_date", ""),
            "description_snippet": description[:400],
        })

    _programmes_cache = programmes
    return programmes


RECOMMEND_PROMPT = """You are an admissions consultant at Vlerick Business School.

Given this candidate's profile and the FULL list of available programmes, select the TOP 3 best programmes for this person. For each, explain in 2-3 sentences WHY it fits their background and goals.

Then write a warm, personalised outreach email (3-4 paragraphs) that:
- Addresses the candidate by name
- References their specific background and goals
- Introduces the top 3 recommended programmes with brief reasons
- Includes a call to action to learn more or book a consultation

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "title": "Programme Name",
      "url": "https://...",
      "category": "Category",
      "fee": "€X,XXX",
      "format": "X days",
      "location": "City",
      "reason": "Why this programme fits the candidate..."
    }
  ],
  "email_draft": "Full email text here..."
}"""


def recommend(profile: dict, categories: list[dict]) -> dict:
    """
    Generate programme recommendations and a personalised email.

    Args:
        profile: Structured candidate profile from profiler.py
        categories: Top zero-shot categories from classifier.py

    Returns:
        Dict with 'recommendations' list and 'email_draft' string.
    """
    # Load all programmes
    all_programmes = load_all_programmes()

    if not all_programmes:
        return {
            "recommendations": [],
            "email_draft": "No programmes available.",
        }

    # Build context for LLM
    candidate_summary = json.dumps(profile, indent=2)
    category_summary = ", ".join(
        f"{c['category']} ({c['score']:.0%})" for c in categories[:3]
    )
    programme_list = "\n\n".join(
        f"- {p['title']} ({p['category']})\n"
        f"  Fee: {p['fee']} | Format: {p['format']} | Location: {p['location']}\n"
        f"  URL: {p['url']}\n"
        f"  {p['description_snippet'][:300]}"
        for p in all_programmes
    )

    user_message = (
        f"CANDIDATE PROFILE:\n{candidate_summary}\n\n"
        f"TOP INTEREST AREAS: {category_summary}\n\n"
        f"ALL AVAILABLE PROGRAMMES ({len(all_programmes)} total):\n{programme_list}"
    )

    # LLM synthesis
    client = anthropic.Anthropic(api_key=os.environ.get("CLAUDE_API"))

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        system=RECOMMEND_PROMPT,
        messages=[
            {"role": "user", "content": user_message},
        ],
    )

    content = response.content[0].text.strip()

    # Parse JSON response
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {
            "recommendations": [
                {
                    "title": p["title"],
                    "url": p["url"],
                    "category": p["category"],
                    "fee": p["fee"],
                    "format": p["format"],
                    "location": p["location"],
                    "reason": f"Matched based on your interest in {p['category']}.",
                }
                for p in all_programmes[:3]
            ],
            "email_draft": content,
        }

    return result
