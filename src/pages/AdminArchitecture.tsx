import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  ArrowLeft,
  Play,
  RotateCcw,
  FileText,
  Brain,
  Sparkles,
  Upload,
  Send,
  Database,
  Wifi,
  WifiOff,
  PenLine,
  Mic,
  MicOff,
  Loader2,
  Check,
  Zap,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ─── Pipeline Node Config ────────────────────────────────────────────────────

interface PipelineNode {
  id: string;
  step: number;
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
    step: 1,
    label: "Input Received",
    tech: "CV / Form / Voice",
    description: "Your input has been received and sent to the pipeline",
    icon: <Upload className="h-5 w-5" />,
    sampleOutput: 'Received: CV_JaneDoe.pdf (245 KB)',
    duration: 800,
  },
  {
    id: "parse",
    step: 2,
    label: "Text Extraction",
    tech: "PyPDF / python-docx",
    description: "Extracting raw text from your document",
    icon: <FileText className="h-5 w-5" />,
    sampleOutput: 'Extracted 2,847 chars: "Jane Doe — Senior Marketing Manager at Unilever with 8 years experience…"',
    duration: 1200,
  },
  {
    id: "profile",
    step: 3,
    label: "Profile Extraction",
    tech: "GPT-4o-mini",
    description: "GPT-4o-mini extracts structured profile: name, role, industry, skills, career goals",
    icon: <Brain className="h-5 w-5" />,
    sampleOutput: '{ name: "Jane Doe", current_role: "Senior Marketing Manager", industry: "FMCG", skills: ["brand strategy", "digital marketing"] }',
    duration: 2000,
  },
  {
    id: "classify",
    step: 4,
    label: "Zero-Shot Classification",
    tech: "text-embedding-3-small",
    description: "Embedding-based cosine similarity against 150 category exemplars",
    icon: <Sparkles className="h-5 w-5" />,
    sampleOutput: "Top categories: Marketing & Sales (87%), People Management & Leadership (72%), Strategy (65%)",
    duration: 1500,
  },
  {
    id: "search",
    step: 5,
    label: "Programme Matching",
    tech: "All 62 Programmes",
    description: "Scanning all Vlerick programmes against your profile",
    icon: <Database className="h-5 w-5" />,
    sampleOutput: "Scanning 62 programmes… Top 8 matches identified by relevance score",
    duration: 1000,
  },
  {
    id: "synthesis",
    step: 6,
    label: "RAG Synthesis",
    tech: "GPT-5",
    description: "GPT-5 generates personalised recommendations and outreach email",
    icon: <Zap className="h-5 w-5" />,
    sampleOutput: "Generated: 3 recommendations with personalised reasoning + outreach email draft (287 words)",
    duration: 2500,
  },
  {
    id: "output",
    step: 7,
    label: "Output",
    tech: "JSON Response",
    description: "Final recommendations delivered",
    icon: <Send className="h-5 w-5" />,
    sampleOutput: 'Response: { recommendations: [3 programmes], email_draft: "..." }',
    duration: 500,
  },
];

type NodeStatus = "idle" | "active" | "done";

// ─── Typewriter Hook ─────────────────────────────────────────────────────────

function useTypewriter(text: string, active: boolean, speed = 12) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active || !text) { setDisplayed(""); return; }
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return displayed;
}

// ─── Pipeline Node Component ─────────────────────────────────────────────────

