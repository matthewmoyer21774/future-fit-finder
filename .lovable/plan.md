

# Route the Frontend Through the Python Backend

## The Problem

The main recommendation flow in `Index.tsx` calls two edge functions that use Lovable AI (Gemini):
- `parse-cv` -- parses CVs using Gemini
- `recommend` -- generates recommendations using Gemini

Your Python backend on Railway does ALL of this (parse + profile + classify + vector search + recommend) in a single `/recommend` endpoint. The `backend-proxy` edge function already exists to forward requests there, but nothing in the main flow uses it.

## The Fix

**One file change**: Update `Index.tsx` to call `backend-proxy` instead of `parse-cv` + `recommend`.

The Python backend's `/recommend` endpoint accepts:
- `file` (multipart upload)
- `career_goals` (form field)
- `linkedin_url` (form field)

The `backend-proxy` edge function already converts these from JSON/base64 to multipart and maps the response to the frontend format (`programmeTitle`, `category`, `reasoning`, etc.).

### What changes in `Index.tsx`:

1. **Remove** the two-step flow (parse-cv then recommend)
2. **Replace** with a single call to `backend-proxy`, sending:
   - `file_base64` + `file_name` for CV uploads
   - `career_goals` built from form data or career goals text
   - `linkedin_text` for LinkedIn input
3. **Map** the response (already handled by `backend-proxy`)

### For form input specifically:
The Python backend expects `career_goals` as a text string. For form submissions, we'll concatenate the form fields into a descriptive string (e.g., "Marketing Manager in Technology with 5 years experience. Goals: transition to leadership. Interests: digital transformation").

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Rewire `handleSubmit` to call `backend-proxy` instead of `parse-cv` + `recommend` |

## What stays the same

- `backend-proxy` edge function -- already correct, no changes needed
- Python backend code -- already deployed/deploying on Railway
- Results page -- already expects the same data shape
- `save-submission` call -- stays as-is for database logging

## Assumptions

- Railway is deployed and the Python backend is running (you confirmed `OPENAI_API_KEY` is set)
- If Railway is down, the call will fail with an error toast -- no silent fallback to edge functions (since you want the Python pipeline specifically)

