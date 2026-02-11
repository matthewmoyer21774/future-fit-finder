

# Admin View and Lead Capture System

## Overview
Add contact information capture to the user-facing form, store all submissions in the database, and create a password-protected admin dashboard where Vlerick staff can view leads and their recommendations.

## What Changes for Users
- The manual form gets two new fields: **Name** and **Email**, plus a checkbox: **"I'd like to receive more information"**
- When a CV is uploaded, the parser already extracts the name; we'll also try to extract email from the CV
- The **outreach email section is removed** from the user-facing results page -- users only see their 3 programme recommendations
- The outreach email and contact details are visible only in the admin view

## Admin Dashboard
- Accessible at `/admin` with a simple password gate (no full auth system -- just a shared password stored as a backend secret)
- Shows a table of all submissions: name, email, date, job title, industry, "wants info" flag, and a button to expand and see their recommendations + outreach email
- Admins can see the full outreach email draft for each lead

## Database
A new `submissions` table stores each lead:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| created_at | timestamptz | Submission time |
| name | text | From form or CV |
| email | text | From form or CV |
| wants_info | boolean | Checkbox value |
| profile | jsonb | The full profile data sent to the AI |
| recommendations | jsonb | The 3 recommendations returned |
| outreach_email | text | The draft email returned |
| input_method | text | "form", "cv", or "linkedin" |

RLS: Public insert (anon can write), select restricted to service role only (admin edge function reads it).

## Technical Steps

### 1. Database migration
- Create `submissions` table with columns above
- Enable RLS with anon INSERT policy and no public SELECT

### 2. Update `parse-cv` edge function
- Add `email` to the `extract_profile` tool schema so Gemini extracts it from CVs

### 3. Update manual form (`Index.tsx`)
- Add Name, Email fields and "I'd like more information" checkbox to the form tab
- After getting recommendations, save the submission to the database via an edge function
- Remove outreach email from the data passed to the Results page

### 4. Create `save-submission` edge function
- Accepts profile, recommendations, outreach email, contact info
- Inserts into `submissions` table using service role
- Called after recommendations are returned

### 5. Update Results page (`Results.tsx`)
- Remove the outreach email section entirely from the user view
- Keep only the 3 recommendation cards

### 6. Create Admin page (`src/pages/Admin.tsx`)
- Simple password input screen (password checked against a secret via edge function)
- Once authenticated, shows a table of all submissions
- Click to expand: see full recommendations and outreach email for each lead
- Add route `/admin` in `App.tsx`

### 7. Create `admin-auth` edge function
- Accepts password, compares against `ADMIN_PASSWORD` secret
- Returns submissions list if correct

### 8. Add `ADMIN_PASSWORD` secret
- Prompt user to set it via the secrets tool

