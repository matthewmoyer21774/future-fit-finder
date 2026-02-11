import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Lock, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import rawProgrammeData from "../../programme_pages/programmes_database.json";
import SubmissionsTable from "@/components/admin/SubmissionsTable";
import AnalyticsTab from "@/components/admin/AnalyticsTab";

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
      toast({ title: "Access denied", description: e.message || "Invalid password", variant: "destructive" });
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
        <Tabs defaultValue="submissions">
          <TabsList className="mb-6">
            <TabsTrigger value="submissions">Submissions ({submissions.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="submissions">
            <p className="mb-4 text-muted-foreground">All lead submissions with recommendations and outreach emails.</p>
            <SubmissionsTable submissions={submissions} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab submissions={submissions} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
