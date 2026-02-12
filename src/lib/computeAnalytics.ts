/**
 * Client-side analytics computation for the Admin Dashboard.
 *
 * PURPOSE:
 *   Transforms the raw `submissions` array (fetched from the database via
 *   the admin-auth edge function) into chart-ready data structures for
 *   Recharts visualisations on the Analytics tab.
 *
 * WHY CLIENT-SIDE?
 *   The submissions data is already fully loaded into the browser for the
 *   Submissions table tab.  Computing analytics client-side avoids an
 *   additional API call and keeps the analytics always in sync with the
 *   displayed data.
 *
 * DATA STRUCTURES:
 *   All frequency arrays follow the shape { name: string; count: number }[]
 *   which maps directly to Recharts' data format for Bar, Pie, and Area
 *   charts.
 */

// ---------------------------------------------------------------------------
// Submission Interface
// ---------------------------------------------------------------------------
// Maps to the `submissions` table schema in Supabase.
// The `profile` field is a JSON object with keys like `industry`,
// `years_experience`, etc. — stored as Record<string, string> for flexibility.
// The `recommendations` field is an array of recommendation objects.
// ---------------------------------------------------------------------------
interface Submission {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  wants_info: boolean;
  profile: Record<string, string> | null;
  recommendations: Array<{
    programmeTitle: string;
    category: string;
    reasoning: string;
    url: string;
  }> | null;
  outreach_email: string | null;
  input_method: string;    // "form", "cv", or "voice"
}

/**
 * The shape of the computed analytics object.
 * Each array field is ready to be passed directly to a Recharts component.
 */
export interface AnalyticsData {
  totalLeads: number;                                    // Total submission count
  wantsInfoPct: number;                                  // % of leads who ticked "wants info"
  topIndustry: string;                                   // Most common industry
  topInputMethod: string;                                // Most common input method
  programmeFrequency: { name: string; count: number }[]; // How often each programme is recommended
  categoryFrequency: { name: string; count: number }[];  // How often each category appears
  industryDistribution: { name: string; count: number }[];  // Industry breakdown
  experienceBuckets: { name: string; count: number }[];     // Experience ranges
  inputMethods: { name: string; count: number }[];          // form vs cv vs voice
  submissionsOverTime: { date: string; count: number }[];   // Daily submission counts
}

/**
 * Generic frequency counter.
 *
 * Takes an array of items and a key-extraction function, then counts how
 * many times each unique key appears.  Returns an array of { name, count }
 * sorted by count descending.
 *
 * This is the workhorse utility used by all frequency computations below.
 *
 * @param items  - The array to aggregate over
 * @param keyFn  - Function that extracts the grouping key from each item.
 *                 Return undefined to skip the item.
 */
function countBy<T>(items: T[], keyFn: (item: T) => string | undefined): { name: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (key) map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Bucket a years-of-experience value into a human-readable range.
 *
 * Ranges:
 *   0–2 years  → Entry-level / early career
 *   3–5 years  → Mid-career professionals
 *   6–10 years → Senior professionals
 *   10+ years  → Executive / very experienced
 *
 * Returns undefined for non-numeric or missing values (which causes
 * countBy to skip the item).
 */
function bucketExperience(years: string | undefined): string | undefined {
  if (!years) return undefined;
  const n = parseInt(years, 10);
  if (isNaN(n)) return undefined;
  if (n <= 2) return "0–2 years";
  if (n <= 5) return "3–5 years";
  if (n <= 10) return "6–10 years";
  return "10+ years";
}

/**
 * Compute all analytics from the raw submissions array.
 *
 * This function is called once whenever the submissions data changes
 * (on the Analytics tab of the Admin dashboard).
 *
 * @param submissions - Array of all submission records from the database
 * @returns AnalyticsData object with all chart-ready data
 */
export function computeAnalytics(submissions: Submission[]): AnalyticsData {
  const totalLeads = submissions.length;

  // Calculate the percentage of leads who indicated they want more info
  const wantsInfoCount = submissions.filter((s) => s.wants_info).length;
  const wantsInfoPct = totalLeads > 0 ? Math.round((wantsInfoCount / totalLeads) * 100) : 0;

  // ---------------------------------------------------------------------------
  // Programme frequency — counts how often each programme title appears
  // across ALL submissions' recommendation arrays.  This shows which
  // programmes the AI recommends most frequently.
  // ---------------------------------------------------------------------------
  const allRecs = submissions.flatMap((s) => s.recommendations || []);
  const programmeFrequency = countBy(allRecs, (r) => r.programmeTitle);

  // Category frequency — similar to programme frequency but grouped by
  // the broader category (e.g. "Digital Transformation & AI")
  const categoryFrequency = countBy(allRecs, (r) => r.category);

  // Industry distribution — extracted from each submission's profile.industry
  const industryDistribution = countBy(submissions, (s) => (s.profile as any)?.industry);

  // Experience distribution — bucket years_experience into ranges and count
  const experienceBuckets = countBy(submissions, (s) => bucketExperience((s.profile as any)?.years_experience));
  // Sort experience buckets in logical order (not by count)
  const expOrder = ["0–2 years", "3–5 years", "6–10 years", "10+ years"];
  experienceBuckets.sort((a, b) => expOrder.indexOf(a.name) - expOrder.indexOf(b.name));

  // Input method breakdown — how users provided their information
  const inputMethods = countBy(submissions, (s) => s.input_method);

  // ---------------------------------------------------------------------------
  // Submissions over time — group by date for a timeline chart.
  // We format dates as "DD Mon" (e.g. "11 Feb") for compact x-axis labels.
  // The array is reversed so dates appear chronologically (oldest → newest).
  // ---------------------------------------------------------------------------
  const dateMap: Record<string, number> = {};
  for (const s of submissions) {
    const d = new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    dateMap[d] = (dateMap[d] || 0) + 1;
  }
  const submissionsOverTime = Object.entries(dateMap)
    .map(([date, count]) => ({ date, count }))
    .reverse();

  // Summary stats — pick the most common industry and input method
  const topIndustry = industryDistribution[0]?.name || "—";
  const topInputMethod = inputMethods[0]?.name || "—";

  return {
    totalLeads,
    wantsInfoPct,
    topIndustry,
    topInputMethod,
    programmeFrequency,
    categoryFrequency,
    industryDistribution,
    experienceBuckets,
    inputMethods,
    submissionsOverTime,
  };
}