function PipelineNodeCard({
  node,
  status,
  output,
  isLive,
  elapsed,
}: {
  node: PipelineNode;
  status: NodeStatus;
  output: string;
  isLive: boolean;
  elapsed: number | null;
}) {
  const typewriterText = useTypewriter(output || node.sampleOutput, status === "active" || status === "done");

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: node.step * 0.06 }}
    >
      <div
        className={`relative rounded-xl border-2 p-4 transition-all duration-500 ${
          status === "active"
            ? "border-primary bg-primary/5 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]"
            : status === "done"
              ? "border-green-500/60 bg-green-500/5"
              : "border-border bg-card/50"
        }`}
      >
        {/* Active glow ring */}
        {status === "active" && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-primary/50"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
        )}

        <div className="flex items-start gap-3">
          {/* Step number circle */}
          <div
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-500 ${
              status === "done"
                ? "border-green-500 bg-green-500 text-white"
                : status === "active"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {status === "done" ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <Check className="h-4 w-4" />
              </motion.div>
            ) : (
              node.step
            )}
            {status === "active" && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary"
                animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-foreground text-sm font-sans">
                {node.label}
              </h3>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                {node.tech}
              </Badge>
              {status === "active" && (
                <motion.div
                  className="h-2 w-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
              )}
              {elapsed !== null && (
                <span className={`ml-auto text-[10px] font-mono flex items-center gap-1 ${
                  status === "done" ? "text-green-600" : "text-primary"
                }`}>
                  <Clock className="h-3 w-3" />
                  {status === "active" ? `${elapsed}ms` : `${elapsed}ms`}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
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
                  <div className="mt-2 rounded-lg bg-background/80 border border-border p-2.5">
                    <p className="text-[11px] font-mono text-muted-foreground leading-relaxed break-all">
                      {typewriterText}
                      {status === "active" && (
                        <motion.span
                          className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 align-middle"
                          animate={{ opacity: [1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                        />
                      )}
                    </p>
                    {output && isLive && status === "done" && (
                      <Badge variant="outline" className="mt-1 text-[9px] border-green-500/40 text-green-600">
                        LIVE DATA
                      </Badge>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Connector Line ──────────────────────────────────────────────────────────

function ConnectorLine({ fromDone, toActive }: { fromDone: boolean; toActive: boolean }) {
  return (
    <div className="flex justify-start pl-[18px] py-0.5">
      <div className="relative h-6 w-0.5 overflow-hidden rounded-full bg-border">
        {(fromDone || toActive) && (
          <motion.div
            className="absolute inset-x-0 top-0 bg-gradient-to-b from-primary via-primary to-green-500 rounded-full"
            initial={{ height: 0 }}
            animate={{ height: "100%" }}
            transition={{ duration: 0.4 }}
          />
        )}
        {toActive && (
          <motion.div
            className="absolute inset-x-0 h-2 bg-primary/80 rounded-full"
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const AdminArchitecture = () => {
  const { toast } = useToast();

  // Input state
  const [activeTab, setActiveTab] = useState("form");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [voiceText, setVoiceText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [formData, setFormData] = useState({
    jobTitle: "",
    industry: "",
    yearsExperience: "",
    careerGoals: "",
    areasOfInterest: "",
  });

  // Pipeline state
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>(
    () => Object.fromEntries(pipelineNodes.map((n) => [n.id, "idle"]))
  );
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, string>>({});
  const [nodeTimings, setNodeTimings] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backendStatus, setBackendStatus] = useState<"unknown" | "online" | "offline">("unknown");
  const [isLive, setIsLive] = useState(false);
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [liveResults, setLiveResults] = useState<any>(null);

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetPipeline = () => {
    setNodeStatuses(Object.fromEntries(pipelineNodes.map((n) => [n.id, "idle"])));
    setNodeOutputs({});
    setNodeTimings({});
    setRunning(false);
    setProgress(0);
    setPipelineComplete(false);
    setLiveResults(null);
    setIsLive(false);
    setBackendStatus("unknown");
  };

  const hasInput =
    (activeTab === "form" && (formData.jobTitle || formData.careerGoals)) ||
    (activeTab === "cv" && cvFile) ||
    (activeTab === "voice" && voiceText);

  // ─── Animate a single node ──────────────────────────────────────────────

  const animateNode = useCallback(async (
    index: number,
    totalDuration: number,
    elapsedRef: { value: number },
    output?: string,
  ) => {
    const node = pipelineNodes[index];
    setNodeStatuses((prev) => ({ ...prev, [node.id]: "active" }));

    const startTime = Date.now();
    const steps = 20;
    const stepDuration = node.duration / steps;

    // Timer update interval
    const timerId = setInterval(() => {
      setNodeTimings((prev) => ({ ...prev, [node.id]: Date.now() - startTime }));
    }, 50);

    for (let s = 0; s < steps; s++) {
      await new Promise((r) => setTimeout(r, stepDuration));
      elapsedRef.value += stepDuration;
      setProgress(Math.min(Math.round((elapsedRef.value / totalDuration) * 100), 100));
    }

    clearInterval(timerId);
    const finalTime = Date.now() - startTime;
    setNodeTimings((prev) => ({ ...prev, [node.id]: finalTime }));

    if (output) {
      setNodeOutputs((prev) => ({ ...prev, [node.id]: output }));
    }
    setNodeStatuses((prev) => ({ ...prev, [node.id]: "done" }));
  }, []);

  // ─── Run Pipeline ──────────────────────────────────────────────────────

  const runPipeline = async () => {
    resetPipeline();
    setRunning(true);

    const totalDuration = pipelineNodes.reduce((s, n) => s + n.duration, 0);
    const elapsedRef = { value: 0 };

    // Build request body
    const body: Record<string, string> = {};
    let inputDescription = "";

    if (activeTab === "cv" && cvFile) {
      const arrayBuffer = await cvFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      body.file_base64 = btoa(binary);
      body.file_name = cvFile.name;
      inputDescription = `Uploaded: ${cvFile.name} (${(cvFile.size / 1024).toFixed(0)} KB)`;
    } else if (activeTab === "voice" && voiceText) {
      body.career_goals = voiceText;
      inputDescription = `Voice transcript: "${voiceText.slice(0, 80)}${voiceText.length > 80 ? "…" : ""}"`;
    } else {
      const parts: string[] = [];
      if (formData.jobTitle) parts.push(`Current role: ${formData.jobTitle}`);
      if (formData.industry) parts.push(`Industry: ${formData.industry}`);
      if (formData.yearsExperience) parts.push(`${formData.yearsExperience} years of experience`);
      if (formData.careerGoals) parts.push(`Goals: ${formData.careerGoals}`);
      if (formData.areasOfInterest) parts.push(`Interests: ${formData.areasOfInterest}`);
      if (parts.length === 0) {
        toast({ title: "Missing input", description: "Please fill in at least your job title or career goals.", variant: "destructive" });
        setRunning(false);
        return;
      }
      body.career_goals = parts.join(". ");
      inputDescription = `Form: "${parts.join(", ").slice(0, 80)}…"`;
    }

    // Step 1: Input (animate immediately)
    await animateNode(0, totalDuration, elapsedRef, inputDescription);

    // Fire backend call in background
    const backendPromise = supabase.functions.invoke("backend-proxy", { body });

    // Step 2: Text Extraction (animate while waiting)
    await animateNode(1, totalDuration, elapsedRef);

    // Wait for backend response
    let liveData: any = null;
    try {
      const { data, error } = await backendPromise;
      if (!error && data && !data.error && data.recommendations?.length > 0) {
        liveData = data;
        setIsLive(true);
        setBackendStatus("online");
        setLiveResults(data);
      } else {
        setBackendStatus("offline");
      }
    } catch {
      setBackendStatus("offline");
    }

    // Step 3: Profile Extraction
    await animateNode(2, totalDuration, elapsedRef,
      liveData?.profile
        ? `{ name: "${liveData.profile.name || "N/A"}", current_role: "${liveData.profile.current_role || "N/A"}", industry: "${liveData.profile.industry || "N/A"}", skills: [${(liveData.profile.skills || []).slice(0, 3).map((s: string) => `"${s}"`).join(", ")}] }`
        : undefined
    );

    // Step 4: Classification
    await animateNode(3, totalDuration, elapsedRef,
      liveData?.topCategories?.length
        ? `Top categories: ${liveData.topCategories.map((c: any) => `${c.category} (${Math.round(c.score * 100)}%)`).join(", ")}`
        : undefined
    );

    // Step 5: Programme Matching
    await animateNode(4, totalDuration, elapsedRef,
      liveData?.recommendations?.length
        ? `Scanned 62 programmes → ${liveData.recommendations.length} top matches identified`
        : undefined
    );

    // Step 6: RAG Synthesis
    await animateNode(5, totalDuration, elapsedRef,
      liveData?.recommendations?.length
        ? `Generated: ${liveData.recommendations.length} recommendations + outreach email (${liveData.outreachEmail?.length || 0} chars)`
        : undefined
    );

    // Step 7: Output
    await animateNode(6, totalDuration, elapsedRef,
      liveData?.recommendations?.length
        ? `✓ ${liveData.recommendations.map((r: any) => `"${r.programmeTitle}"`).join(", ")}`
        : undefined
    );

    setProgress(100);
    setRunning(false);
    setPipelineComplete(true);
  };

  // Voice recording handler
  const toggleRecording = () => {
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not supported", description: "Speech recognition is not supported in your browser. Try Chrome.", variant: "destructive" });
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    let finalTranscript = voiceText;
    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setVoiceText(finalTranscript + interim);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    rec.start();
    setRecognition(rec);
    setIsRecording(true);
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
              <h2 className="text-lg font-bold text-foreground font-sans">Vlerick Advisor</h2>
              <p className="text-xs text-muted-foreground">Live Pipeline Demo</p>
            </div>
          </div>
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Title */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            RAG Recommendation Pipeline
          </h1>
          <p className="text-muted-foreground">
            Provide real input and watch data flow through each stage in real-time
          </p>
          {backendStatus !== "unknown" && (
            <div className="mt-3 flex items-center justify-center gap-2">
              {backendStatus === "online" ? (
                <Badge className="bg-green-500/20 text-green-700 border-green-500/30 gap-1">
                  <Wifi className="h-3 w-3" /> Railway Backend Online — Live Data
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <WifiOff className="h-3 w-3" /> Railway Offline — Sample Data
                </Badge>
              )}
            </div>
          )}
        </motion.div>

        {/* Progress bar */}
        {(running || progress > 0) && (
          <div className="mx-auto mb-8 max-w-4xl">
            <Progress value={progress} className="h-2" />
            <p className="mt-1 text-center text-xs text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {/* Two-column layout */}
        <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-[380px_1fr]">

          {/* ─── LEFT: Input Panel ─────────────────────────────────── */}
          <div className="space-y-4">
            <Card className="border-border shadow-lg sticky top-8">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground text-base mb-4 font-sans">Pipeline Input</h3>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4 w-full">
                    <TabsTrigger value="form" className="flex-1 gap-1 text-xs">
                      <PenLine className="h-3.5 w-3.5" /> Form
                    </TabsTrigger>
                    <TabsTrigger value="cv" className="flex-1 gap-1 text-xs">
                      <Upload className="h-3.5 w-3.5" /> CV
                    </TabsTrigger>
                    <TabsTrigger value="voice" className="flex-1 gap-1 text-xs">
                      <Mic className="h-3.5 w-3.5" /> Voice
                    </TabsTrigger>
                  </TabsList>

                  {/* Form Tab */}
                  <TabsContent value="form" className="space-y-3 text-left">
                    <div className="space-y-1.5">
                      <Label htmlFor="arch-jobTitle" className="text-xs">Job Title</Label>
                      <Input id="arch-jobTitle" placeholder="e.g. Marketing Manager" value={formData.jobTitle} onChange={(e) => handleFormChange("jobTitle", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="arch-industry" className="text-xs">Industry</Label>
                      <Input id="arch-industry" placeholder="e.g. Technology" value={formData.industry} onChange={(e) => handleFormChange("industry", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="arch-years" className="text-xs">Years of Experience</Label>
                      <Input id="arch-years" placeholder="e.g. 5" value={formData.yearsExperience} onChange={(e) => handleFormChange("yearsExperience", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="arch-goals" className="text-xs">Career Goals</Label>
                      <Textarea id="arch-goals" placeholder="What do you want to achieve?" value={formData.careerGoals} onChange={(e) => handleFormChange("careerGoals", e.target.value)} rows={2} className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="arch-interests" className="text-xs">Areas of Interest</Label>
                      <Textarea id="arch-interests" placeholder="e.g. Leadership, Digital Transformation" value={formData.areasOfInterest} onChange={(e) => handleFormChange("areasOfInterest", e.target.value)} rows={2} className="text-sm" />
                    </div>
                  </TabsContent>

                  {/* CV Tab */}
                  <TabsContent value="cv" className="space-y-3 text-left">
                    <div
                      className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-6 transition-colors hover:border-primary/50 hover:bg-muted"
                      onClick={() => document.getElementById("arch-cv-upload")?.click()}
                    >
                      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                      {cvFile ? (
                        <div className="text-center">
                          <p className="font-medium text-foreground text-sm">{cvFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(cvFile.size / 1024).toFixed(0)} KB — Click to replace</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="font-medium text-foreground text-sm">Drop your CV here</p>
                          <p className="text-xs text-muted-foreground">PDF or Word accepted</p>
                        </div>
                      )}
                      <input id="arch-cv-upload" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                    </div>
                  </TabsContent>

                  {/* Voice Tab */}
                  <TabsContent value="voice" className="space-y-3 text-left">
                    <div className="flex flex-col items-center gap-3">
                      <Button
                        type="button"
                        variant={isRecording ? "destructive" : "outline"}
                        size="lg"
                        className="gap-2"
                        onClick={toggleRecording}
                      >
                        {isRecording ? <><MicOff className="h-5 w-5" /> Stop Recording</> : <><Mic className="h-5 w-5" /> Start Recording</>}
                      </Button>
                      {isRecording && (
                        <p className="text-xs text-primary animate-pulse">Listening… describe your role and goals.</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="arch-voice" className="text-xs">Transcription</Label>
                      <Textarea id="arch-voice" placeholder="Your speech appears here…" value={voiceText} onChange={(e) => setVoiceText(e.target.value)} rows={4} className="text-sm" />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={runPipeline}
                    disabled={running || !hasInput}
                    className="flex-1 gap-2"
                    size="lg"
                  >
                    {running ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                    ) : (
                      <><Play className="h-4 w-4" /> Run Pipeline</>
                    )}
                  </Button>
                  <Button onClick={resetPipeline} variant="outline" size="lg">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── RIGHT: Pipeline Visualization ─────────────────────── */}
          <div className="space-y-0">
            {pipelineNodes.map((node, i) => (
              <div key={node.id}>
                <PipelineNodeCard
                  node={node}
                  status={nodeStatuses[node.id]}
                  output={nodeOutputs[node.id] || ""}
                  isLive={isLive && !!nodeOutputs[node.id]}
                  elapsed={nodeTimings[node.id] ?? null}
                />
                {i < pipelineNodes.length - 1 && (
                  <ConnectorLine
                    fromDone={nodeStatuses[node.id] === "done"}
                    toActive={nodeStatuses[pipelineNodes[i + 1].id] === "active"}
                  />
                )}
              </div>
            ))}

            {/* Results summary */}
            <AnimatePresence>
              {pipelineComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6"
                >
                  <Card className="border-2 border-primary/30 bg-primary/5 shadow-lg">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                          <Sparkles className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <h3 className="font-bold text-foreground font-sans">Pipeline Complete</h3>
                      </div>
                      {liveResults?.recommendations?.length ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Generated <strong className="text-foreground">{liveResults.recommendations.length} recommendations</strong> from live backend:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {liveResults.recommendations.map((r: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {r.programmeTitle}
                              </Badge>
                            ))}
                          </div>
                          <div className="pt-2 flex items-center gap-2">
                            <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs gap-1">
                              <Wifi className="h-3 w-3" /> Live Results
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Total pipeline time: {Object.values(nodeTimings).reduce((a, b) => a + b, 0).toLocaleString()}ms
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Pipeline completed with sample data. Connect the Railway backend for live results.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Tech Stack */}
        <motion.div
          className="mx-auto mt-12 max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-border">
            <CardContent className="p-6">
              <h3 className="mb-4 font-bold text-foreground text-lg font-sans">Tech Stack</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: "FastAPI", role: "API Server" },
                  { name: "PyPDF / python-docx", role: "Document Parsing" },
                  { name: "GPT-5", role: "RAG Synthesis + Outreach" },
                  { name: "text-embedding-3-small", role: "Embedding Classification" },
                  { name: "All 62 Programmes", role: "Direct Context Injection" },
                  { name: "Railway", role: "Deployment Platform" },
                  { name: "React + Framer Motion", role: "Frontend" },
                  { name: "Lovable Cloud", role: "Auth & Database" },
                ].map((tech, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/50 p-3">
                    <p className="font-medium text-sm text-foreground font-sans">{tech.name}</p>
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
