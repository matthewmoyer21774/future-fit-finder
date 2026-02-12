"""
Programme recommender + personalised email generator.

PURPOSE:
    Given a structured candidate profile (from profiler.py) and the top
    interest-area categories (from classifier.py), this module:
      1. Loads the FULL catalogue of Vlerick programmes from scraped JSON files.
      2. Sends everything to GPT-4o-mini to select the TOP 3 best-fit programmes.
      3. Returns personalised reasoning for each pick and a draft outreach email.

WHY GPT-4o-mini?
    This is the Python-backend recommender (used when running the FastAPI server
    locally).  GPT-4o-mini provides strong reasoning at low cost.  The edge-
    function version (supabase/functions/recommend/index.ts) uses GPT-5 for
    even higher quality.

CACHING:
    Programme JSON files are loaded from disk once and cached in the module-level
    `_programmes_cache` list.  This avoids re-reading ~60 JSON files on every
    request.

DATA FLOW:
    main.py  →  recommend(profile, categories)  →  returns {recommendations, email_draft}

See: https://platform.openai.com/docs/guides/chat-completions
"""

import json
import os
import glob
from openai import OpenAI

# Directory containing the scraped programme JSON files (one file per programme)
PROGRAMME_PAGES_DIR = os.path.join(os.path.dirname(__file__), "programme_pages")

# Module-level cache: loaded once, reused across requests
_programmes_cache = None


def load_all_programmes() -> list[dict]:
    """
    Load all programme JSON files from the scraped data directory and return
    a list of summary dicts (one per programme).

    Each summary contains:
        - title, url, category (extracted from the URL slug)
        - fee, format, location, start_date (from key_facts)
        - description_snippet (first 400 chars of the description)

    The results are cached at module level so subsequent calls are free.
    """
    global _programmes_cache
    if _programmes_cache is not None:
        return _programmes_cache

    programmes = []
    # Recursively find all .json files under programme_pages/
    json_files = glob.glob(
        os.path.join(PROGRAMME_PAGES_DIR, "**", "*.json"), recursive=True
    )

    for path in json_files:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Skip non-dict entries and files that had scraping errors
        if not isinstance(data, dict):
            continue
        if "error" in data:
            continue

        # ---------------------------------------------------------------
        # Extract the category from the URL slug.
        # URLs follow the pattern:
        #   .../programmes/programmes-in-<category-slug>/<programme-name>/
        # We split on the slug, then convert "digital-transformation-and-ai"
        # to "Digital Transformation And Ai" via .replace("-", " ").title().
        # ---------------------------------------------------------------
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
            "description_snippet": description[:400],  # First 400 chars for context
        })

    _programmes_cache = programmes
    return programmes


# ---------------------------------------------------------------------------
# SYSTEM PROMPT
# ---------------------------------------------------------------------------
# The prompt instructs the LLM to act as a Vlerick admissions consultant.
# It asks for:
#   - TOP 3 programme picks with 2-3 sentence reasoning each
#   - A warm outreach email (3-4 paragraphs) referencing the candidate's
#     background, goals, and the recommended programmes
#   - Output as *valid JSON only* — no markdown, no extra text
#
# The strict JSON-only instruction helps with automated parsing downstream.
# ---------------------------------------------------------------------------
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
    Generate programme recommendations and a personalised outreach email.

    This function constructs a large prompt containing:
        - The candidate's full structured profile (from profiler.py)
        - Their top 3 interest-area categories with scores (from classifier.py)
        - The FULL programme catalogue (~60 programmes with metadata)

    It then sends everything to GPT-4o-mini for synthesis.

    Args:
        profile:    Structured candidate profile dict from profiler.py.
        categories: Top zero-shot classification results from classifier.py,
                    each with 'category' and 'score' keys.

    Returns:
        Dict with:
            'recommendations': list of 3 dicts (title, url, category, fee,
                               format, location, reason)
            'email_draft':     str — full personalised email text
    """
    # Load the full programme catalogue (cached after first call)
    all_programmes = load_all_programmes()

    if not all_programmes:
        return {
            "recommendations": [],
            "email_draft": "No programmes available.",
        }

    # -----------------------------------------------------------------------
    # Build the user message that provides all context to the LLM
    # -----------------------------------------------------------------------
    # We include:
    #   1. The candidate's profile as formatted JSON
    #   2. Their top interest areas with confidence scores
    #   3. Every programme with key metadata (title, category, fee, etc.)
    # This "catalogue injection" approach ensures the LLM can pick from the
    # full list rather than hallucinating programme names.
    # -----------------------------------------------------------------------
    candidate_summary = json.dumps(profile, indent=2)
    category_summary = ", ".join(
        f"{c['category']} ({c['score']:.0%})" for c in categories[:3]
    )
    programme_list = "\n\n".join(
        f"- {p['title']} ({p['category']})\n"
        f"  Fee: {p['fee']} | Format: {p['format']} | Location: {p['location']}\n"
        f"  URL: {p['url']}\n"
        f"  {p['description_snippet'][:300]}"  # Truncate to keep prompt manageable
        for p in all_programmes
    )

    user_message = (
        f"CANDIDATE PROFILE:\n{candidate_summary}\n\n"
        f"TOP INTEREST AREAS: {category_summary}\n\n"
        f"ALL AVAILABLE PROGRAMMES ({len(all_programmes)} total):\n{programme_list}"
    )

    # -----------------------------------------------------------------------
    # LLM call — GPT-4o-mini for fast, cost-effective synthesis
    # -----------------------------------------------------------------------
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": RECOMMEND_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,    # Moderate creativity for personalised writing
        max_tokens=1500,    # Enough for 3 recommendations + email draft
    )

    content = response.choices[0].message.content.strip()

    # -----------------------------------------------------------------------
    # Parse the JSON response
    # -----------------------------------------------------------------------
    # The model is instructed to return *only* JSON, but it sometimes wraps
    # the output in markdown code fences (```json ... ```).  We strip those.
    # -----------------------------------------------------------------------
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        # ---------------------------------------------------------------
        # Fallback: if the LLM did not return valid JSON, we construct a
        # basic recommendation set from the first 3 programmes and use
        # the raw LLM text as the email draft.  This ensures the pipeline
        # never returns an empty result.
        # ---------------------------------------------------------------
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
            "email_draft": content,  # Use raw LLM output as-is
        }

    return result
