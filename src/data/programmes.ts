import rawData from "../../programme_pages/programmes_database.json";

export interface Programme {
  id: string;
  name: string;
  category: string;
  description: string;
  targetAudience: string;
  whyThisProgramme: string;
  duration: string;
  fee: string;
  location: string;
  startDate: string;
  url: string;
  keyTopics: string[];
}

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
  foldable_sections: string[];
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
      return s
        .replace(heading + "\n", "")
        .trim();
    }
  }
  return "";
}

function extractKeyTopics(description: string): string[] {
  // Extract meaningful keywords from the description
  const words = description.split(/\s+/);
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

// Deduplicate by URL
const seen = new Set<string>();
const uniqueData = (rawData as RawProgramme[]).filter((p) => {
  if (seen.has(p.url)) return false;
  seen.add(p.url);
  return true;
});

export const programmes: Programme[] = uniqueData.map((p, i) => ({
  id: String(i + 1),
  name: titleCase(p.title),
  category: extractCategory(p.url),
  description: p.description?.split("\n")[0] || "",
  targetAudience: extractFoldableSection(p.foldable_sections || [], "WHO SHOULD ATTEND")
    .split("\n")
    .slice(0, 2)
    .join(". ") || "Professionals and managers",
  whyThisProgramme: extractFoldableSection(p.foldable_sections || [], "WHY THIS PROGRAMME"),
  duration: p.key_facts?.format || "Contact for details",
  fee: p.key_facts?.fee || "Contact for pricing",
  location: p.key_facts?.location || "",
  startDate: p.key_facts?.start_date || "",
  url: p.url,
  keyTopics: extractKeyTopics(p.description || ""),
}));

export const categories = [...new Set(programmes.map((p) => p.category))].sort();
