import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  ArrowLeft,
  Play,
  RotateCcw,
  FileText,
  Brain,
  Search,
  Sparkles,
  Upload,
  Send,
  Database,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface PipelineNode {
  id: string;
  label: string;
  tech: string;
  description: string;
  icon: React.ReactNode;
  sampleOutput: string;
  duration: number;
}

const pipelineNodes: PipelineNode[] = [
  {
    id: "input",
    label: "Input",
    tech: "CV / Form / LinkedIn",
    description: "User uploads a PDF CV, fills a form, or pastes LinkedIn text",
    icon: <Upload className="h-5 w-5" />,
    sampleOutput: "Received: CV_JaneDoe.pdf (245 KB)",
    duration: 800,
  },
  {
    id: "parse",
    label: "Text Extraction",
    tech: "PyPDF / python-docx",
    description: "Extract raw text from uploaded document using native Python parsers",
    icon: <FileText className="h-5 w-5" />,
    sampleOutput:
      'Extracted 2,847 chars: "Jane Doe — Senior Marketing Manager at Unilever with 8 years experience in FMCG..."',
    duration: 1200,
  },
  {
    id: "profile",
    label: "Profile Extraction",
    tech: "GPT-4o-mini",
    description:
      "LLM extracts structured profile: name, role, industry, skills, career goals",
    icon: <Brain className="h-5 w-5" />,
    sampleOutput:
      '{ name: "Jane Doe", current_role: "Senior Marketing Manager", industry: "FMCG", skills: ["brand strategy", "digital marketing", "team leadership"], career_goals: "Transition to CMO role" }',
    duration: 2000,
  },
  {
    id: "classify",
    label: "Zero-Shot Classification",
    tech: "GPT-4o-mini",
    description:
      "LLM classifies career interests into programme categories via zero-shot prompting",
    icon: <Sparkles className="h-5 w-5" />,
    sampleOutput:
      "Top categories: Marketing & Sales (87%), People Management & Leadership (72%), Strategy (65%)",
    duration: 1500,
  },
  {
    id: "search",
    label: "Vector Search",
    tech: "ChromaDB + text-embedding-3-small",
    description:
      "Semantic search across 61 programme embeddings using OpenAI embeddings",
    icon: <Database className="h-5 w-5" />,
    sampleOutput:
      "Top 8 matches: Brand Management (0.89), Sales Leadership (0.85), Digital Marketing & AI (0.83), Excellence in Sales (0.81)...",
    duration: 1000,
  },
  {
    id: "synthesis",
    label: "LLM Synthesis (RAG)",
    tech: "GPT-4o-mini",
    description:
      "Retrieval-Augmented Generation: combines candidate profile + top programme docs to generate personalised recommendations & email",
    icon: <Search className="h-5 w-5" />,
    sampleOutput:
      "Generated: 3 recommendations with personalised reasoning + outreach email draft (287 words)",
    duration: 2500,
  },
  {
    id: "output",
    label: "Output",
    tech: "JSON Response",
    description:
      "Returns top 3 programme recommendations with reasons + personalised outreach email",
    icon: <Send className="h-5 w-5" />,
    sampleOutput:
      "Response: { recommendations: [3 programmes], email_draft: '...' }",
    duration: 500,
  },
];

type NodeStatus = "idle" | "active" | "done";

