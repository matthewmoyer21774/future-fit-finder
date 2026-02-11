

# AI-Powered Programme Recommendation Engine

## Overview

Build an end-to-end recommendation pipeline using Lovable Cloud edge functions and Lovable AI (Gemini). Users submit their profile via **manual form** or **CV upload**, and the AI analyzes their background against the full catalogue of 50+ Vlerick programmes to return personalized top-3 recommendations with reasoning and a draft outreach email.

## Architecture

Two input paths feed into a single recommendation engine:

```text
  Manual Form ──┐
                ├──> Edge Function: /recommend ──> Lovable AI (Gemini) ──> Results Page
  CV Upload ────┘
       │
       └──> Edge Function: /parse-cv ──> Lovable AI extracts structured profile
```

## Step-by-Step Plan

### 1. Enable Lovable Cloud
- Activate Lovable Cloud to get edge functions, secrets management, and the pre-configured LOVABLE_API_KEY

### 2. Create edge function: `parse-cv`
- Accepts a PDF/DOCX file upload
- Reads the file content (text extraction from PDF)
- Sends the text to Lovable AI with a system prompt to extract a structured profile: name, current role, years of experience, industry, skills, education, career goals, seniority level
- Returns the structured JSON profile to the frontend

### 3. Create edge function: `recommend`
- Accepts either a structured profile (from the manual form) or extracted profile (from CV parsing)
- Embeds the **full programme catalogue** (titles, descriptions, target audience, key topics, fees, format, location) directly in the prompt context -- this is feasible because 50 programmes fit well within the model's context window
- System prompt instructs Lovable AI to act as a Vlerick admissions consultant and:
  - Select the top 3 best-matching programmes
  - Provide 2-3 sentence personalized reasoning for each
  - Generate a warm outreach email draft
- Uses tool calling to return structured JSON output (no fragile JSON parsing)
- Returns recommendations and email draft

### 4. Update the frontend landing page (`Index.tsx`)
- Wire the "Get Recommendations" button to:
  - If CV tab: upload file to `parse-cv` edge function first, then pass extracted profile to `recommend`
  - If form tab: send form data directly to `recommend`
- Show a loading state with progress messaging while AI processes
- Navigate to a new `/results` route with the response data

### 5. Create a Results page (`Results.tsx`)
- Display the top 3 recommended programmes as cards showing:
  - Programme name, category, fee, duration, location
  - Personalized "why this fits you" reasoning
  - Link to the programme on the Vlerick website
- Display the generated outreach email draft in a copyable text area
- Include a "Start Over" button to return to the home page

### 6. Add route for `/results` in `App.tsx`

## Technical Details

- **Model**: `google/gemini-3-flash-preview` (default Lovable AI model -- fast, cost-effective, strong reasoning)
- **No vector database needed**: With only ~50 programmes, passing the full catalogue as context is simpler, more reliable, and avoids the complexity of ChromaDB/embeddings
- **PDF text extraction**: The edge function will extract text from uploaded PDFs using a lightweight approach
- **Structured output**: Use Lovable AI tool calling to get reliable JSON responses instead of parsing raw text
- **Error handling**: Handle rate limits (429), payment required (402), and display user-friendly messages

## What This Replaces

The Python backend (FastAPI + ChromaDB + sentence-transformers + OpenAI) is fully replaced by two lightweight edge functions using Lovable AI. No external API keys needed -- the LOVABLE_API_KEY is auto-provisioned.

