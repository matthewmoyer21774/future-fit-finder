import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Building2, MousePointerClick } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";
import { computeAnalytics } from "@/lib/computeAnalytics";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(210 60% 50%)",
  "hsl(340 60% 50%)",
  "hsl(160 50% 45%)",
];

interface AnalyticsTabProps {
  submissions: any[];
}

export default function AnalyticsTab({ submissions }: AnalyticsTabProps) {
  const data = useMemo(() => computeAnalytics(submissions), [submissions]);

  const statCards = [
    { label: "Total Leads", value: data.totalLeads, icon: Users },
    { label: "Wants Info", value: `${data.wantsInfoPct}%`, icon: TrendingUp },
    { label: "Top Industry", value: data.topIndustry, icon: Building2 },
    { label: "Top Method", value: data.topInputMethod, icon: MousePointerClick },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold capitalize">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Programme Frequency" data={data.programmeFrequency} layout="vertical" />
        <ChartCard title="Industry Distribution" data={data.industryDistribution} />
        <ChartCard title="Experience Distribution" data={data.experienceBuckets} dataKey="name" />
        <PieChartCard title="Input Method Breakdown" data={data.inputMethods} />
        <ChartCard title="Category Frequency" data={data.categoryFrequency} layout="vertical" />
        <AreaChartCard title="Submissions Over Time" data={data.submissionsOverTime} />
      </div>
    </div>
  );
}

function ChartCard({ title, data, layout, dataKey = "name" }: { title: string; data: { name?: string; count: number; range?: string }[]; layout?: "vertical"; dataKey?: string }) {
  if (data.length === 0) return <EmptyChart title={title} />;
  const isVertical = layout === "vertical";
  const height = isVertical ? Math.max(250, data.length * 36) : 250;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout={isVertical ? "vertical" : "horizontal"} margin={{ left: isVertical ? 120 : 0 }}>
            {isVertical ? (
              <>
                <XAxis type="number" />
                <YAxis type="category" dataKey={dataKey} width={110} tick={{ fontSize: 11 }} />
              </>
            ) : (
              <>
                <XAxis dataKey={dataKey} tick={{ fontSize: 11 }} />
                <YAxis />
              </>
            )}
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PieChartCard({ title, data }: { title: string; data: { name: string; count: number }[] }) {
  if (data.length === 0) return <EmptyChart title={title} />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function AreaChartCard({ title, data }: { title: string; data: { date: string; count: number }[] }) {
  if (data.length === 0) return <EmptyChart title={title} />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent><p className="py-8 text-center text-muted-foreground">No data yet.</p></CardContent>
    </Card>
  );
}