const AdminArchitecture = () => {
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>(
    () => Object.fromEntries(pipelineNodes.map((n) => [n.id, "idle"]))
  );
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [activeNodeIndex, setActiveNodeIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [backendStatus, setBackendStatus] = useState<"unknown" | "online" | "offline">("unknown");
  const [isLive, setIsLive] = useState(false);

  const resetPipeline = () => {
    setNodeStatuses(
      Object.fromEntries(pipelineNodes.map((n) => [n.id, "idle"]))
    );
    setNodeOutputs({});
    setActiveNodeIndex(-1);
    setRunning(false);
    setProgress(0);
  };

  const animateNode = async (index: number, totalDuration: number, elapsedRef: { value: number }, output?: string) => {
    const node = pipelineNodes[index];
    setActiveNodeIndex(index);
    setNodeStatuses((prev) => ({ ...prev, [node.id]: "active" }));

    const steps = 20;
    const stepDuration = node.duration / steps;
    for (let s = 0; s < steps; s++) {
      await new Promise((r) => setTimeout(r, stepDuration));
      elapsedRef.value += stepDuration;
      setProgress(Math.round((elapsedRef.value / totalDuration) * 100));
    }

    if (output) {
      setNodeOutputs((prev) => ({ ...prev, [node.id]: output }));
    }
    setNodeStatuses((prev) => ({ ...prev, [node.id]: "done" }));
  };

  const runDemo = async () => {
    resetPipeline();
    setRunning(true);

    const totalDuration = pipelineNodes.reduce((s, n) => s + n.duration, 0);
    const elapsedRef = { value: 0 };

    // Try live backend first
    let liveData: any = null;
    try {
      const { data, error } = await supabase.functions.invoke("backend-proxy", {
        body: {
          career_goals: "Transition from Senior Marketing Manager to CMO role, with focus on digital transformation and brand strategy in FMCG industry",
        },
      });
      if (!error && data && !data.error && data.recommendations?.length > 0) {
        liveData = data;
        setIsLive(true);
        setBackendStatus("online");
      } else {
        setBackendStatus("offline");
      }
    } catch {
      setBackendStatus("offline");
    }

    // Animate through each node
    // Node 0: Input
    await animateNode(0, totalDuration, elapsedRef,
      liveData ? "Sent career goals text to Railway backend (live)" : undefined
    );

    // Node 1: Parse
    await animateNode(1, totalDuration, elapsedRef);

    // Node 2: Profile
    await animateNode(2, totalDuration, elapsedRef,
      liveData?.profile
        ? `{ name: "${liveData.profile.name || "N/A"}", current_role: "${liveData.profile.current_role || "N/A"}", industry: "${liveData.profile.industry || "N/A"}", skills: [${(liveData.profile.skills || []).slice(0, 3).map((s: string) => `"${s}"`).join(", ")}] }`
        : undefined
    );

    // Node 3: Classify
    await animateNode(3, totalDuration, elapsedRef,
      liveData?.topCategories?.length
        ? `Top categories: ${liveData.topCategories.map((c: any) => `${c.category} (${Math.round(c.score * 100)}%)`).join(", ")}`
        : undefined
    );

    // Node 4: Vector search
    await animateNode(4, totalDuration, elapsedRef);

    // Node 5: Synthesis
    await animateNode(5, totalDuration, elapsedRef,
      liveData?.recommendations?.length
        ? `Generated: ${liveData.recommendations.length} recommendations with personalised reasoning + outreach email (${liveData.outreachEmail?.length || 0} chars)`
        : undefined
    );

    // Node 6: Output
    await animateNode(6, totalDuration, elapsedRef,
      liveData?.recommendations?.length
        ? `Response: { recommendations: [${liveData.recommendations.map((r: any) => `"${r.programmeTitle}"`).join(", ")}], email_draft: '...' }`
        : undefined
    );

    setActiveNodeIndex(pipelineNodes.length);
    setProgress(100);
    setRunning(false);
  };

  const getNodeColor = (status: NodeStatus) => {
    switch (status) {
      case "idle":
        return "border-border bg-muted/50";
      case "active":
        return "border-primary bg-primary/10 shadow-lg shadow-primary/20";
      case "done":
        return "border-green-500 bg-green-500/10";
    }
  };

  const getIconColor = (status: NodeStatus) => {
    switch (status) {
      case "idle":
        return "text-muted-foreground";
      case "active":
        return "text-primary";
      case "done":
        return "text-green-600";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Vlerick Advisor
              </h2>
              <p className="text-xs text-muted-foreground">
                Backend Architecture
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <motion.h1
            className="mb-2 text-3xl font-bold text-foreground"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            RAG Recommendation Pipeline
          </motion.h1>
           <p className="mb-4 text-muted-foreground">
            Python FastAPI backend deployed on Railway — full NLP pipeline
            visualization
          </p>

          {backendStatus !== "unknown" && (
            <div className="mb-4 flex items-center justify-center gap-2">
              {backendStatus === "online" ? (
                <Badge className="bg-green-500/20 text-green-700 border-green-500/30 gap-1">
                  <Wifi className="h-3 w-3" /> Railway Backend Online — Live Data
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <WifiOff className="h-3 w-3" /> Railway Offline — Using Sample Data
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={runDemo}
              disabled={running}
              className="gap-2"
              size="lg"
            >
              <Play className="h-4 w-4" />
              {running ? "Calling Railway..." : "Run Demo"}
            </Button>
            <Button
              onClick={resetPipeline}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          {(running || progress > 0) && (
            <div className="mx-auto mt-6 max-w-md">
              <Progress value={progress} className="h-2" />
              <p className="mt-1 text-xs text-muted-foreground">
                {progress}% complete
              </p>
            </div>
          )}
        </div>

        {/* Pipeline nodes */}
        <div className="mx-auto max-w-3xl space-y-4">
          {pipelineNodes.map((node, i) => {
            const status = nodeStatuses[node.id];
            return (
              <div key={node.id}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card
                    className={`transition-all duration-500 border-2 ${getNodeColor(status)}`}
                  >
                    <CardContent className="flex items-start gap-4 p-5">
                      {/* Step number + icon */}
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-500 ${
                          status === "done"
                            ? "bg-green-500/20"
                            : status === "active"
                              ? "bg-primary/20"
                              : "bg-muted"
                        }`}
                      >
                        <span className={getIconColor(status)}>
                          {node.icon}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-foreground font-sans text-base">
                            {node.label}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="text-xs font-mono"
                          >
                            {node.tech}
                          </Badge>
                          {status === "active" && (
                            <motion.div
                              className="h-2 w-2 rounded-full bg-primary"
                              animate={{ scale: [1, 1.5, 1] }}
                              transition={{ repeat: Infinity, duration: 1 }}
                            />
                          )}
                          {status === "done" && (
                            <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">
                              ✓ Done
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {node.description}
                        </p>

                        <AnimatePresence>
                          {(status === "active" || status === "done") && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 rounded-lg bg-card border border-border p-3">
                                <p className="text-xs font-mono text-muted-foreground leading-relaxed break-all">
                                  {nodeOutputs[node.id] || node.sampleOutput}
                                </p>
                                {nodeOutputs[node.id] && isLive && (
                                  <Badge variant="outline" className="mt-1 text-[10px]">LIVE</Badge>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Connector arrow */}
                {i < pipelineNodes.length - 1 && (
                  <div className="flex justify-center py-1">
                    <motion.div
                      className={`h-6 w-0.5 transition-colors duration-500 ${
                        nodeStatuses[pipelineNodes[i + 1].id] !== "idle"
                          ? "bg-green-500"
                          : status === "done"
                            ? "bg-primary"
                            : "bg-border"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tech stack summary */}
        <motion.div
          className="mx-auto mt-12 max-w-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-border">
            <CardContent className="p-6">
              <h3 className="mb-4 font-bold text-foreground text-lg font-sans">
                Tech Stack
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: "FastAPI", role: "API Server" },
                  { name: "PyPDF / python-docx", role: "Document Parsing" },
                  { name: "GPT-4o-mini", role: "Profile + RAG Synthesis" },
                  {
                    name: "GPT-4o-mini",
                    role: "Zero-Shot Classification",
                  },
                  {
                    name: "ChromaDB",
                    role: "Vector Store (61 programmes)",
                  },
                  {
                    name: "text-embedding-3-small",
                    role: "OpenAI Embeddings",
                  },
                  { name: "Railway", role: "Deployment Platform" },
                  { name: "React + Framer Motion", role: "Frontend" },
                  { name: "Lovable Cloud", role: "Auth & Database" },
                ].map((tech) => (
                  <div
                    key={tech.name}
                    className="rounded-lg border border-border bg-muted/50 p-3"
                  >
                    <p className="font-medium text-sm text-foreground font-sans">
                      {tech.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{tech.role}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminArchitecture;
