

# Fix: Inconsistent CV Upload Failures

## Root Cause

Two bugs work together to cause some PDFs to fail while others work:

1. **Missing MIME type in proxy**: The `backend-proxy` edge function creates a `Blob` without a MIME type (`new Blob([bytes])` on line 30). Without `application/pdf`, FastAPI may not properly receive the file upload for certain PDFs.

2. **Silent parse failure**: When `pypdf` can't extract text from a PDF (due to PDF version differences, encoding, or embedded fonts), it returns an empty string. Since CV uploads don't send `career_goals`, the backend hits the validation check and returns "Please upload a CV or provide career goals."

## Changes

### 1. `supabase/functions/backend-proxy/index.ts`
- Add a helper function to map file extensions to MIME types (`.pdf` -> `application/pdf`, `.docx` -> `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, etc.)
- Change line 30 from `new Blob([bytes])` to `new Blob([bytes], { type: getMimeType(file_name) })`

### 2. `backend/main.py`
- After `parse_file()` returns, check if the file was uploaded but text extraction returned empty
- If so, return a specific helpful error: "Could not extract text from your file. Please try a different format (PDF or DOCX) or use the manual form instead."
- This replaces the confusing generic "Please upload a CV or provide career goals" message

### 3. `src/pages/Index.tsx`
- In the form tab's `else` branch (lines 66-74), after building the `parts` array, check if `parts.length === 0`
- If empty, throw an error asking the user to fill in at least their job title or career goals
- This prevents empty form submissions from reaching the backend

## Expected Result
- PDFs that previously failed will now be properly received by the Python backend with the correct MIME type
- When a file truly can't be parsed, users get a clear, helpful message instead of a confusing error
- Empty form submissions are caught on the frontend before reaching the backend

