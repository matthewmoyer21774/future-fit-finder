"""
FastAPI backend for the Vlerick Programme Recommendation Tool.
Endpoints:
  POST /recommend  - Upload CV + career goals → get recommendations + email
  GET  /programmes - List all programmes with metadata
  GET  /health     - Health check

HOW THE FULL PIPELINE WORKS (when a user hits POST /recommend):
  Step 1 — PARSE:     parsers.py extracts raw text from the uploaded CV file.
  Step 2 — PROFILE:   profiler.py sends the CV text to Claude → structured JSON profile.
  Step 3 — CLASSIFY:  classifier.py embeds the career goals via OpenAI embeddings and
                       computes cosine similarity against 12 category centroids → top 3 categories.
  Step 4 — RECOMMEND: recommender.py sends the profile + categories + ALL programmes
                       to Claude → top 3 recommendations + personalised email draft.

The frontend (Lovable app) calls these endpoints via the CORS-enabled API.
"""

import json
import os
import glob
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

# Import our 4 pipeline modules
from parsers import parse_file, parse_linkedin_url      # Step 1: file → raw text
from profiler import extract_profile                     # Step 2: raw text → structured profile
from classifier import classify_goals                    # Step 3: profile → top categories
from recommender import recommend                        # Step 4: profile + categories → recommendations

app = FastAPI(
    title="Vlerick Programme Recommender",
    description="AI-powered programme recommendations based on your CV and career goals",
    version="1.0.0",
)

# ── CORS Middleware ─────────────────────────────────────────────────
# Allow all origins so the Lovable frontend (hosted on a different domain)
# can make requests to this API. In production you'd restrict this to
# the specific frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to the scraped programme JSON files (used by /programmes endpoint)
PROGRAMME_PAGES_DIR = os.path.join(os.path.dirname(__file__), "programme_pages")


# ── Health Check ────────────────────────────────────────────────────
@app.get("/health")
def health():
    """Simple health check — used by Railway/monitoring to verify the server is up."""
    return {"status": "ok", "ready": True}


# ── List All Programmes ─────────────────────────────────────────────
@app.get("/programmes")
def list_programmes():
    """
    Return metadata for all programmes.

    Scans every .json file under programme_pages/ and returns a summary
    dict for each. Used by the frontend to display the programme catalogue.

    Returns:
        JSON with "programmes" (list of dicts) and "count" (int).
    """
    programmes = []
    json_files = glob.glob(
        os.path.join(PROGRAMME_PAGES_DIR, "**", "*.json"), recursive=True
    )

    for path in json_files:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Skip non-dict entries (e.g. programmes_database.json array)
        if not isinstance(data, dict):
            continue
        # Skip files that had scraping errors
        if "error" in data:
            continue
        programmes.append({
            "title": data.get("title", ""),
            "url": data.get("url", ""),
            # Extract category from URL path: ".../programmes-in-strategy/..." → "Strategy"
            "category": data.get("url", "").split("/programmes/programmes-in-")[-1].split("/")[0].replace("-", " ").title()
                if "/programmes/programmes-in-" in data.get("url", "") else "",
            "fee": data.get("key_facts", {}).get("fee", ""),
            "format": data.get("key_facts", {}).get("format", ""),
            "location": data.get("key_facts", {}).get("location", ""),
            "description": data.get("description", "")[:200],  # first 200 chars only
        })

    return {"programmes": programmes, "count": len(programmes)}


# ── Main Recommendation Endpoint ────────────────────────────────────
@app.post("/recommend")
async def get_recommendations(
    file: UploadFile = File(None),        # optional CV file upload
    career_goals: str = Form(""),         # optional free-text career goals
    linkedin_url: str = Form(""),         # optional LinkedIn profile URL
):
    """
    Main recommendation endpoint — the core of the app.

    Accepts a CV file (PDF/DOCX/TXT) and/or career goals text, then
    runs the full 4-step pipeline to generate personalised programme
    recommendations and an outreach email draft.

    Returns:
        JSON with: profile, top_categories, recommendations, email_draft
    """
    # ── Step 1: Parse input sources ─────────────────────────────────
    # Extract raw text from the uploaded file and/or LinkedIn URL.
    cv_text = ""

    if file:
        file_bytes = await file.read()
        cv_text = parse_file(file.filename, file_bytes)

    if linkedin_url and linkedin_url.strip():
        linkedin_text = parse_linkedin_url(linkedin_url.strip())
        if linkedin_text:
            cv_text += "\n\n" + linkedin_text

    # If a file was uploaded but we couldn't extract text, give a helpful error
    if file and not cv_text:
        return {
            "error": "Could not extract text from your file. Please try a different format (PDF or DOCX) or use the manual form instead.",
            "recommendations": [],
            "email_draft": "",
        }

    # If neither CV text nor career goals were provided, we can't proceed
    if not cv_text and not career_goals:
        return {
            "error": "Please upload a CV or provide career goals.",
            "recommendations": [],
            "email_draft": "",
        }

    # ── Step 2: Extract structured profile ──────────────────────────
    # Send the CV text to Claude to get a structured JSON profile
    # (name, role, skills, experience, etc.)
    combined_text = cv_text
    if career_goals:
        combined_text += f"\n\nCareer Goals: {career_goals}"

    profile = extract_profile(cv_text, career_goals)

    # ── Step 3: Classify career interests ───────────────────────────
    # Build a text string from the candidate's goals + skills + industry,
    # then embed it and compare against the 12 category centroids.
    classify_input = career_goals or profile.get("career_goals", "")
    if profile.get("skills"):
        classify_input += " " + " ".join(profile["skills"])
    if profile.get("industry"):
        classify_input += " " + profile["industry"]

    categories = classify_goals(classify_input, top_k=3)

    # ── Step 4: Generate recommendations + email ────────────────────
    # Send the profile + categories + all programmes to Claude,
    # which picks the top 3 and writes a personalised email.
    result = recommend(profile, categories)

    return {
        "profile": profile,
        "top_categories": categories,
        "recommendations": result.get("recommendations", []),
        "email_draft": result.get("email_draft", ""),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
