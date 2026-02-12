"""
FastAPI backend for the Vlerick Programme Recommendation Tool.

ARCHITECTURE — 4-STEP PIPELINE:
    1. PARSE:    Extract raw text from the uploaded CV (PDF/DOCX/TXT)
                 and optionally scrape a LinkedIn profile URL.
    2. PROFILE:  Send the raw text to GPT-5 Nano to extract a structured
                 professional profile (name, role, skills, etc.).
    3. CLASSIFY: Use embedding-based cosine similarity to classify the
                 candidate's interests into Vlerick's 12 programme categories.
    4. RECOMMEND: Feed the profile + top categories + full programme catalogue
                  to GPT-4o-mini to select the TOP 3 programmes and draft a
                  personalised outreach email.

ENDPOINTS:
    POST /recommend  — Upload CV + career goals → get recommendations + email
    GET  /programmes — List all programmes with metadata (for the frontend)
    GET  /health     — Simple health check

DATA FLOW:
    Client (React)  →  POST /recommend  →  parsers.py  →  profiler.py
                                         →  classifier.py  →  recommender.py
                                         →  JSON response to client

See: https://fastapi.tiangolo.com/
"""

import json
import os
import glob
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

# Import the four pipeline modules
from parsers import parse_file, parse_linkedin_url    # Step 1: text extraction
from profiler import extract_profile                   # Step 2: structured profile
from classifier import classify_goals                  # Step 3: category classification
from recommender import recommend                      # Step 4: programme recommendations

app = FastAPI(
    title="Vlerick Programme Recommender",
    description="AI-powered programme recommendations based on your CV and career goals",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS MIDDLEWARE
# ---------------------------------------------------------------------------
# We allow all origins ("*") because the Lovable frontend may be served from
# various preview/published domains.  In production you would restrict this
# to specific allowed origins for security.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory containing the scraped programme JSON files
PROGRAMME_PAGES_DIR = os.path.join(os.path.dirname(__file__), "programme_pages")


@app.get("/health")
def health():
    """Simple health check endpoint for monitoring and readiness probes."""
    return {"status": "ok", "ready": True}


@app.get("/programmes")
def list_programmes():
    """
    Return metadata for all scraped Vlerick programmes.

    Used by the frontend to display the programme catalogue.  Each programme
    includes its title, URL, category (extracted from the URL slug), key facts
    (fee, format, location), and a truncated description (200 chars).
    """
    programmes = []
    # Recursively find all JSON files under programme_pages/
    json_files = glob.glob(
        os.path.join(PROGRAMME_PAGES_DIR, "**", "*.json"), recursive=True
    )

    for path in json_files:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Skip non-dict files and files with scraping errors
        if not isinstance(data, dict):
            continue
        if "error" in data:
            continue
        # Extract category from the URL slug pattern:
        #   .../programmes/programmes-in-<slug>/<name>/
        programmes.append({
            "title": data.get("title", ""),
            "url": data.get("url", ""),
            "category": data.get("url", "").split("/programmes/programmes-in-")[-1].split("/")[0].replace("-", " ").title()
                if "/programmes/programmes-in-" in data.get("url", "") else "",
            "fee": data.get("key_facts", {}).get("fee", ""),
            "format": data.get("key_facts", {}).get("format", ""),
            "location": data.get("key_facts", {}).get("location", ""),
            "description": data.get("description", "")[:200],
        })

    return {"programmes": programmes, "count": len(programmes)}


@app.post("/recommend")
async def get_recommendations(
    file: UploadFile = File(None),
    career_goals: str = Form(""),
    linkedin_url: str = Form(""),
):
    """
    Main recommendation endpoint — the core of the 4-step pipeline.

    Accepts a multipart form with:
        - file:         Optional CV/resume upload (PDF, DOCX, or TXT)
        - career_goals: Optional free-text career goals
        - linkedin_url: Optional LinkedIn profile URL to scrape

    Returns JSON with:
        - profile:          Structured candidate profile
        - top_categories:   Top 3 interest-area categories with scores
        - recommendations:  Top 3 programme picks with reasoning
        - email_draft:      Personalised outreach email
    """

    # ===================================================================
    # STEP 1: PARSE — Extract raw text from all input sources
    # ===================================================================
    cv_text = ""

    # Parse the uploaded file (if provided)
    if file:
        file_bytes = await file.read()
        cv_text = parse_file(file.filename, file_bytes)

    # Scrape LinkedIn profile (if URL provided) and append to CV text.
    # We append rather than replace because the LinkedIn text provides
    # supplementary context (e.g. endorsements, headline) that enriches
    # the profile extraction.
    if linkedin_url and linkedin_url.strip():
        linkedin_text = parse_linkedin_url(linkedin_url.strip())
        if linkedin_text:
            cv_text += "\n\n" + linkedin_text

    # Validate that we have at least some input to work with
    if file and not cv_text:
        return {
            "error": "Could not extract text from your file. Please try a different format (PDF or DOCX) or use the manual form instead.",
            "recommendations": [],
            "email_draft": "",
        }

    if not cv_text and not career_goals:
        return {
            "error": "Please upload a CV or provide career goals.",
            "recommendations": [],
            "email_draft": "",
        }

    # ===================================================================
    # STEP 2: PROFILE — Extract structured profile via GPT-5 Nano
    # ===================================================================
    combined_text = cv_text
    if career_goals:
        combined_text += f"\n\nCareer Goals: {career_goals}"

    profile = extract_profile(cv_text, career_goals)

    # ===================================================================
    # STEP 3: CLASSIFY — Embedding-based category classification
    # ===================================================================
    # Build a rich classification input by combining career goals, skills,
    # and industry from the extracted profile.  This gives the classifier
    # more semantic signal than career goals alone.
    classify_input = career_goals or profile.get("career_goals", "")
    if profile.get("skills"):
        classify_input += " " + " ".join(profile["skills"])
    if profile.get("industry"):
        classify_input += " " + profile["industry"]

    categories = classify_goals(classify_input, top_k=3)

    # ===================================================================
    # STEP 4: RECOMMEND — LLM synthesis with full programme catalogue
    # ===================================================================
    result = recommend(profile, categories)

    return {
        "profile": profile,
        "top_categories": categories,
        "recommendations": result.get("recommendations", []),
        "email_draft": result.get("email_draft", ""),
    }


if __name__ == "__main__":
    # Run the FastAPI server locally on port 8000 for development
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
