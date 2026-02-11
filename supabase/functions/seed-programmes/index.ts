import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  foldable_sections?: string[];
  full_text?: string;
}

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
  return map[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractFoldableSection(sections: string[], heading: string): string {
  for (const s of sections) {
    if (s.startsWith(heading + "\n")) {
      return s.replace(heading + "\n", "").trim();
    }
  }
  return "";
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => {
      if (["and", "in", "of", "the", "for", "to", "a"].includes(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { programmes, admin_password } = await req.json();

    // Simple auth check
    const expectedPassword = Deno.env.get("ADMIN_PASSWORD");
    if (expectedPassword && admin_password !== expectedPassword) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!programmes || !Array.isArray(programmes)) {
      return new Response(JSON.stringify({ error: "No programmes array provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = programmes.filter((p: RawProgramme) => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

    // Clear existing data
    await supabase.from("programmes").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Transform and insert
    const rows = unique.map((p: RawProgramme) => ({
      title: titleCase(p.title),
      category: extractCategory(p.url),
      description: p.description?.split("\n")[0] || "",
      url: p.url,
      fee: p.key_facts?.fee || "",
      format: p.key_facts?.format || "",
      location: p.key_facts?.location || "",
      start_date: p.key_facts?.start_date || "",
      target_audience: extractFoldableSection(p.foldable_sections || [], "WHO SHOULD ATTEND")
        .split("\n").slice(0, 2).join(". ") || "",
      why_this_programme: extractFoldableSection(p.foldable_sections || [], "WHY THIS PROGRAMME"),
      key_topics: extractKeyTopics(p.description || ""),
      full_text: p.full_text || "",
    }));

    // Insert in batches of 20
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
