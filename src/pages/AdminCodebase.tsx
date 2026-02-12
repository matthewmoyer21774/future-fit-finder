import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Brain,
  Sparkles,
  Zap,
  Upload,
  Send,
  Globe,
  Cpu,
  Code2,
  BarChart3,
  Layers,
  Shield,
  Mic,
  PenLine,
  Eye,
  Server,
  Workflow,
  BookOpen,
  Lightbulb,
  Target,
  Puzzle,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

// ─── Section Data ────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "overview", label: "Overview", icon: <Layers className="h-4 w-4" /> },
  { id: "data", label: "Data", icon: <Database className="h-4 w-4" /> },
  { id: "parsing", label: "Parsing", icon: <FileText className="h-4 w-4" /> },
  { id: "profiling", label: "Profiling", icon: <Brain className="h-4 w-4" /> },
  { id: "classification", label: "Classification", icon: <Target className="h-4 w-4" /> },
  { id: "recommendations", label: "Recommendations", icon: <Sparkles className="h-4 w-4" /> },
  { id: "edge", label: "Edge Functions", icon: <Zap className="h-4 w-4" /> },
  { id: "frontend", label: "Frontend", icon: <Eye className="h-4 w-4" /> },
  { id: "techstack", label: "Tech Stack", icon: <Rocket className="h-4 w-4" /> },
];

// ─── Reusable Components ─────────────────────────────────────────────────────

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/80 overflow-hidden">
      {title && (
        <div className="px-3 py-1.5 bg-muted/50 border-b border-border">
          <span className="text-xs font-mono text-muted-foreground">{title}</span>
        </div>
      )}
      <pre className="p-3 text-xs font-mono text-foreground/90 overflow-x-auto leading-relaxed whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

function WhyCallout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-accent/30 bg-accent/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-accent" />
        <span className="font-bold text-sm text-accent">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function ModelBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    "GPT-5": "bg-green-500/10 text-green-700 border-green-500/30",
    "GPT-5 Nano": "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    "GPT-4o-mini": "bg-teal-500/10 text-teal-700 border-teal-500/30",
    "Gemini 3 Flash": "bg-blue-500/10 text-blue-700 border-blue-500/30",
    "text-embedding-3-small": "bg-purple-500/10 text-purple-700 border-purple-500/30",
  };
  return (
    <Badge variant="outline" className={`text-xs font-mono ${colors[name] || ""}`}>
      {name}
    </Badge>
  );
}

// ─── Animated Pipeline Diagram ───────────────────────────────────────────────

