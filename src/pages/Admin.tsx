import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Lock, ChevronDown, ChevronUp, Mail, User, Briefcase, Calendar, CheckCircle2, Database, Loader2, BarChart3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import rawProgrammeData from "../../programme_pages/programmes_database.json";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

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
    fee?: string;
    duration?: string;
    location?: string;
    startDate?: string;
  }> | null;
  outreach_email: string | null;
  input_method: string;
}

const Admin = () => {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"submissions" | "analytics">("submissions");

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: { password },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setSubmissions(data.submissions || []);
      setAuthenticated(true);
    } catch (e: any) {
      toast({
        title: "Access denied",
        description: e.message || "Invalid password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="w-[400px] shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Admin Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={!password || loading}>
                {loading ? "Checking…" : "Sign In"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Vlerick Advisor</h2>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={seeding}
              onClick={async () => {
                setSeeding(true);
                try {
                  const { data, error } = await supabase.functions.invoke("seed-programmes", {
                    body: { programmes: rawProgrammeData, admin_password: password },
                  });
                  if (error) throw new Error(data?.error || error.message);
                  toast({ title: "Database seeded", description: `${data.inserted} programmes inserted.` });
                } catch (e: any) {
                  toast({ title: "Seed failed", description: e.message, variant: "destructive" });
                } finally {
                  setSeeding(false);
                }
              }}
            >
              {seeding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Seeding...</> : <><Database className="mr-2 h-4 w-4" /> Seed Programmes</>}
            </Button>
            <Link to="/admin/architecture">
              <Button variant="outline" size="sm">🔬 Architecture</Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm">Back to Home</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tab bar */}
        <div className="mb-6 flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
          <button
            onClick={() => setActiveTab("submissions")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "submissions"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-4 w-4" /> Submissions ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "analytics"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4" /> Analytics
          </button>
        </div>

        {activeTab === "analytics" ? (
          <AdminAnalytics submissions={submissions as any} />
        ) : (
        <>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Submissions ({submissions.length})</h1>
        <p className="mb-6 text-muted-foreground">All lead submissions with recommendations and outreach emails.</p>

        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Wants Info</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => {
                const isExpanded = expandedId === sub.id;
                const profile = sub.profile as Record<string, string> | null;
                return (
                  <>
                    <TableRow
                      key={sub.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                    >
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(sub.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="font-medium">{sub.name || "—"}</TableCell>
                      <TableCell>{sub.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{sub.input_method}</Badge>
                      </TableCell>
                      <TableCell>{profile?.jobTitle || "—"}</TableCell>
                      <TableCell>
                        {sub.wants_info ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${sub.id}-detail`}>
                        <TableCell colSpan={7} className="bg-muted/30 p-6">
                          <div className="grid gap-6 md:grid-cols-2">
                            {/* Profile */}
                            <div>
                              <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                                <User className="h-4 w-4" /> Profile
                              </h3>
                              <div className="space-y-1 text-sm">
                                {profile && Object.entries(profile).map(([k, v]) =>
                                  v ? (
                                    <div key={k}>
                                      <span className="font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>{" "}
                                      <span className="text-muted-foreground">{v}</span>
                                    </div>
                                  ) : null
                                )}
                              </div>
                            </div>

                            {/* Recommendations */}
                            <div>
                              <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                                <Briefcase className="h-4 w-4" /> Recommendations
                              </h3>
                              <div className="space-y-3">
                                {sub.recommendations?.map((rec, i) => (
                                  <div key={i} className="rounded-md border border-border bg-card p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">{rec.programmeTitle}</span>
                                      <Badge variant="secondary" className="text-xs">{rec.category}</Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">{rec.reasoning}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Outreach Email */}
                            {sub.outreach_email && (
                              <div className="md:col-span-2">
                                <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                                  <Mail className="h-4 w-4" /> Draft Outreach Email
                                </h3>
                                <pre className="whitespace-pre-wrap rounded-lg bg-card border border-border p-4 text-sm text-foreground font-sans leading-relaxed">
                                  {sub.outreach_email}
                                </pre>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No submissions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </>
        )}
      </main>
    </div>
  );
};

export default Admin;
