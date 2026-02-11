

# Fix: Vector DB Build Crash

## Root Cause

The file `backend/programme_pages/programmes_database.json` is a **JSON array** (a list of all 62 programmes), not a single programme dict like the other `.json` files. The `load_programmes()` function in `build_vectordb.py` loads it via glob, and since it's a list, calling `.get()` on it fails with `'list' object has no attribute 'get'`.

The same bug exists in `main.py`'s `/programmes` endpoint.

## Fix

Add a type check in both files: if the loaded JSON is not a `dict`, skip it.

| File | Change |
|------|--------|
| `backend/build_vectordb.py` | Add `if not isinstance(data, dict): continue` after `json.load(data)` in `load_programmes()` |
| `backend/main.py` | Add the same check in the `/programmes` endpoint's file loading loop |

This is a one-line fix in each file. After redeploying to Railway, the vector DB will build successfully and recommendations will work end-to-end.

