"""
LLM-based structured profile extraction from CV/resume text.

PURPOSE:
    Given raw CV text (and optional stated career goals), this module calls
    an LLM to extract a clean, structured JSON profile containing the
    candidate's name, role, experience, skills, education, and inferred
    career aspirations.

MODEL CHOICE — GPT-5 Nano via the Lovable AI Gateway:
    We use `openai/gpt-5-nano`, the fastest and cheapest model in the GPT-5
    family.  Profile extraction is a relatively simple structured-output task
    (no deep reasoning required), so Nano's speed (~300 ms) and low token cost
    make it ideal.  The Lovable AI Gateway at ai.gateway.lovable.dev proxies
    the request to OpenAI's API, handling authentication and rate-limiting.

TEMPERATURE = 0.1:
    We set temperature very low (0.1) because we want deterministic, factual
    extraction — not creative generation.  A temperature of 0 would be fully
    deterministic but can occasionally cause repetition; 0.1 adds just enough
    randomness to avoid that while keeping output highly consistent.

DATA FLOW:
    main.py  →  extract_profile(cv_text, career_goals)  →  returns profile dict

See: https://platform.openai.com/docs/guides/text-generation
"""

import json
import os
from openai import OpenAI

# ---------------------------------------------------------------------------
# SYSTEM PROMPT
# ---------------------------------------------------------------------------
# The system prompt instructs the LLM to act as an HR analyst and return
# *only* valid JSON with a fixed schema.  This makes downstream parsing
# reliable.  We explicitly list all expected fields so the model knows
# exactly what to extract, and we instruct it to use `null` for fields
# that cannot be determined from the CV.
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are an expert HR analyst. Given a candidate's CV/resume text and their stated career goals, extract a structured profile.

Return ONLY valid JSON with these fields:
{
  "name": "candidate name",
  "current_role": "current job title",
  "years_experience": 0,
  "industry": "primary industry",
  "skills": ["skill1", "skill2", "skill3"],
  "education": "highest education level and field",
  "career_goals": "summarized career aspirations",
  "seniority": "junior|mid|senior|executive"
}

If a field cannot be determined, use null. For skills, list the top 5-8 most relevant professional skills."""


def extract_profile(cv_text: str, career_goals: str = "") -> dict:
    """
    Extract a structured professional profile from raw CV text.

    The function sends the CV text (truncated to 6 000 chars to stay within
    token limits) along with any stated career goals to GPT-4o-mini via the
    OpenAI SDK (matching the pattern used by classifier.py and recommender.py).

    Args:
        cv_text:      Raw text extracted from the candidate's CV/resume file.
        career_goals: Optional free-text career goals provided by the user.

    Returns:
        A dict with keys: name, current_role, years_experience, industry,
        skills, education, career_goals, seniority.  Any field that could
        not be extracted is set to None.
    """
    # -----------------------------------------------------------------------
    # Build the user message
    # -----------------------------------------------------------------------
    user_message = f"CV/Resume:\n{cv_text[:6000]}"
    if career_goals:
        user_message += f"\n\nStated career goals:\n{career_goals}"

    # -----------------------------------------------------------------------
    # Call OpenAI directly via the SDK (same pattern as recommender.py)
    # -----------------------------------------------------------------------
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.1,   # Low temperature → deterministic extraction
        max_tokens=500,     # Profile JSON is typically ~200–300 tokens
    )

    content = response.choices[0].message.content.strip()

    # -----------------------------------------------------------------------
    # Parse the JSON response
    # -----------------------------------------------------------------------
    # Some LLMs wrap JSON in markdown code fences (```json ... ```).
    # We strip those if present before attempting JSON.loads().
    # -----------------------------------------------------------------------
    if content.startswith("```"):
        content = content.split("```")[1]        # Get content between first pair of fences
        if content.startswith("json"):
            content = content[4:]                # Strip the "json" language identifier

    try:
        profile = json.loads(content)
    except json.JSONDecodeError:
        # ---------------------------------------------------------------
        # Fallback: if the LLM output is not valid JSON (rare but possible),
        # return a skeleton profile with nulls so downstream code doesn't break.
        # ---------------------------------------------------------------
        profile = {
            "name": None,
            "current_role": None,
            "years_experience": None,
            "industry": None,
            "skills": [],
            "education": None,
            "career_goals": career_goals,
            "seniority": None,
        }

    # Ensure career_goals is populated even if the LLM omitted it
    if not profile.get("career_goals") and career_goals:
        profile["career_goals"] = career_goals

    return profile
