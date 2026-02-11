

# Admin Analytics Dashboard with Submission Insights

## Overview

Add an **Analytics tab** to the Admin page that visualizes submission data with interactive charts. A new backend function aggregates the raw submission data into meaningful insights, and the frontend renders them using Recharts (already installed).

## Layout

The Admin page gets two tabs: **Submissions** (existing table) and **Analytics** (new).

```text
+------------------------------------------------------------------+
|  Admin Dashboard                    [Seed] [Architecture] [Home]  |
|  [Submissions]  [Analytics]                                       |
+------------------------------------------------------------------+
|                                                                    |
|  ANALYTICS TAB:                                                    |
|                                                                    |
|  +----------+ +----------+ +----------+ +----------+              |
|  | Total    | | Wants    | | Top      | | Input    |              |
|  | Leads    | | Info %   | | Industry | | Method   |              |
|  +----------+ +----------+ +----------+ +----------+              |
|                                                                    |
|  +---------------------------+ +---------------------------+      |
|  | Programme Frequency       | | Industry Distribution     |      |
|  | (Bar Chart)               | | (Bar Chart)               |      |
|  +---------------------------+ +---------------------------+      |
|                                                                    |
|  +---------------------------+ +---------------------------+      |
|  | Experience Distribution   | | Input Method Breakdown    |      |
|  | (Bar Chart)               | | (Pie Chart)               |      |
|  +---------------------------+ +---------------------------+      |
|                                                                    |
|  +---------------------------+ +---------------------------+      |
|  | Category Frequency        | | Submissions Over Time     |      |
|  | (Bar Chart)               | | (Line/Area Chart)         |      |
|  +---------------------------+ +---------------------------+      |
|                                                                    |
+------------------------------------------------------------------+
```

## What Gets Analyzed

All processing happens client-side from the submissions data already fetched by `admin-auth`. No new edge function needed -- the data is already loaded.

From each submission's `profile` JSON and `recommendations` JSON array:

1. **Programme Recommendation Frequency**: Count how many times each programme title appears across all submissions' recommendations arrays. Shows which programmes the AI suggests most.

2. **Category Frequency**: Count recommendation categories (e.g., "Digital Transformation And Ai", "Operations & Supply Chain Management").

3. **Industry Distribution**: Extract `profile.industry` from each submission and count occurrences.

4. **Experience Distribution**: Extract `profile.years_experience` and bucket into ranges (0-2, 3-5, 6-10, 10+).

5. **Input Method Breakdown**: Count submissions by `input_method` (form, cv, voice).

6. **Submissions Over Time**: Group submissions by date for a timeline view.

7. **Summary Cards**: Total leads, % wanting info, most common industry, most common input method.

## Technical Details

### Files Modified

**`src/pages/Admin.tsx`**:
- Add Tabs component wrapping the existing table and new analytics view
- Import Recharts components (BarChart, PieChart, LineChart, etc.)
- Add a helper function `computeAnalytics(submissions)` that processes the submissions array into chart-ready data structures:
  - `programmeFrequency`: `[{ name: "AI FOR BUSINESS", count: 5 }, ...]` sorted descending
  - `categoryFrequency`: `[{ name: "Digital Transformation", count: 8 }, ...]`
  - `industryDistribution`: `[{ name: "Finance", count: 3 }, ...]`
  - `experienceBuckets`: `[{ range: "0-2 years", count: 4 }, ...]`
  - `inputMethods`: `[{ name: "cv", count: 5 }, ...]`
  - `submissionsOverTime`: `[{ date: "11 Feb", count: 3 }, ...]`
- Six chart components using Recharts (already installed):
  - Programme frequency: Horizontal BarChart
  - Category frequency: BarChart
  - Industry distribution: BarChart
  - Experience: BarChart with range buckets
  - Input methods: PieChart
  - Timeline: AreaChart
- Four summary stat cards at the top

### No new files or dependencies needed
- Recharts is already installed
- All UI components (Tabs, Card, Badge) already available
- Data comes from the existing `submissions` state variable

