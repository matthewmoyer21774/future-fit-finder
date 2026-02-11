

# Store Programmes in Database and Bypass Railway

## The Problem
The Railway backend's vector DB never finishes building, so recommendations always fail. Meanwhile, you already have a working `recommend` edge function that uses Lovable AI -- it just needs the programme data.

## The Solution
Store all 61 programmes in the database, update the `recommend` function to load them from there, and route the frontend directly to it -- completely bypassing Railway.

## Steps

### 1. Create a `programmes` table
A new database table with columns: `id`, `title`, `category`, `description`, `url`, `fee`, `format`, `location`, `start_date`, `target_audience`, `why_this_programme`, `key_topics`, and `full_text` (a searchable blob combining all programme content).

RLS: public read access (programmes are not sensitive data), no public write.

### 2. Seed the table with all 61 programmes
Extract the data from `programmes_database.json` and insert it into the new table using a migration.

### 3. Update the `recommend` edge function
Instead of expecting `catalogue` in the request body, the function will query the `programmes` table directly and build the catalogue string itself. It will continue using Lovable AI (Gemini) for matching -- no Railway needed.

### 4. Update the frontend (`Index.tsx`)
Change the submit handler to call the `recommend` function directly (instead of `backend-proxy`), passing only the user's profile/career goals. No more waiting for Railway to warm up.

### 5. Update the Programmes page
Optionally switch `src/pages/Programmes.tsx` to load from the database instead of the local JSON import, keeping a single source of truth.

## What This Fixes
- No more "System is warming up" errors
- No dependency on Railway being online
- Instant recommendations using Lovable AI
- Single source of truth for programme data

## Technical Details

- The `programmes` table will be seeded via SQL migration using the existing JSON data
- The `recommend` edge function will use `createClient` from `@supabase/supabase-js` to query the table
- The `full_text` column will concatenate title, description, sections, and foldable content for richer AI context
- The frontend will send profile fields directly to the `recommend` function, which handles everything server-side

