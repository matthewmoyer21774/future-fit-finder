

# Upgrade: Embedding Classifier + GPT-5 Recommendations

## Change 1: Replace LLM Classifier with Embedding-Based Classification

**File: `backend/classifier.py`** -- Full rewrite

Replace the current approach (asking GPT-4o-mini to score 12 categories 0.0-1.0) with a deterministic **cosine similarity** approach using `text-embedding-3-small`.

**How it works:**
1. Define 100-200 example phrases mapped to each category (roughly 10-15 per category)
2. On first call, embed all example phrases and average them per category to get 12 "category centroid" embeddings
3. Embed the candidate text
4. Compute cosine similarity between candidate embedding and each category centroid
5. Return top-k categories sorted by similarity score

**Example mappings (10-15 per category, ~150 total):**

- **Accounting & Finance**: "financial reporting and analysis", "corporate finance strategy", "budgeting and forecasting", "risk management in banking", "investment portfolio management", "audit and compliance", "CFO leadership", "treasury management", "mergers and acquisitions valuation", "financial modelling", "capital markets", "cost accounting"
- **Digital Transformation and AI**: "digital transformation strategy", "AI implementation in business", "machine learning for enterprise", "data-driven decision making", "technology leadership", "digital innovation", "automation and process optimization", "cloud migration strategy", "cybersecurity management", "digital product development", "tech startup scaling", "AI governance"
- **Entrepreneurship**: "launching a startup", "venture capital fundraising", "business model innovation", "scaling a new venture", "entrepreneurial mindset", "lean startup methodology", "founder leadership", "growth hacking strategies", "building an MVP", "social entrepreneurship", "family business succession", "corporate entrepreneurship"
- **General Management**: "executive leadership development", "general management skills", "cross-functional leadership", "business administration", "corporate governance", "organisational management", "executive MBA preparation", "senior management transition", "business strategy execution", "C-suite readiness", "multi-unit management", "international business management"
- **Healthcare Management**: "hospital administration", "healthcare policy", "pharmaceutical management", "health system transformation", "clinical leadership", "patient care quality improvement", "health tech innovation", "medical device commercialisation", "public health strategy", "healthcare operations", "nursing leadership", "biotech management"
- **Human Resource Management**: "talent acquisition strategy", "employee engagement", "compensation and benefits design", "HR digital transformation", "workforce planning", "diversity and inclusion programs", "organisational development", "HR analytics", "labour relations", "learning and development strategy", "employer branding", "succession planning"
- **Innovation Management**: "product innovation strategy", "design thinking", "R&D management", "open innovation", "innovation culture building", "technology transfer", "creative problem solving", "disruptive innovation", "innovation portfolio management", "intrapreneurship", "commercialising research", "innovation ecosystems"
- **Marketing & Sales**: "brand strategy and management", "digital marketing campaigns", "B2B sales leadership", "customer experience optimisation", "marketing analytics", "content marketing strategy", "sales team management", "go-to-market strategy", "consumer behaviour insights", "pricing strategy", "key account management", "omnichannel marketing"
- **Operations & Supply Chain Management**: "supply chain optimisation", "lean manufacturing", "logistics management", "procurement strategy", "quality management systems", "operations excellence", "inventory management", "production planning", "global supply chain resilience", "warehouse automation", "Six Sigma", "demand forecasting"
- **People Management & Leadership**: "team leadership development", "executive coaching skills", "conflict resolution", "performance management", "leadership communication", "change management", "emotional intelligence in leadership", "cross-cultural team management", "coaching and mentoring", "servant leadership", "leading remote teams", "stakeholder management"
- **Strategy**: "corporate strategy development", "competitive analysis", "strategic planning", "market entry strategy", "business transformation", "strategic partnerships", "scenario planning", "portfolio strategy", "strategic decision making", "industry disruption analysis", "growth strategy", "strategic consulting"
- **Sustainability**: "ESG strategy and reporting", "sustainable business models", "circular economy", "carbon footprint reduction", "corporate social responsibility", "sustainable supply chains", "green finance", "climate risk management", "sustainability leadership", "impact investing", "environmental compliance", "net zero strategy"

**Implementation details:**
- Cache the category centroid embeddings in a module-level variable (computed once on first request)
- Use `openai.embeddings.create(model="text-embedding-3-small", input=[...])` to get embeddings
- Cosine similarity: `dot(a, b) / (norm(a) * norm(b))` using numpy or pure Python
- Add `numpy` to `backend/requirements.txt`

## Change 2: Upgrade Recommendation Model to GPT-5

**File: `supabase/functions/recommend/index.ts`**

Change line 86 from:
```
model: "google/gemini-3-flash-preview",
```
to:
```
model: "openai/gpt-5",
```

This uses the Lovable AI gateway's GPT-5 access for superior reasoning over the full programme catalogue and higher-quality personalised outreach emails. No other changes needed -- same API format, same tool calling.

## Change 3: Update Architecture Page Labels

**File: `src/pages/AdminArchitecture.tsx`**

- Update step 4 tech badge from `"GPT-4o-mini"` to `"text-embedding-3-small"`
- Update step 4 description to `"Embedding-based cosine similarity against 150 category exemplars"`
- Update step 6 tech badge from `"GPT-4o-mini"` to `"GPT-5"`
- Update step 6 description to reference GPT-5

## Change 4: Add numpy dependency

**File: `backend/requirements.txt`**

Add `numpy` to the requirements list for cosine similarity computation.

## Summary of Changes

| File | What Changes |
|------|-------------|
| `backend/classifier.py` | Full rewrite: 150 example phrases, embedding centroids, cosine similarity |
| `backend/requirements.txt` | Add `numpy` |
| `supabase/functions/recommend/index.ts` | Change model to `openai/gpt-5` |
| `src/pages/AdminArchitecture.tsx` | Update tech badges and descriptions for steps 4 and 6 |

