"""
Programme recommender + personalised email generator.
Loads all programmes from JSON files and passes them to Anthropic Claude.

HOW IT WORKS:
  1. Loads ALL 61 Vlerick programme summaries from scraped JSON files on disk.
  2. Takes the candidate's structured profile (from profiler.py) and their
     top interest categories (from classifier.py).
  3. Assembles a single large prompt containing the candidate info + the
     FULL programme catalogue.
  4. Sends it to Claude Sonnet 4 which picks the TOP 3 best-fit programmes
     and writes a personalised outreach email.
  5. Returns the recommendations + email as a JSON dict.

NOTE: This is NOT a RAG/vector-search approach — we pass ALL programmes
directly to the LLM and let it choose. This works because the total
programme catalogue fits within Claude's context window.
"""

import json
import os
import glob
import anthropic

# ── Configuration ────────────────────────────────────────────────────
# Path to the folder containing one JSON file per scraped programme.
# Each JSON has: title, url, key_facts, description, sections, etc.
PROGRAMME_PAGES_DIR = os.path.join(os.path.dirname(__file__), "programme_pages")

# Module-level cache — we load programmes from disk once and reuse.
# This avoids re-reading ~61 JSON files on every /recommend request.
_programmes_cache = None


def load_all_programmes() -> list[dict]:
    """
    Load all programme JSON files from disk and return a list of summary dicts.

    Scans every .json file under programme_pages/ (recursively), extracts
    the key fields we need for the LLM prompt, and caches the result in
    _programmes_cache so subsequent calls are instant.

    Each summary dict contains:
      - title, url, category, fee, format, location, start_date
      - description_snippet (first 400 chars of the programme description)

    Returns:
        List of programme summary dicts (typically ~61 items).
    """
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
        # Skip non-dict entries (e.g. the programmes_database.json array)
        if not isinstance(data, dict):
            continue
        # Skip files that had scraping errors
        if "error" in data:
            continue

        # Extract category from the URL path
        # e.g. ".../programmes-in-accounting-finance/..." → "Accounting Finance"
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
            "description_snippet": description[:400],  # keep it short for the prompt
        })

    _programmes_cache = programmes
    return programmes


# ── LLM system prompt ───────────────────────────────────────────────
# This tells Claude exactly what role to play and what JSON structure
# to return. Claude sees this as the "system" message.
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
    MAIN ORCHESTRATOR — generates programme recommendations and a personalised email.

    Pipeline:
      1. Load all programmes from disk (cached after first call).
      2. Build a rich prompt with the candidate profile + interest categories
         + the entire programme catalogue.
      3. Send to Claude Sonnet 4 to pick the top 3 and write an email.
      4. Parse the JSON response and return it.

    Args:
        profile    : structured candidate dict from profiler.extract_profile()
                     Keys: name, current_role, industry, skills, career_goals, etc.
        categories : list of {category, score} dicts from classifier.classify_goals()
                     e.g. [{"category": "Strategy", "score": 0.85}, ...]

    Returns:
        Dict with two keys:
          - "recommendations" : list of top-3 programme dicts, each with a "reason"
          - "email_draft"     : personalised outreach email as a string
    """
    # ── Step 1: Load all programmes ──────────────────────────────────
    all_programmes = load_all_programmes()

    if not all_programmes:
        return {
            "recommendations": [],
            "email_draft": "No programmes available.",
        }

    # ── Step 2: Build the LLM prompt ────────────────────────────────
    # We give Claude three blocks of context:
    #   a) The full candidate profile as pretty-printed JSON
    #   b) The top 3 interest categories with confidence scores
    #   c) A formatted list of ALL available programmes
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

    # ── Step 3: Call Claude Sonnet 4 ─────────────────────────────────
    # Uses the Anthropic SDK. API key comes from the CLAUDE_API env var.
    # max_tokens=1500 is enough for 3 recommendations + a short email.
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

    # ── Step 4: Parse the JSON response ──────────────────────────────
    # Claude sometimes wraps its JSON in markdown code fences (```json...```)
    # so we strip those before parsing.
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        # FALLBACK: if Claude returned malformed JSON, we still give
        # the user something useful by returning the first 3 programmes
        # from the catalogue with generic reasons.
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
            "email_draft": content,  # raw Claude text as a fallback
        }

    return result
