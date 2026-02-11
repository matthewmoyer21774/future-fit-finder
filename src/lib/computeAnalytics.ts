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
  input_method: string;
}

export interface AnalyticsData {
  totalLeads: number;
  wantsInfoPct: number;
  topIndustry: string;
  topInputMethod: string;
  programmeFrequency: { name: string; count: number }[];
  categoryFrequency: { name: string; count: number }[];
  industryDistribution: { name: string; count: number }[];
  experienceBuckets: { name: string; count: number }[];
  inputMethods: { name: string; count: number }[];
  submissionsOverTime: { date: string; count: number }[];
}

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

function bucketExperience(years: string | undefined): string | undefined {
  if (!years) return undefined;
  const n = parseInt(years, 10);
  if (isNaN(n)) return undefined;
  if (n <= 2) return "0–2 years";
  if (n <= 5) return "3–5 years";
  if (n <= 10) return "6–10 years";
  return "10+ years";
}

export function computeAnalytics(submissions: Submission[]): AnalyticsData {
  const totalLeads = submissions.length;
  const wantsInfoCount = submissions.filter((s) => s.wants_info).length;
  const wantsInfoPct = totalLeads > 0 ? Math.round((wantsInfoCount / totalLeads) * 100) : 0;

  // Programme frequency
  const allRecs = submissions.flatMap((s) => s.recommendations || []);
  const programmeFrequency = countBy(allRecs, (r) => r.programmeTitle);

  // Category frequency
  const categoryFrequency = countBy(allRecs, (r) => r.category);

  // Industry
  const industryDistribution = countBy(submissions, (s) => (s.profile as any)?.industry);

  // Experience
  const experienceBuckets = countBy(submissions, (s) => bucketExperience((s.profile as any)?.years_experience));
  const expOrder = ["0–2 years", "3–5 years", "6–10 years", "10+ years"];
  experienceBuckets.sort((a, b) => expOrder.indexOf(a.name) - expOrder.indexOf(b.name));

  // Input methods
  const inputMethods = countBy(submissions, (s) => s.input_method);

  // Over time
  const dateMap: Record<string, number> = {};
  for (const s of submissions) {
    const d = new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    dateMap[d] = (dateMap[d] || 0) + 1;
  }
  const submissionsOverTime = Object.entries(dateMap)
    .map(([date, count]) => ({ date, count }))
    .reverse();

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