function PipelineDiagram({ nodes, activeIndex }: { nodes: { label: string; tech: string; icon: React.ReactNode }[]; activeIndex?: number }) {
  return (
    <div className="flex items-center gap-1 flex-wrap justify-center py-4">
      {nodes.map((node, i) => (
        <div key={i} className="flex items-center gap-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-2.5 transition-all duration-500 min-w-[90px] ${
              activeIndex === undefined || activeIndex === i
                ? "border-primary bg-primary/5 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]"
                : "border-border bg-card/50"
            }`}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
              activeIndex === undefined || activeIndex === i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {node.icon}
            </div>
            <span className="text-[11px] font-bold text-foreground text-center leading-tight">{node.label}</span>
            <span className="text-[9px] font-mono text-muted-foreground">{node.tech}</span>
          </motion.div>
          {i < nodes.length - 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 + 0.05 }}
            >
              <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Section 1: System Overview ──────────────────────────────────────────────

function SectionOverview() {
  const pipelineNodes = [
    { label: "Input", tech: "CV / Form / Voice", icon: <Upload className="h-4 w-4" /> },
    { label: "Parse", tech: "PyPDF / Gemini", icon: <FileText className="h-4 w-4" /> },
    { label: "Profile", tech: "GPT-5 Nano", icon: <Brain className="h-4 w-4" /> },
    { label: "Classify", tech: "Embeddings", icon: <Target className="h-4 w-4" /> },
    { label: "Recommend", tech: "GPT-5", icon: <Sparkles className="h-4 w-4" /> },
    { label: "Output", tech: "JSON + Email", icon: <Send className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">System Overview</h2>
        <p className="text-muted-foreground">
          The Vlerick Programme Advisor uses a <strong>4-step AI pipeline</strong> to match professionals with the right executive education programme. Three AI models work together, each chosen for its specific strengths.
        </p>
      </div>

      <PipelineDiagram nodes={pipelineNodes} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { model: "Gemini 3 Flash", role: "CV Parsing", desc: "Multimodal — reads PDFs as images for superior text extraction" },
          { model: "GPT-5 Nano", role: "Profile Extraction", desc: "Fast & cheap structured extraction — no deep reasoning needed" },
          { model: "GPT-5", role: "Recommendations", desc: "Superior reasoning for matching profiles to 62 programmes" },
        ].map((m) => (
          <Card key={m.model} className="border-border">
            <CardContent className="p-4 space-y-2">
              <ModelBadge name={m.model} />
              <h4 className="font-bold text-sm text-foreground font-sans">{m.role}</h4>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-primary" />
              <h4 className="font-bold text-sm text-foreground font-sans">Python Backend (Local)</h4>
            </div>
            <p className="text-xs text-muted-foreground">FastAPI server with ChromaDB vector store, running locally for development. Uses PyPDF, python-docx, trafilatura for parsing.</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-primary" />
              <h4 className="font-bold text-sm text-foreground font-sans">Edge Functions (Production)</h4>
            </div>
            <p className="text-xs text-muted-foreground">6 serverless TypeScript functions deployed on Lovable Cloud. Handles CV parsing, recommendations, submissions, and admin tasks.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Section 2: Data Collection ──────────────────────────────────────────────

function SectionData() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Data Collection & Curation</h2>
        <p className="text-muted-foreground">
          All programme data is scraped from Vlerick's website using a custom Playwright scraper, then indexed into a ChromaDB vector store for RAG retrieval.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-sm text-foreground font-sans">Playwright Scraper</h4>
                <Badge variant="secondary" className="text-[10px]">vlerick_scraper.py</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Navigates 62+ programme pages, waits for JS rendering, expands foldable sections, and extracts structured content.</p>
              <div className="flex flex-wrap gap-1">
                {["Title & URL", "Key Facts", "Sections", "Foldable Content", "Testimonials"].map((item) => (
                  <Badge key={item} variant="outline" className="text-[10px]">{item}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-sm text-foreground font-sans">ChromaDB Vector Store</h4>
                <Badge variant="secondary" className="text-[10px]">build_vectordb.py</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Builds a persistent HNSW index with cosine similarity for semantic search.</p>
              <div className="flex flex-wrap gap-1">
                <ModelBadge name="text-embedding-3-small" />
                <Badge variant="outline" className="text-[10px]">1536-dim vectors</Badge>
                <Badge variant="outline" className="text-[10px]">Cosine space</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <CodeBlock
          title="Scraped JSON Structure"
          code={`{
  "title": "Marketing Management",
  "url": "https://vlerick.com/...",
  "key_facts": {
    "fee": "€6,500",
    "format": "In-person",
    "location": "Brussels",
    "duration": "5 days"
  },
  "sections": [
    { "heading": "Overview", "text": "..." }
  ],
  "foldable_sections": [
    { "title": "Who should attend?",
      "content": "..." }
  ],
  "testimonials": [
    { "quote": "...", "author": "..." }
  ]
}`}
        />
      </div>

      <WhyCallout title="Why this approach?">
        Data quality is the single most important factor in RAG performance. By scraping every detail (including foldable sections and testimonials), we give the LLM maximum context to make accurate programme matches. Deduplication prevents biased retrieval.
      </WhyCallout>
    </div>
  );
}

// ─── Section 3: Text Extraction ──────────────────────────────────────────────

function SectionParsing() {
  const paths = [
    { label: "PDF", tech: "PyPDF / Gemini 3 Flash", icon: <FileText className="h-4 w-4" />, desc: "Page-by-page text extraction; Gemini treats PDF as base64 image for multimodal parsing" },
    { label: "DOCX", tech: "python-docx", icon: <FileText className="h-4 w-4" />, desc: "Paragraph iteration over document body (note: doesn't extract headers/footers)" },
    { label: "LinkedIn", tech: "trafilatura", icon: <Globe className="h-4 w-4" />, desc: "Web scraping with main content extraction, stripping navigation and ads" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Text Extraction</h2>
        <p className="text-muted-foreground">
          The parser module (<code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">parsers.py</code>) routes uploaded files to the appropriate extraction library based on file extension.
        </p>
      </div>

      <PipelineDiagram
        nodes={paths.map((p) => ({ label: p.label, tech: p.tech.split(" /")[0], icon: p.icon }))}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {paths.map((p) => (
          <Card key={p.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {p.icon}
                <h4 className="font-bold text-sm text-foreground font-sans">{p.label}</h4>
              </div>
              <Badge variant="secondary" className="text-[10px] mb-2">{p.tech}</Badge>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <CodeBlock
        title="parsers.py — Router Function"
        code={`def parse_file(filename: str, file_bytes: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    
    if ext == "pdf":
        from pypdf import PdfReader     # lazy import
        reader = PdfReader(BytesIO(file_bytes))
        return "\\n".join(p.extract_text() or ""
                         for p in reader.pages)
    elif ext == "docx":
        from docx import Document       # lazy import
        doc = Document(BytesIO(file_bytes))
        return "\\n".join(p.text for p in doc.paragraphs)
    else:
        return file_bytes.decode("utf-8", errors="ignore")`}
      />

      <WhyCallout title="Why lazy imports?">
        Libraries like PyPDF and python-docx are only imported when actually needed. This avoids ImportErrors on systems where only some parsers are installed, and reduces cold-start time for the serverless deployment.
      </WhyCallout>
    </div>
  );
}

// ─── Section 4: Profile Extraction ───────────────────────────────────────────

function SectionProfiling() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Profile Extraction</h2>
        <p className="text-muted-foreground">
          Raw CV text is sent to <ModelBadge name="GPT-5 Nano" /> which extracts a structured professional profile in a single API call.
        </p>
      </div>

      <PipelineDiagram
        nodes={[
          { label: "Raw Text", tech: "CV + Goals", icon: <FileText className="h-4 w-4" /> },
          { label: "GPT-5 Nano", tech: "temp=0.1", icon: <Brain className="h-4 w-4" /> },
          { label: "Profile JSON", tech: "Structured", icon: <Code2 className="h-4 w-4" /> },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CodeBlock
          title="profiler.py — System Prompt"
          code={`SYSTEM_PROMPT = """
You are a profile extractor. 
Analyze the CV/resume text and return 
a JSON object with these fields:

  name, current_role, industry,
  years_experience, education,
  skills (array), career_goals,
  leadership_experience (bool)

Return ONLY valid JSON.
"""`}
        />

        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <h4 className="font-bold text-sm text-foreground font-sans mb-2">Output Schema</h4>
              <div className="grid grid-cols-2 gap-1">
                {["name", "current_role", "industry", "years_experience", "education", "skills[]", "career_goals", "leadership_experience"].map((field) => (
                  <Badge key={field} variant="outline" className="text-[10px] font-mono justify-start">{field}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <h4 className="font-bold text-sm text-foreground font-sans mb-2">Design Decisions</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>Temperature 0.1</strong> — near-deterministic for consistent structured output</li>
                <li>• <strong>6,000 char limit</strong> — stays within token budget while capturing key info</li>
                <li>• <strong>Markdown fence stripping</strong> — handles ```json wrappers from LLM</li>
                <li>• <strong>Fallback dict</strong> — returns empty profile on parse failure</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <WhyCallout title="Why GPT-5 Nano?">
        Profile extraction is a structured data task — it doesn't require deep reasoning or creative synthesis. Nano is 10x cheaper and 3x faster than full GPT-5, making it ideal for this step. The low temperature ensures consistent JSON output across runs.
      </WhyCallout>
    </div>
  );
}

// ─── Section 5: Classification ───────────────────────────────────────────────

function SectionClassification() {
  const categories = [
    "Marketing & Sales", "Finance & Accounting", "Strategy & Innovation",
    "People Management", "General Management", "Supply Chain",
    "Data & Digital", "Entrepreneurship", "Sustainability",
    "Healthcare", "Real Estate", "Executive MBA",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Zero-Shot Classification</h2>
        <p className="text-muted-foreground">
          Instead of using a pre-trained classifier (like BART-MNLI), we build <strong>semantic centroids</strong> from embedding vectors — faster, more controllable, and domain-specific.
        </p>
      </div>

      <PipelineDiagram
        nodes={[
          { label: "Career Goals", tech: "User Input", icon: <PenLine className="h-4 w-4" /> },
          { label: "Embed", tech: "text-embed-3-small", icon: <Cpu className="h-4 w-4" /> },
          { label: "Cosine Sim", tech: "vs Centroids", icon: <Target className="h-4 w-4" /> },
          { label: "Top 3", tech: "Categories", icon: <Sparkles className="h-4 w-4" /> },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <h4 className="font-bold text-sm text-foreground font-sans mb-2">12 Programme Categories</h4>
              <div className="flex flex-wrap gap-1">
                {categories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Each category has ~12 exemplar phrases → <strong>144 embeddings</strong> averaged into 12 centroid vectors.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <h4 className="font-bold text-sm text-foreground font-sans mb-2">Cosine Similarity</h4>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <code className="text-sm font-mono text-foreground">
                  sim(A, B) = (A · B) / (‖A‖ × ‖B‖)
                </code>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Measures angular distance between vectors — invariant to magnitude, perfect for comparing semantic meaning.
              </p>
            </CardContent>
          </Card>
        </div>

        <CodeBlock
          title="classifier.py — Core Logic"
          code={`def _build_centroids(self):
    """Embed all exemplar phrases and average
    per category to create centroid vectors."""
    for category, phrases in CATEGORIES.items():
        embeddings = self._embed(phrases)
        centroid = np.mean(embeddings, axis=0)
        centroid /= np.linalg.norm(centroid)
        self.centroids[category] = centroid

def classify_goals(text, top_k=3):
    """Embed the input text, compute cosine
    similarity against all centroids, return
    the top-k categories with scores."""
    query_vec = self._embed([text])[0]
    scores = {
        cat: float(np.dot(query_vec, centroid))
        for cat, centroid in self.centroids.items()
    }
    return sorted(scores.items(),
                  key=lambda x: x[1],
                  reverse=True)[:top_k]`}
        />
      </div>

      <WhyCallout title="Why not BART-MNLI?">
        Pre-trained zero-shot classifiers like BART-MNLI are slower (require full model inference) and harder to customize. Embedding centroids let us define exact category definitions with exemplar phrases, are computed once and cached, and run a simple dot product at inference time — milliseconds instead of seconds.
      </WhyCallout>
    </div>
  );
}

// ─── Section 6: Recommendations ──────────────────────────────────────────────

function SectionRecommendations() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Programme Recommendations</h2>
        <p className="text-muted-foreground">
          The recommender synthesizes the profile, top categories, and <strong>full programme catalogue</strong> to select the top 3 programmes and draft a personalised outreach email.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-primary" />
              <h4 className="font-bold text-sm text-foreground font-sans">Python Backend</h4>
              <ModelBadge name="GPT-4o-mini" />
            </div>
            <p className="text-xs text-muted-foreground mb-2">Local development implementation using the cheaper GPT-4o-mini model with direct OpenAI SDK calls.</p>
            <Badge variant="secondary" className="text-[10px]">recommender.py</Badge>
          </CardContent>
        </Card>
        <Card className="border-border border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-primary" />
              <h4 className="font-bold text-sm text-foreground font-sans">Edge Function</h4>
              <ModelBadge name="GPT-5" />
            </div>
            <p className="text-xs text-muted-foreground mb-2">Production implementation with superior reasoning via function calling (<code className="text-[10px] bg-muted px-1 rounded">tool_choice</code>) for structured JSON output.</p>
            <Badge variant="secondary" className="text-[10px]">recommend/index.ts</Badge>
          </CardContent>
        </Card>
      </div>

      <CodeBlock
        title="System Prompt Design (simplified)"
        code={`SYSTEM_PROMPT = """
You are a Vlerick Business School programme advisor.
Given a candidate profile and their interest categories, 
select the TOP 3 most suitable programmes from the 
catalogue below.

For each programme, provide:
- programmeTitle (exact match from catalogue)
- category
- reasoning (2-3 sentences, personalised)
- fee, duration, location, startDate

Also draft a personalised outreach email (200-300 words).

PROGRAMME CATALOGUE:
{full_catalogue_json}   ← all 62 programmes injected
"""`}
      />

      <WhyCallout title="Why inject the full catalogue?">
        By including all 62 programmes directly in the prompt, the LLM can only recommend programmes that actually exist — eliminating hallucination risk. The full catalogue fits comfortably within GPT-5's context window (~128K tokens), and the structured function calling schema ensures the output is always valid JSON.
      </WhyCallout>
    </div>
  );
}

// ─── Section 7: Edge Functions ───────────────────────────────────────────────

function SectionEdgeFunctions() {
  const functions = [
    {
      name: "parse-cv",
      model: "Gemini 3 Flash",
      icon: <FileText className="h-5 w-5" />,
      purpose: "Multimodal CV parsing — treats PDF as a base64 image for Gemini's vision capability",
      pattern: "Base64 encoding → Gemini multimodal → Structured profile via function calling",
    },
    {
      name: "recommend",
      model: "GPT-5",
      icon: <Sparkles className="h-5 w-5" />,
      purpose: "Programme matching and email drafting with full catalogue context",
      pattern: "DB-first programme loading → Full catalogue injection → tool_choice for structured JSON",
    },
    {
      name: "save-submission",
      model: "—",
      icon: <Database className="h-5 w-5" />,
      purpose: "Persists user submissions with recommendations to the database",
      pattern: "Service role key bypasses RLS → Upserts profile, recommendations, and email draft",
    },
    {
      name: "admin-auth",
      model: "—",
      icon: <Shield className="h-5 w-5" />,
      purpose: "Admin dashboard authentication and data retrieval",
      pattern: "Password via env var → Service role reads all submissions → Ordered by newest first",
    },
    {
      name: "seed-programmes",
      model: "—",
      icon: <Upload className="h-5 w-5" />,
      purpose: "Seeds the database with scraped programme data",
      pattern: "URL slug → category mapping → Keyword extraction → Batch insert with dedup",
    },
    {
      name: "backend-proxy",
      model: "—",
      icon: <Server className="h-5 w-5" />,
      purpose: "Bridges the frontend to the Railway-hosted Python backend",
      pattern: "Forwards requests to RAILWAY_BACKEND_URL → Returns backend response to client",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Edge Functions</h2>
        <p className="text-muted-foreground">
          Six serverless TypeScript functions handle the production pipeline. Each is deployed automatically and runs on-demand.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {functions.map((fn) => (
          <Card key={fn.name} className="border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {fn.icon}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground font-mono">{fn.name}</h4>
                  {fn.model !== "—" && <ModelBadge name={fn.model} />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{fn.purpose}</p>
              <div className="rounded bg-muted/50 p-2">
                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">{fn.pattern}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Section 8: Frontend & Analytics ─────────────────────────────────────────

function SectionFrontend() {
  const inputMethods = [
    { label: "Form Input", icon: <PenLine className="h-5 w-5" />, desc: "Structured fields: job title, industry, experience, goals, areas of interest" },
    { label: "CV Upload", icon: <Upload className="h-5 w-5" />, desc: "Drag & drop PDF/DOCX upload, parsed by Gemini 3 Flash multimodal" },
    { label: "Voice Input", icon: <Mic className="h-5 w-5" />, desc: "Web Speech API for hands-free input, transcribed to text in real-time" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Frontend & Analytics</h2>
        <p className="text-muted-foreground">
          The React frontend provides three input methods, a results page with recommendation cards, and a full admin analytics dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {inputMethods.map((method) => (
          <Card key={method.label} className="border-border">
            <CardContent className="p-4 text-center space-y-2">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary">
                {method.icon}
              </div>
              <h4 className="font-bold text-sm text-foreground font-sans">{method.label}</h4>
              <p className="text-xs text-muted-foreground">{method.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <h4 className="font-bold text-sm text-foreground font-sans mb-2">Results Page</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>3 recommendation cards</strong> with programme details, personalised reasoning</li>
              <li>• <strong>Fee, duration, location</strong> badges extracted from catalogue</li>
              <li>• <strong>Outreach email draft</strong> — copy-ready personalised email</li>
              <li>• <strong>Lead capture form</strong> — optional name/email for "want more info"</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <h4 className="font-bold text-sm text-foreground font-sans mb-2">Admin Analytics Dashboard</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>4 summary cards</strong> — total submissions, leads, conversion rate, avg recommendations</li>
              <li>• <strong>6 Recharts charts</strong> — timeline, input methods, industries, experience, top programmes, categories</li>
              <li>• <strong>Submissions table</strong> — expandable rows with full profile + recommendations</li>
              <li>• <strong>Live architecture demo</strong> — real pipeline visualization (this page!)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Section 9: Tech Stack ───────────────────────────────────────────────────

function SectionTechStack() {
  const techGrid = [
    { name: "React + TypeScript", role: "Frontend framework", cat: "Frontend" },
    { name: "Tailwind CSS", role: "Utility-first styling", cat: "Frontend" },
    { name: "Framer Motion", role: "Animations & transitions", cat: "Frontend" },
    { name: "Recharts", role: "Analytics charts", cat: "Frontend" },
    { name: "shadcn/ui", role: "Component library", cat: "Frontend" },
    { name: "Vite", role: "Build tool & dev server", cat: "Frontend" },
    { name: "FastAPI", role: "Python REST API", cat: "Backend" },
    { name: "Lovable Cloud", role: "Edge Functions & DB", cat: "Backend" },
    { name: "ChromaDB", role: "Vector store for RAG", cat: "Backend" },
    { name: "GPT-5", role: "Recommendations & email", cat: "AI" },
    { name: "GPT-5 Nano", role: "Profile extraction", cat: "AI" },
    { name: "Gemini 3 Flash", role: "Multimodal CV parsing", cat: "AI" },
    { name: "text-embedding-3-small", role: "Classification embeddings", cat: "AI" },
    { name: "Playwright", role: "Web scraping", cat: "Data" },
    { name: "PyPDF / python-docx", role: "Document parsing", cat: "Data" },
  ];

  const catColors: Record<string, string> = {
    Frontend: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    Backend: "bg-green-500/10 text-green-700 border-green-500/30",
    AI: "bg-purple-500/10 text-purple-700 border-purple-500/30",
    Data: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Tech Stack & Future Work</h2>
        <p className="text-muted-foreground">
          A comprehensive overview of all technologies used and opportunities for improvement.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {techGrid.map((tech) => (
          <div key={tech.name} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card/50">
            <Badge variant="outline" className={`text-[9px] shrink-0 ${catColors[tech.cat]}`}>{tech.cat}</Badge>
            <div>
              <span className="text-sm font-bold text-foreground font-sans">{tech.name}</span>
              <p className="text-[11px] text-muted-foreground">{tech.role}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Puzzle className="h-4 w-4 text-accent" />
              <h4 className="font-bold text-sm text-foreground font-sans">Room for Improvement</h4>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Classifier accuracy tuning — expand exemplar phrases per category</li>
              <li>• Feedback loops — let users rate recommendations to improve future results</li>
              <li>• Fine-tuned embeddings — train on Vlerick-specific terminology</li>
              <li>• A/B testing — compare different prompt strategies for recommendations</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Rocket className="h-4 w-4 text-primary" />
              <h4 className="font-bold text-sm text-foreground font-sans">Future Opportunities</h4>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Lead scoring — prioritise outreach based on profile–programme fit</li>
              <li>• CRM integration — auto-push qualified leads to Salesforce/HubSpot</li>
              <li>• Multilingual support — Dutch, French, German for European markets</li>
              <li>• Alumni network matching — connect candidates with programme graduates</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Section Renderer ────────────────────────────────────────────────────────

const SECTION_COMPONENTS: Record<string, React.FC> = {
  overview: SectionOverview,
  data: SectionData,
  parsing: SectionParsing,
  profiling: SectionProfiling,
  classification: SectionClassification,
  recommendations: SectionRecommendations,
  edge: SectionEdgeFunctions,
  frontend: SectionFrontend,
  techstack: SectionTechStack,
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const AdminCodebase = () => {
  const [activeSection, setActiveSection] = useState(0);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSection((prev) => Math.min(prev + 1, SECTIONS.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSection((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const ActiveComponent = SECTION_COMPONENTS[SECTIONS[activeSection].id];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground font-sans">Vlerick Advisor</h2>
              <p className="text-[11px] text-muted-foreground">Code & Architecture Walkthrough</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
              {activeSection + 1} / {SECTIONS.length}
            </Badge>
            <Link to="/admin">
              <Button variant="outline" size="sm">Back to Admin</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="border-b border-border bg-card/50 sticky top-[57px] z-40">
        <div className="container mx-auto px-4 py-2">
          <div className="flex gap-1 flex-wrap">
            {SECTIONS.map((section, i) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(i)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  activeSection === i
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {section.icon}
                <span className="hidden sm:inline">{section.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={SECTIONS[activeSection].id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setActiveSection((prev) => Math.max(prev - 1, 0))}
            disabled={activeSection === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Use ← → arrow keys to navigate
          </span>
          <Button
            variant="outline"
            onClick={() => setActiveSection((prev) => Math.min(prev + 1, SECTIONS.length - 1))}
            disabled={activeSection === SECTIONS.length - 1}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AdminCodebase;
