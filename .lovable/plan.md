

# Revamp: Interactive Live Pipeline Demo for Admin Architecture

## Overview

Transform the admin architecture page from a "click Run Demo with hardcoded data" experience into a fully interactive, visually stunning live pipeline visualization. The user provides real input (upload a PDF, fill a form, or use voice), and the page shows data flowing through each pipeline stage in real-time with actual backend responses -- like a cinematic behind-the-scenes view of the recommendation engine.

## Layout Redesign

The page will use a **two-column layout** on desktop:

```text
+----------------------------------+-------------------------------+
|                                  |                               |
|  LEFT COLUMN (Input Panel)       |  RIGHT COLUMN (Pipeline)      |
|                                  |                               |
|  +----------------------------+  |  Step 1: Input         [idle] |
|  | Tabs: Form | CV | Voice   |  |     |                         |
|  |                            |  |  Step 2: Text Extract  [idle] |
|  |  [form fields / upload /   |  |     |                         |
|  |   mic button]              |  |  Step 3: Profile       [idle] |
|  |                            |  |     |                         |
|  |  [Run Pipeline] button     |  |  Step 4: Classification[idle] |
|  +----------------------------+  |     |                         |
|                                  |  Step 5: Programme Scan [idle] |
|  Backend status badge            |     |                         |
|                                  |  Step 6: RAG Synthesis  [idle] |
|                                  |     |                         |
|                                  |  Step 7: Output         [idle] |
|                                  |                               |
+----------------------------------+-------------------------------+
```

On mobile, input panel stacks on top, pipeline below.

## Input Panel (Left Column)

Reuse the same three input methods from the main Index page:

- **Manual Form tab**: Job title, industry, years of experience, career goals, areas of interest
- **Upload CV tab**: Drag-and-drop PDF/DOCX upload zone
- **Voice tab**: Web Speech API recording button with live transcription

A large "Run Pipeline" button triggers the real backend call and starts the animation sequence.

## Pipeline Visualization (Right Column) -- The "Sexy" Part

### Visual Upgrades

1. **Glowing active node**: When a step is active, it gets a pulsing glow ring (box-shadow animation) with a gradient border that shifts colors
2. **Animated connector lines**: The vertical connectors between nodes become animated -- a gradient "data flowing" effect using a CSS animation that moves a highlight down the line when transitioning between steps
3. **Step numbers**: Each node gets a numbered circle (1-7) on the left side that fills with color as it completes
4. **Elapsed time per step**: Show a live millisecond counter while each step is active, then freeze at the final time when done (e.g., "1,247ms")
5. **Typewriter output**: Instead of sample output appearing instantly, the output text types out character by character using a typewriter animation
6. **Particle/sparkle effect**: When a node completes, a brief sparkle burst animation plays on the checkmark

### Updated Pipeline Nodes

Update the pipeline to reflect the current architecture (no more Vector DB/ChromaDB):

| Step | Label | Tech Badge | Description |
|------|-------|------------|-------------|
| 1 | Input Received | CV / Form / Voice | Your input has been received and sent to the pipeline |
| 2 | Text Extraction | PyPDF / python-docx | Extracting raw text from your document |
| 3 | Profile Extraction | GPT-4o-mini | LLM extracts structured profile data |
| 4 | Zero-Shot Classification | GPT-4o-mini | Classifying career interests into programme categories |
| 5 | Programme Matching | All 62 Programmes | Scanning all Vlerick programmes against your profile |
| 6 | RAG Synthesis | GPT-4o-mini | Generating personalised recommendations and outreach email |
| 7 | Output | JSON Response | Final recommendations delivered |

### Live Data Flow

When the backend responds, map real response data into each node's output:
- **Step 1**: Show what was sent (file name + size, or form text snippet, or voice transcript snippet)
- **Step 3**: Show the extracted profile JSON from `data.profile`
- **Step 4**: Show top categories from `data.topCategories`
- **Step 6**: Show recommendation count + email length
- **Step 7**: Show programme titles from `data.recommendations`

### Timing Simulation

The backend call happens upfront (same as now). While waiting for the response, animate through steps 1-2 with simulated timing. Once the response arrives, continue animating steps 3-7 with live data, using shorter durations to feel snappy.

## Tech Stack Card Update

Update the tech stack summary at the bottom to remove ChromaDB and text-embedding-3-small references. Replace with:
- "All 62 Programmes" / "Direct Context Injection" (replacing vector search)
- Keep FastAPI, PyPDF, GPT-4o-mini, Railway, React + Framer Motion, Lovable Cloud

## Final Result Card

After the pipeline completes, show a summary card at the bottom with:
- Number of recommendations generated
- Programme titles
- A "View Full Results" link (if we have the data to navigate to /results)

---

## Technical Details

### Files Modified

**`src/pages/AdminArchitecture.tsx`** -- Full rewrite:
- Add input panel with tabs (Form / CV / Voice) reusing similar patterns from Index.tsx
- Update pipeline nodes array to remove Vector DB, update descriptions
- Two-column responsive grid layout (`lg:grid-cols-[400px_1fr]`)
- New animation: typewriter effect for output text (custom hook or inline interval)
- New animation: glowing border on active nodes using Framer Motion's `animate` with `boxShadow`
- Animated connectors using CSS `@keyframes` gradient flow
- Step number circles with fill animation
- Live elapsed time counter per node
- Final results summary card
- Voice recording logic (same as Index.tsx)
- File upload logic (same as Index.tsx)

### No new dependencies needed
- Framer Motion (already installed) handles all animations
- Web Speech API for voice (browser native)
- All UI components already available (Tabs, Card, Badge, Input, Textarea, Button, Label, Progress)

