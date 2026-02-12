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
    token limits — roughly ~1 500 tokens for English text) along with any
    stated career goals to GPT-5 Nano.

    Args:
        cv_text:      Raw text extracted from the candidate's CV/resume file.
        career_goals: Optional free-text career goals provided by the user.

    Returns:
        A dict with keys: name, current_role, years_experience, industry,
        skills, education, career_goals, seniority.  Any field that could
        not be extracted is set to None.
    """
    import requests

    # Prefer the Lovable gateway key; fall back to a direct OpenAI key
    api_key = os.environ.get("LOVABLE_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("No API key configured (LOVABLE_API_KEY or OPENAI_API_KEY)")

    # -----------------------------------------------------------------------
    # Build the user message
    # -----------------------------------------------------------------------
    # We truncate the CV to 6 000 characters to avoid exceeding the model's
    # context window (GPT-5 Nano supports 128k tokens, but longer inputs
    # increase latency and cost with diminishing returns for extraction).
    # -----------------------------------------------------------------------
    user_message = f"CV/Resume:\n{cv_text[:6000]}"
    if career_goals:
        user_message += f"\n\nStated career goals:\n{career_goals}"

    # -----------------------------------------------------------------------
    # Call the Lovable AI Gateway
    # -----------------------------------------------------------------------
    # The gateway at ai.gateway.lovable.dev proxies requests to the
    # appropriate LLM provider (OpenAI in this case).  We use the standard
    # OpenAI chat completions format.
    # -----------------------------------------------------------------------
    response = requests.post(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "openai/gpt-5-nano",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.1,   # Low temperature → deterministic extraction
            "max_tokens": 500,    # Profile JSON is typically ~200–300 tokens
        },
    )

    response.raise_for_status()
    data = response.json()
    content = data["choices"][0]["message"]["content"].strip()

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
