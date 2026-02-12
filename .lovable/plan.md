

# Fix Railway 401 Error in profiler.py

## Problem
`profiler.py` sends the `OPENAI_API_KEY` to `ai.gateway.lovable.dev`, which only accepts Lovable-specific keys. The other two scripts (`classifier.py` and `recommender.py`) correctly call OpenAI directly using the OpenAI SDK.

## Fix
Update `profiler.py` to use the OpenAI Python SDK (already installed) to call `api.openai.com` directly, matching the pattern used by `classifier.py` and `recommender.py`.

## Technical Details

### Modified File: `backend/profiler.py`
- Replace the `requests.post()` call to `ai.gateway.lovable.dev` with `OpenAI().chat.completions.create()` using `openai/gpt-4o-mini` (or `gpt-5-nano` equivalent available via OpenAI directly)
- Remove the `import requests` and `LOVABLE_API_KEY` logic
- Use `os.environ.get("OPENAI_API_KEY")` only, matching `recommender.py`
- Keep the same system prompt, temperature (0.1), and JSON parsing logic

The model will change from `openai/gpt-5-nano` (Lovable gateway name) to `gpt-4o-mini` (OpenAI direct name), which is the closest equivalent available directly from OpenAI.

No other files need changes. No frontend changes needed.

