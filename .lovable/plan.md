

# Import Real Programme Data and Update the App

## What we found
The file `programme_pages/programmes_database.json` is already in the project with all 50+ programmes and rich metadata including titles, descriptions, fees, formats, locations, target audiences, curriculum details, and more.

## Plan

### 1. Update the Programme data model and import
- Rewrite `src/data/programmes.ts` to import and transform the real data from `programme_pages/programmes_database.json`
- Update the `Programme` interface to match the actual JSON structure (title, description, key_facts, foldable_sections for target audience/curriculum, url, etc.)
- Extract key fields like "who should attend" and "why this programme" from the foldable_sections
- Parse categories from the URL path (e.g., "accounting-finance", "marketing-sales")

### 2. Update the Programme Catalogue page
- Update `src/pages/Programmes.tsx` to display real programme data with proper fields: name, category, fee, duration, location, and description
- Update category filters to use real categories from the data
- Ensure search works across real programme titles and descriptions

### 3. Update the Landing/Input page
- Minor updates to `src/pages/Index.tsx` to ensure the profile input form aligns with the data fields available for matching (categories, experience levels, etc.)

### Technical details
- The JSON file has ~8,900 lines with approximately 50-60 programmes
- Each programme has structured data in `foldable_sections` that contains "WHO SHOULD ATTEND", "WHY THIS PROGRAMME", "DETAILED PROGRAMME", and "FEES AND FINANCING" content
- Categories will be derived from URLs (e.g., `/programmes-in-accounting-finance/` becomes "Accounting & Finance")
- The `key_facts` object provides fee, format (duration), location, and start_date

