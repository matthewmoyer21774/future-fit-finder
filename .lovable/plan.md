

# Fix: Profiler 401 Error on Railway

## Problem

The `profiler.py` was updated to call the **Lovable AI gateway** (`ai.gateway.lovable.dev`) using `LOVABLE_API_KEY`. However, the Railway backend runs outside Lovable Cloud and does not have access to that key. This causes a **401 Unauthorized** error on every `/recommend` request.

The classifier already works correctly because it uses the OpenAI SDK directly with `OPENAI_API_KEY`.

## Solution

Revert `profiler.py` to use the **OpenAI SDK directly** (same pattern as `classifier.py`), calling `gpt-4o-mini` via the standard OpenAI API. This is the model your `OPENAI_API_KEY` on Railway has access to.

## File Changes

### `backend/profiler.py`

- Remove the `requests`-based call to `ai.gateway.lovable.dev`
- Use the `OpenAI` SDK client (already imported) with `OPENAI_API_KEY`
- Call `gpt-4o-mini` (available on standard OpenAI keys)
- Keep the same system prompt, JSON parsing, and error handling

The key change is replacing:
```python
response = requests.post("https://ai.gateway.lovable.dev/v1/chat/completions", ...)
```

With:
```python
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
response = client.chat.completions.create(model="gpt-4o-mini", ...)
```

### `src/pages/AdminArchitecture.tsx`

- Update Step 3 tech badge back to `"GPT-4o-mini"` and description to clarify it runs on the Railway backend via standard OpenAI API

## Why GPT-5 Nano stays for edge functions only

The Lovable AI gateway (and models like `openai/gpt-5-nano`, `openai/gpt-5`) are only accessible from Lovable Cloud edge functions where `LOVABLE_API_KEY` is automatically available. The Railway backend must use models accessible through a standard OpenAI API key.

The recommendation engine in `supabase/functions/recommend/index.ts` correctly uses `openai/gpt-5` via the gateway since it runs as an edge function inside Lovable Cloud.

