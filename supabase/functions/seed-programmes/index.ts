/**
 * SEED-PROGRAMMES Edge Function
 *
 * PURPOSE:
 *   Ingests the scraped Vlerick programme JSON data into the `programmes`
 *   database table.  This is a one-time (or periodic) operation triggered
 *   from the admin dashboard's "Seed Database" button.
 *
 * DATA TRANSFORMATION:
 *   The raw scraped JSON (from vlerick_scraper.py) has a different structure
 *   than the database schema.  This function transforms each programme:
 *
 *     1. TITLE:            Converted to Title Case for display consistency.
 *     2. CATEGORY:         Extracted from the URL slug using a lookup table
 *                          (e.g. "digital-transformation-and-ai" → "Digital
 *                          Transformation & AI").
 *     3. DESCRIPTION:      First paragraph only (split on \n).
 *     4. TARGET AUDIENCE:  Extracted from the "WHO SHOULD ATTEND" foldable
 *                          section (first 2 lines).
 *     5. WHY THIS PROG:    Extracted from the "WHY THIS PROGRAMME" foldable.
 *     6. KEY TOPICS:       Inferred by keyword matching against a buzzword
 *                          list (up to 4 topics per programme).
 *     7. FULL TEXT:         The raw full_text field for potential RAG use.
 *
 * DEDUPLICATION:
 *   Programmes are deduplicated by URL before insertion to prevent duplicates
 *   when re-seeding.  The existing data is cleared (DELETE WHERE id != ...)
 *   before inserting the new batch.
 *
 * BATCH INSERTION:
 *   Programmes are inserted in batches of 20 to avoid hitting Supabase's
 *   request size limits.
 *
 * DATA FLOW:
 *   Admin page  →  POST /seed-programmes { programmes, admin_password }
 *               →  Transform + deduplicate
 *               →  DELETE existing → INSERT batches
 *               →  { success: true, inserted: N }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// RawProgramme Interface
// ---------------------------------------------------------------------------
// Matches the JSON structure output by vlerick_scraper.py.
// Each scraped programme page produces one of these objects.
// ---------------------------------------------------------------------------
interface RawProgramme {
  url: string;
  title: string;
  subtitle: string;
  key_facts: {
    fee?: string;
    format?: string;
    location?: string;
    start_date?: string;
  };
  description: string;
  foldable_sections?: string[];    // Accordion-style content sections from the page
  full_text?: string;              // Full concatenated page text for RAG
}

/**
 * Extract the programme category from the URL using a slug-to-name lookup.
 *
 * URL pattern: .../programmes/programmes-in-<slug>/<programme-name>/
 *
 * We use a hardcoded lookup table rather than string manipulation to ensure
 * consistent, properly formatted category names (e.g. "Marketing & Sales"
 * rather than "Marketing Sales").
 */
