import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, Users, BookOpen, Mic, FileText, PenLine } from "lucide-react";

interface Submission {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  wants_info: boolean;
  profile: Record<string, string | string[]> | null;
  recommendations: Array<{
    programmeTitle: string;
    category: string;
    reasoning: string;
    url: string;
  }> | null;
  outreach_email: string | null;
  input_method: string;
}

interface AdminAnalyticsProps {
  submissions: Submission[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(340, 65%, 50%)",
  "hsl(45, 80%, 50%)",
  "hsl(270, 55%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(20, 75%, 50%)",
  "hsl(100, 50%, 45%)",
  "hsl(300, 45%, 55%)",
  "hsl(60, 65%, 45%)",
];

const AdminAnalytics = ({ submissions }: AdminAnalyticsProps) => {
  const stats = useMemo(() => {
    // Programme recommendation frequency
    const progCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const industryCounts: Record<string, number> = {};
    const seniorityCounts: Record<string, number> = {};
    const inputMethodCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};
    let wantsInfoCount = 0;

    submissions.forEach((sub) => {
      // Input method
      const method = sub.input_method || "unknown";
      inputMethodCounts[method] = (inputMethodCounts[method] || 0) + 1;

      // Wants info
      if (sub.wants_info) wantsInfoCount++;

      // Daily trend
      const day = new Date(sub.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;

      // Programme & category counts
      sub.recommendations?.forEach((rec) => {
        const title = rec.programmeTitle?.replace(/^(THE |A )/i, "").trim();
        if (title) progCounts[title] = (progCounts[title] || 0) + 1;
        const cat = rec.category;
        if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      // Profile demographics
      const profile = sub.profile as Record<string, any> | null;
      if (profile) {
        const industry = profile.industry;
        if (industry) industryCounts[industry] = (industryCounts[industry] || 0) + 1;
        const seniority = profile.seniority;
        if (seniority) seniorityCounts[seniority] = (seniorityCounts[seniority] || 0) + 1;
      }
    });

    const topProgrammes = Object.entries(progCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({
        name: name.length > 30 ? name.slice(0, 28) + "…" : name,
        fullName: name,
        count,
      }));

    const categoryData = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    const industryData = Object.entries(industryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const seniorityData = Object.entries(seniorityCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

    const inputMethodData = Object.entries(inputMethodCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

    const trendData = Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      submissions: count,
    }));

    return {
      topProgrammes,
      categoryData,
      industryData,
      seniorityData,
      inputMethodData,
      trendData,
      wantsInfoCount,
      totalRecs: Object.values(progCounts).reduce((a, b) => a + b, 0),
    };
  }, [submissions]);

  const inputMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "voice": return <Mic className="h-3 w-3" />;
      case "cv": return <FileText className="h-3 w-3" />;
      case "form": return <PenLine className="h-3 w-3" />;
      default: return null;
    }
  };

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No submissions data to analyse yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
              <p className="text-2xl font-bold text-foreground">{submissions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Programmes Recommended</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalRecs}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Want More Info</p>
              <p className="text-2xl font-bold text-foreground">{stats.wantsInfoCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Input Methods</p>
              <div className="flex gap-1.5 pt-1">
                {stats.inputMethodData.map((m) => (
                  <Badge key={m.name} variant="secondary" className="gap-1 text-xs">
                    {inputMethodIcon(m.name)} {m.name} ({m.value})
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Programmes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Recommended Programmes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProgrammes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topProgrammes} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={180}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, "Times recommended"]}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.fullName || label
                    }
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No recommendation data</p>
            )}
          </CardContent>
        </Card>

        {/* Categories Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommendations by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.categoryData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                    >
                      {stats.categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 text-xs">
                  {stats.categoryData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{c.name}</span>
                      <span className="font-medium text-foreground">({c.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No category data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Industry breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Industries</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.industryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.industryData} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(210, 70%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No industry data</p>
            )}
          </CardContent>
        </Card>

        {/* Seniority + Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seniority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.seniorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.seniorityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {stats.seniorityData.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No seniority data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submission Trend */}
      {stats.trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAnalytics;
