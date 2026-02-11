import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Copy, Check, GraduationCap, MapPin, Calendar, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface Recommendation {
  programmeTitle: string;
  category: string;
  fee?: string;
  duration?: string;
  location?: string;
  startDate?: string;
  url: string;
  reasoning: string;
}

interface ResultsState {
  recommendations: Recommendation[];
  outreachEmail: string;
}

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const state = location.state as ResultsState | undefined;

  if (!state?.recommendations) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="mb-4 text-muted-foreground">No recommendations found. Please submit your profile first.</p>
            <Button onClick={() => navigate("/")}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { recommendations, outreachEmail } = state;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(outreachEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Vlerick Advisor</h2>
              <p className="text-xs text-muted-foreground">Your Recommendations</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Your Top 3 Programme Matches</h1>
          <p className="mb-8 text-muted-foreground">Based on your profile, here are the programmes we recommend.</p>
        </motion.div>

        {/* Recommendation Cards */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <Card className="flex h-full flex-col border-border shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">{rec.category}</Badge>
                    <span className="text-sm font-bold text-primary">#{i + 1}</span>
                  </div>
                  <CardTitle className="text-lg leading-snug">{rec.programmeTitle}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{rec.reasoning}</p>

                  <div className="mt-auto space-y-2 text-sm text-muted-foreground">
                    {rec.fee && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>{rec.fee}</span>
                      </div>
                    )}
                    {rec.duration && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{rec.duration}</span>
                      </div>
                    )}
                    {rec.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{rec.location}</span>
                      </div>
                    )}
                    {rec.startDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{rec.startDate}</span>
                      </div>
                    )}
                  </div>

                  <a
                    href={rec.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      View Programme
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Outreach Email */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Draft Outreach Email</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm text-foreground font-sans leading-relaxed">
                {outreachEmail}
              </pre>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Results;
