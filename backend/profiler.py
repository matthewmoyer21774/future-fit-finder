"""
LLM-based profile extraction from CV/resume text.
Uses Anthropic Claude to extract structured candidate information.

HOW IT WORKS:
  1. Takes raw CV text (extracted by parsers.py) + optional career goals.
  2. Sends them to Anthropic's Claude Sonnet 4 with an HR-analyst prompt.
  3. Claude reads the CV and returns a clean JSON object with standardised
     fields: name, role, experience, industry, skills, education, etc.
  4. If Claude returns malformed JSON, we fall back to a safe empty profile.

WHY CLAUDE SONNET 4?
  - Excellent at structured extraction from messy/unstructured text.
  - max_tokens=500 keeps it fast and cheap (profile JSON is small).
  - The system prompt forces strict JSON output with no extra commentary.

This module is called by main.py (Step 2) right after the CV is parsed.
The structured profile it returns feeds into both the classifier and
the recommender.
"""

import json
import os
import anthropic

# ── System prompt for Claude ────────────────────────────────────────
# This prompt tells the model to act as an HR analyst and extract
# exactly the fields we need in a strict JSON format.
# "Return ONLY valid JSON" prevents the model from adding explanations.
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
    Extract a structured candidate profile from raw CV text using Claude Sonnet 4.

    Pipeline:
      1. Truncate CV text to 6000 chars (keeps API cost low, captures enough).
      2. Append career goals if provided.
      3. Send to Claude with the HR-analyst system prompt.
      4. Parse the JSON response.
      5. If parsing fails, return a safe fallback dict with null fields.

    Args:
        cv_text      : raw text extracted from the uploaded CV/resume file.
        career_goals : optional free-text career goals entered by the user.

    Returns:
        Dict with keys: name, current_role, years_experience, industry,
        skills (list), education, career_goals, seniority.
    """
    # Create an Anthropic client using the CLAUDE_API env var
    client = anthropic.Anthropic(api_key=os.environ.get("CLAUDE_API"))

    # Build the user message — truncate CV to first 6000 characters
    # to avoid hitting token limits and keep costs low.
    user_message = f"CV/Resume:\n{cv_text[:6000]}"
    if career_goals:
        user_message += f"\n\nStated career goals:\n{career_goals}"

    # Call Claude Sonnet 4 for structured extraction
    # max_tokens=500 is plenty for the small JSON profile output
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": user_message},
        ],
    )

    content = response.content[0].text.strip()

    # ── Parse JSON from the response ────────────────────────────────
    # Claude sometimes wraps its JSON in markdown code fences like:
    #   ```json
    #   { ... }
    #   ```
    # We strip those before attempting to parse.
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]

    try:
        profile = json.loads(content)
    except json.JSONDecodeError:
        # FALLBACK: if Claude didn't return valid JSON, create a
        # minimal profile so the rest of the pipeline can still run.
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

    # Make sure career_goals is always populated (Claude might have
    # returned null for it, but the user explicitly provided goals).
    if not profile.get("career_goals") and career_goals:
        profile["career_goals"] = career_goals

    return profile
