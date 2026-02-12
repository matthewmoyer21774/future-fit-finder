

# Fix: Railway 500 Errors (Profiler + Retry Logic)

## What's Actually Happening

Railway IS connected and running -- the health check returns 200 OK. The "Connect the Railway backend" message appears because the `/recommend` endpoint returns a 500 error, so the frontend shows that fallback text.

There are two separate failures in the Railway logs:

1. **Profiler still calling the Lovable gateway** -- The latest fix to `profiler.py` (switching from the Lovable AI gateway to the OpenAI SDK) needs to be redeployed to Railway. The running container still has the old code.
2. **Transient OpenAI 500 on embeddings** -- Even after the profiler fix lands, `classifier.py` can hit a transient OpenAI server error with no retry logic, which kills the entire pipeline.

## Plan

### Step 1: Confirm profiler.py is correct (already done)

The current code in `backend/profiler.py` already uses the OpenAI SDK with `gpt-4o-mini`. No code changes needed here.

### Step 2: Add retry logic to `backend/classifier.py`

Wrap the `_embed` function's OpenAI call in a retry loop (3 attempts, exponential backoff) so transient 500 errors don't crash the pipeline.

```text
Changes:
- Import time, random
- Add retry loop (3 attempts) around client.embeddings.create()
- Backoff delays: ~1s, ~3s, ~7s with jitter
- Re-raise after all retries exhausted
```

### Step 3: Add retry logic to `backend/recommender.py`

Same pattern around the `client.chat.completions.create()` call to protect the recommendation/email generation step.

### Step 4: Add retry logic to `backend/profiler.py`

Same pattern around the profile extraction LLM call.

### Step 5: Redeploy to Railway

After code changes, you'll need to push to your Railway-connected Git repo (or trigger a manual redeploy) so the container picks up all the fixes.

## Files Changed

| File | Change |
|------|--------|
| `backend/classifier.py` | Retry with backoff on `_embed()` |
| `backend/recommender.py` | Retry with backoff on LLM call |
| `backend/profiler.py` | Retry with backoff on LLM call |

## Why the Frontend Says "Connect Railway"

The frontend checks if `liveResults?.recommendations?.length > 0`. When the backend returns a 500, there are no recommendations, so the fallback message displays. Once the backend stops erroring, this message will automatically be replaced with the live results.

