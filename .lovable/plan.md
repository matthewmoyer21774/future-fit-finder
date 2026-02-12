

# Add Comprehensive Code Comments

Add detailed inline comments to every Python backend file and every TypeScript edge function, explaining the purpose, logic, and design decisions throughout. This is especially important for the assignment deliverable which requires "Python code that is commented well + reference to source."

## Files to Comment

### Python Backend (6 files)

**`backend/classifier.py`** -- Add comments explaining:
- Module-level docstring referencing the embedding-based cosine similarity approach
- Why we use 12 categories with ~12 exemplar phrases each (to build semantic centroids)
- How the centroid caching works (embed once, reuse on subsequent requests)
- The cosine similarity formula and why it's used over Euclidean distance
- Why text-embedding-3-small was chosen (cost, speed, 1536-dim vectors)
- The classify_goals flow step by step

**`backend/profiler.py`** -- Add comments explaining:
- Why GPT-5 Nano was chosen (fastest model for structured extraction)
- The Lovable AI gateway URL and how it proxies to OpenAI
- Temperature 0.1 rationale (deterministic structured output)
- The markdown code block stripping logic
- The fallback profile dict when JSON parsing fails
- The 6000 char truncation to stay within token limits

**`backend/recommender.py`** -- Add comments explaining:
- The programme loading and caching strategy
- How category is extracted from the URL slug pattern
- The RECOMMEND_PROMPT system prompt design
- How candidate profile + categories + full catalogue are combined into the user message
- The JSON parsing with markdown fence handling
- The fallback recommendation logic when LLM output is malformed

**`backend/parsers.py`** -- Add comments explaining:
- Why imports are inside functions (lazy loading to avoid import errors)
- PyPDF page-by-page extraction approach
- python-docx paragraph iteration
- trafilatura for LinkedIn scraping
- The file routing logic and plain text fallback

**`backend/main.py`** -- Add comments explaining:
- The 4-step pipeline flow (parse -> profile -> classify -> recommend)
- CORS middleware configuration for cross-origin frontend
- Why LinkedIn text is appended to CV text
- Input validation and error handling strategy
- The programme listing endpoint and URL-based category extraction

**`backend/build_vectordb.py`** -- Add comments explaining:
- ChromaDB as a persistent vector store for RAG retrieval
- The document construction strategy (combining title, key facts, sections, testimonials)
- Content deduplication with the seen_content set
- OpenAI text-embedding-3-small for document embeddings
- HNSW index with cosine space configuration
- Batch embedding with exponential backoff retry logic

### TypeScript Edge Functions (5 files)

**`supabase/functions/parse-cv/index.ts`** -- Add comments explaining:
- Multimodal CV parsing using Gemini 3 Flash (PDF as base64 image input)
- The profileTool schema for structured extraction via function calling
- CORS preflight handling
- Rate limit and credit limit error handling

**`supabase/functions/recommend/index.ts`** -- Add comments explaining:
- Database-first programme loading with fallback to request body
- GPT-5 via Lovable AI gateway for superior reasoning
- Function calling (tool_choice) to enforce structured JSON output
- The system prompt design with full catalogue injection
- Error handling for rate limits (429) and credit limits (402)

**`supabase/functions/save-submission/index.ts`** -- Add comments explaining:
- Service role key usage to bypass RLS for server-side inserts
- The submission data structure and nullable fields
- Why this is a separate function (decoupled from recommendation logic)

**`supabase/functions/admin-auth/index.ts`** -- Add comments explaining:
- Password-based admin authentication via environment variable
- Service role key for reading all submissions
- Ordered by created_at descending for newest-first display

**`supabase/functions/seed-programmes/index.ts`** -- Add comments explaining:
- The RawProgramme interface matching scraped JSON structure
- URL-to-category mapping with the slug lookup table
- Foldable section extraction for target audience and programme rationale
- Keyword-based topic extraction from descriptions
- Deduplication by URL and batch insertion strategy

### Frontend Analytics (1 file)

**`src/lib/computeAnalytics.ts`** -- Add comments explaining:
- The Submission interface mapping to the database schema
- The generic countBy helper for frequency aggregation
- Experience bucketing logic (0-2, 3-5, 6-10, 10+)
- How programme and category frequencies are computed from nested recommendation arrays
- Date grouping for the timeline chart

## Comment Style

All comments will follow a consistent style:
- **Module-level**: Extended docstring with purpose, data flow, and references
- **Function-level**: Docstrings with Args/Returns
- **Inline**: `#` comments for non-obvious logic, design decisions, and "why" explanations
- **References**: Source library references where applicable (e.g., "See: https://platform.openai.com/docs/guides/embeddings")

