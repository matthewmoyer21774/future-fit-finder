

# Interactive Code & Architecture Presentation Page

## Overview

Create a new page at `/admin/codebase` that serves as an interactive, slide-like walkthrough of the entire project. Instead of traditional slides, this page lets you click through sections explaining each script, the data flow, AI models used, and design decisions — perfect for narrating during your 10-minute recorded presentation.

## Layout

```text
+------------------------------------------------------------------+
|  Vlerick Advisor          Code & Architecture     [Back to Admin] |
+------------------------------------------------------------------+
|                                                                    |
|  [1. Overview] [2. Data] [3. Parsing] [4. Profiling]              |
|  [5. Classification] [6. Recommendations] [7. Edge Functions]     |
|  [8. Frontend] [9. Tech Stack]                                    |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |                                                                | |
|  |  ACTIVE SECTION CONTENT                                        | |
|  |                                                                | |
|  |  - Title with icon                                             | |
|  |  - Purpose description                                        | |
|  |  - Visual flow diagram (animated nodes + arrows)               | |
|  |  - Key code snippets with annotations                          | |
|  |  - "Why this approach?" callout box                            | |
|  |  - Model / tech badges                                         | |
|  |                                                                | |
|  +--------------------------------------------------------------+ |
|  |                                                                | |
|  |  [< Previous]                              [Next >]            | |
|  |                                                                | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

## Sections (9 slides)

### 1. System Overview
- High-level architecture diagram showing the full pipeline as animated nodes (similar to AdminArchitecture style): Input -> Parse -> Profile -> Classify -> Recommend -> Output
- Lists the 3 AI models used: Gemini 3 Flash, GPT-5 Nano, GPT-5
- Shows the two deployment paths: Python backend (local) vs Edge Functions (production)

### 2. Data Collection & Curation
- Explains the Playwright scraper (`vlerick_scraper.py`) and what it extracts from 62+ programme pages
- Shows the JSON structure of a scraped programme (title, key_facts, sections, foldable_sections, testimonials)
- Explains the ChromaDB vector store (`build_vectordb.py`): document construction, deduplication, HNSW cosine index
- "Why this approach?" callout on data quality being critical for RAG

### 3. Text Extraction (`parsers.py`)
- Visual showing the 3 input paths: PDF (PyPDF), DOCX (python-docx), LinkedIn (trafilatura)
- Key code snippet: the `parse_file()` router function
- Explains lazy imports design decision
- Notes on limitations (DOCX doesn't extract headers/footers)

### 4. Profile Extraction (`profiler.py`)
- Shows the GPT-5 Nano call with system prompt
- Explains temperature 0.1 rationale
- Displays the output schema (name, role, industry, skills, etc.)
- Shows the Lovable AI Gateway flow
- "Why Nano?" callout: fast, cheap, structured extraction doesn't need deep reasoning

### 5. Zero-Shot Classification (`classifier.py`)
- Visual of the centroid approach: 12 categories x 12 exemplar phrases = 144 embeddings
- Shows the cosine similarity formula
- Animated diagram: candidate embedding vs category centroids
- Key code snippet: `_build_centroids()` and `classify_goals()`
- "Why not BART-MNLI?" callout: embedding centroids are faster and more controllable

### 6. Programme Recommendations (`recommender.py` + `recommend/index.ts`)
- Shows the two implementations: Python (GPT-4o-mini) vs Edge Function (GPT-5)
- Explains the "catalogue injection" strategy: full 62 programmes in the prompt
- Shows the function calling / tool_choice schema for structured output
- Key code snippet: the system prompt design
- "Why inject the full catalogue?" callout: prevents hallucination

### 7. Edge Functions Overview
- Cards for each of the 6 edge functions with purpose, model used, and key design pattern:
  - `parse-cv`: Gemini 3 Flash multimodal (PDF as base64 image)
  - `recommend`: GPT-5 with function calling
  - `save-submission`: Service role key for RLS bypass
  - `admin-auth`: Password-based admin access
  - `seed-programmes`: URL-to-category mapping + keyword extraction
  - `backend-proxy`: Bridges frontend to Railway backend

### 8. Frontend & Analytics
- Shows the 3 input methods (Form, CV upload, Voice) with screenshots/icons
- Explains the Results page with recommendation cards and email draft
- Shows the Admin analytics dashboard: 4 summary cards + 6 Recharts charts
- Mentions the live pipeline demo (AdminArchitecture page)

### 9. Tech Stack & Future Work
- Grid of all technologies used with roles (similar to existing tech stack section)
- "Room for Improvement" section: classifier accuracy tuning, feedback loops, fine-tuned embeddings, A/B testing recommendations
- "Future Opportunities" section: lead scoring, CRM integration, multilingual support

## Interaction & Animation

- Sections are navigable via numbered tabs at the top AND previous/next buttons
- Keyboard navigation: left/right arrow keys to move between sections
- Each section fades in with Framer Motion transitions
- Code snippets are displayed in styled monospace blocks with syntax-highlighted comments
- Architecture diagrams use the same animated node style as AdminArchitecture (glowing active nodes, connector lines)
- Tech/model badges (e.g. "GPT-5 Nano", "text-embedding-3-small") appear as styled Badge components

## Technical Details

### New Files
- **`src/pages/AdminCodebase.tsx`** -- The main presentation page (~600-800 lines), containing all 9 section components, navigation logic, animated diagrams, and code snippets

### Modified Files
- **`src/App.tsx`** -- Add route: `/admin/codebase` -> `AdminCodebase`
- **`src/pages/Admin.tsx`** -- Add a "Codebase" navigation button next to the existing "Architecture" button

### Dependencies
No new dependencies needed. Uses existing:
- `framer-motion` for slide transitions and node animations
- `lucide-react` for icons
- Shadcn `Tabs`, `Card`, `Badge` components
- `react-router-dom` for navigation

