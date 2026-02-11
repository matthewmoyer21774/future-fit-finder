

# Vlerick Programme Recommendation Tool

## Overview
An AI-powered web app that recommends Vlerick Business School executive education programmes based on a user's professional profile and career goals. Users upload a CV, paste LinkedIn info, or fill a form — and get a personalized shortlist of recommended programmes with match explanations.

**Programme data is pre-scraped and will be imported from your existing GitHub repo as JSON.**

---

## Step 1: Import & Display Programme Data
- Import your JSON programme data directly into the app (bundled as a static data file)
- Create a browsable programme catalogue page so users can also explore programmes manually
- Each programme card shows: name, category, target audience, duration, and a link to the Vlerick page

## Step 2: User Profile Input Page
A landing page with three input options:
1. **Upload CV/Resume** — Drag-and-drop PDF or Word file upload. AI parses it to extract: current role, industry, experience level, skills, education, career interests
2. **Paste LinkedIn Text** — User copies and pastes their LinkedIn profile summary/experience section into a text box
3. **Manual Form** — Quick form with fields: current job title, industry, years of experience, career goals, areas of interest

Users can combine methods (e.g., upload CV + add career goals manually).

## Step 3: AI Recommendation Engine
- Enable **Lovable Cloud** and use **Lovable AI (Gemini)** via an edge function
- The edge function receives the user's profile data + the full programme catalogue
- AI acts as a Vlerick career advisor: analyzes the user's background and goals, then recommends the 3-5 best-fit programmes
- Each recommendation includes: programme name, why it's a match, confidence level, and the programme URL
- Uses structured output (tool calling) to return clean, parseable recommendations

## Step 4: Results Page
- Display recommendations as polished cards with match reasoning
- Each card: programme name, category, match score/reasoning, duration, "Learn More" link
- Option to adjust career goals and re-run recommendations
- Clean, professional design suitable for your assignment demo

## Design & Style
- Professional, clean design with Vlerick-inspired blue/dark tones
- Mobile-responsive layout
- Smooth transitions between input → loading → results