function extractCategory(url: string): string {
  const match = url.match(/programmes-in-([\w-]+)\//);
  if (!match) return "Other";
  const slug = match[1];
  const map: Record<string, string> = {
    "accounting-finance": "Accounting & Finance",
    "digital-transformation-and-ai": "Digital Transformation & AI",
    "entrepreneurship": "Entrepreneurship",
    "general-management": "General Management",
    "healthcare-management": "Healthcare Management",
    "human-resource-management": "Human Resource Management",
    "innovation-management": "Innovation Management",
    "marketing-sales": "Marketing & Sales",
    "operations-supply-chain-management": "Operations & Supply Chain",
    "people-management-leadership": "People Management & Leadership",
    "strategy": "Strategy",
    "sustainability": "Sustainability",
  };
  // Fall back to converting the slug to title case if not in the lookup
  return map[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extract content from a specific foldable section by its heading.
 *
 * Foldable sections in the scraped data are strings formatted as:
 *   "HEADING\ncontent line 1\ncontent line 2\n..."
 *
 * We match on the heading prefix and return the content after the heading.
 */
function extractFoldableSection(sections: string[], heading: string): string {
  for (const s of sections) {
    if (s.startsWith(heading + "\n")) {
      return s.replace(heading + "\n", "").trim();
    }
  }
  return "";
}

/**
 * Convert a string to Title Case, preserving common lowercase words
 * (articles, prepositions) for natural English formatting.
 */
function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => {
      // Keep articles/prepositions lowercase (except at start of string)
      if (["and", "in", "of", "the", "for", "to", "a"].includes(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());  // Always capitalise first char
}

/**
 * Extract key topics from a programme description by keyword matching.
 *
 * We check for the presence of ~25 business/education buzzwords in the
 * description text.  The first 4 matches become the programme's key_topics
 * array.  This is a simple heuristic — a more sophisticated approach would
 * use NLP entity extraction.
 *
 * If no buzzwords match, we default to ["Executive Education"].
 */
function extractKeyTopics(description: string): string[] {
  const topics: string[] = [];
  const buzzwords = [
    "AI", "digital", "strategy", "leadership", "finance", "innovation",
    "transformation", "sustainability", "marketing", "negotiation",
    "management", "entrepreneurship", "data", "analytics", "sales",
    "operations", "supply chain", "HR", "technology", "cybersecurity",
    "change", "coaching", "team", "performance", "growth",
  ];
  for (const bw of buzzwords) {
    if (description.toLowerCase().includes(bw.toLowerCase()) && topics.length < 4) {
      topics.push(bw.charAt(0).toUpperCase() + bw.slice(1));
    }
  }
  return topics.length > 0 ? topics : ["Executive Education"];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { programmes, admin_password } = await req.json();

    // Simple password check to prevent unauthorised seeding
    const expectedPassword = Deno.env.get("ADMIN_PASSWORD");
    if (expectedPassword && admin_password !== expectedPassword) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate input
    if (!programmes || !Array.isArray(programmes)) {
      return new Response(JSON.stringify({ error: "No programmes array provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the service role key to bypass RLS for database writes
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // -----------------------------------------------------------------------
    // Deduplicate programmes by URL
    // -----------------------------------------------------------------------
    // The scraper may produce duplicate entries (e.g. from navigation links).
    // We keep only the first occurrence of each URL.
    // -----------------------------------------------------------------------
    const seen = new Set<string>();
    const unique = programmes.filter((p: RawProgramme) => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

    // Clear existing programme data for a clean re-seed.
    // The WHERE clause is a workaround — Supabase requires a filter for DELETE.
    await supabase.from("programmes").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // -----------------------------------------------------------------------
    // Transform raw scraped data into the database schema format
    // -----------------------------------------------------------------------
    const rows = unique.map((p: RawProgramme) => ({
      title: titleCase(p.title),
      category: extractCategory(p.url),
      description: p.description?.split("\n")[0] || "",      // First paragraph only
      url: p.url,
      fee: p.key_facts?.fee || "",
      format: p.key_facts?.format || "",
      location: p.key_facts?.location || "",
      start_date: p.key_facts?.start_date || "",
      // Extract "Who should attend" from foldable sections (first 2 lines)
      target_audience: extractFoldableSection(p.foldable_sections || [], "WHO SHOULD ATTEND")
        .split("\n").slice(0, 2).join(". ") || "",
      // Extract "Why this programme" from foldable sections
      why_this_programme: extractFoldableSection(p.foldable_sections || [], "WHY THIS PROGRAMME"),
      // Infer key topics from description text via keyword matching
      key_topics: extractKeyTopics(p.description || ""),
      full_text: p.full_text || "",
    }));

    // -----------------------------------------------------------------------
    // Insert in batches of 20 to avoid request size limits
    // -----------------------------------------------------------------------
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 20) {
      const batch = rows.slice(i, i + 20);
      const { error } = await supabase.from("programmes").insert(batch);
      if (error) {
        console.error("Insert error at batch", i, error);
        throw new Error(`Insert failed: ${error.message}`);
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, inserted, total: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("seed-programmes error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Failed to seed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
