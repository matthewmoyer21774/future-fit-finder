

# Fix CV/Resume Parser

## Problem
The current `parse-cv` edge function tries to extract text from PDFs using naive regex matching on raw bytes (looking for text between parentheses in PDF stream objects). This produces garbled or empty text for most real-world PDFs, causing the AI to hallucinate a profile instead of reading the actual resume.

For example, Babette Van Reusel's resume (biomedical engineering student at Vlerick) was parsed as a "Senior Software Engineer with 10 years experience" -- completely fabricated.

## Solution
Replace the manual text extraction with Gemini's native PDF support. Instead of trying to parse PDF bytes into text, send the raw PDF file as a base64-encoded document directly to the AI model. Gemini can read PDFs natively and extract all the information accurately.

## Changes

### 1. Rewrite `supabase/functions/parse-cv/index.ts`
- Remove the broken regex-based PDF text extraction (lines 30-65)
- Instead, convert the uploaded file to base64
- Send it to Gemini as an `inline_data` part with `mimeType: "application/pdf"`
- Gemini will read the PDF visually/natively and extract the profile accurately
- Keep the same structured output format (tool calling with `extract_profile`)

### 2. No frontend changes needed
The `Index.tsx` and `Results.tsx` pages already handle the profile and recommendations correctly. Only the backend PDF parsing logic needs fixing.

## Technical Details

The key change in the edge function:

```text
Before: Upload -> regex extract text from bytes -> send text to AI -> get profile
After:  Upload -> base64 encode PDF -> send PDF directly to AI as multimodal input -> get profile
```

The Gemini model supports PDF files as inline data parts using:
- `type: "image_url"` with a `data:application/pdf;base64,...` URL
- This lets the model "see" the full PDF including formatting, layout, and all text

This approach works for both text-based and scanned PDFs (since Gemini has OCR capabilities built in).

