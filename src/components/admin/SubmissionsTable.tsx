import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, User, Briefcase, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export default function SubmissionsTable({ submissions }: { submissions: Submission[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
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
  );
}
