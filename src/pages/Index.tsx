import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, PenLine, ArrowRight, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";


interface ProfileData {
  jobTitle: string;
  industry: string;
  yearsExperience: string;
  careerGoals: string;
  areasOfInterest: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("form");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [linkedinText, setLinkedinText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [wantsInfo, setWantsInfo] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    jobTitle: "",
    industry: "",
    yearsExperience: "",
    careerGoals: "",
    areasOfInterest: "",
  });

  const handleFormChange = (field: keyof ProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Build request body for backend-proxy → Python backend
      const body: Record<string, string> = {};

      if (activeTab === "cv" && cvFile) {
        setLoadingMessage("Uploading & analyzing your CV...");
        const arrayBuffer = await cvFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        body.file_base64 = btoa(binary);
        body.file_name = cvFile.name;
      } else if (activeTab === "linkedin" && linkedinText) {
        setLoadingMessage("Analyzing your LinkedIn profile...");
        body.linkedin_text = linkedinText;
      } else {
        setLoadingMessage("Analyzing your profile...");
        const parts: string[] = [];
        if (formData.jobTitle) parts.push(`Current role: ${formData.jobTitle}`);
        if (formData.industry) parts.push(`Industry: ${formData.industry}`);
        if (formData.yearsExperience) parts.push(`${formData.yearsExperience} years of experience`);
        if (formData.careerGoals) parts.push(`Goals: ${formData.careerGoals}`);
        if (formData.areasOfInterest) parts.push(`Interests: ${formData.areasOfInterest}`);
        body.career_goals = parts.join(". ");
      }

      setLoadingMessage("Finding your best programme matches...");

      const { data, error } = await supabase.functions.invoke("backend-proxy", {
        body,
      });

      if (error) {
        throw new Error(data?.error || error.message || "Failed to get recommendations");
      }

      if (!data?.recommendations?.length) {
        toast({
          title: "No recommendations returned",
          description: "Please try again in a moment.",
        });
        return;
      }

      // Save submission in background (don't block user)
      supabase.functions.invoke("save-submission", {
        body: {
          name: contactName || null,
          email: contactEmail || null,
          wantsInfo,
          profile: data.profile || body,
          recommendations: data.recommendations,
          outreachEmail: data.outreachEmail,
          inputMethod: activeTab,
        },
      }).catch((e) => console.error("Failed to save submission:", e));

      // Pass recommendations to results page
      navigate("/results", { state: { recommendations: data.recommendations } });
    } catch (e: any) {
      console.error("Submit error:", e);
      toast({
        title: "Something went wrong",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const hasInput =
    (activeTab === "form" && (formData.jobTitle || formData.careerGoals)) ||
    (activeTab === "cv" && cvFile) ||
    (activeTab === "linkedin" && linkedinText);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-sans text-foreground">Vlerick Advisor</h2>
              <p className="text-xs text-muted-foreground">Programme Recommendation Tool</p>
            </div>
          </div>
          <Link to="/programmes">
            <Button variant="outline" size="sm">Browse Programmes</Button>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
            Find Your Perfect <span className="text-primary">Programme</span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
            Tell us about your career and goals — our AI advisor will match you
            with the best Vlerick Business School programmes for your profile.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto max-w-2xl"
        >
          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-sans">Your Professional Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 w-full">
                  <TabsTrigger value="form" className="flex-1 gap-2">
                    <PenLine className="h-4 w-4" /> Manual Form
                  </TabsTrigger>
                  <TabsTrigger value="cv" className="flex-1 gap-2">
                    <Upload className="h-4 w-4" /> Upload CV
                  </TabsTrigger>
                  <TabsTrigger value="linkedin" className="flex-1 gap-2">
                    <FileText className="h-4 w-4" /> LinkedIn
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="form" className="space-y-4 text-left">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Your Name</Label>
                      <Input id="contactName" placeholder="e.g. Jane Doe" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Your Email</Label>
                      <Input id="contactEmail" type="email" placeholder="e.g. jane@company.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Current Job Title</Label>
                      <Input id="jobTitle" placeholder="e.g. Marketing Manager" value={formData.jobTitle} onChange={(e) => handleFormChange("jobTitle", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input id="industry" placeholder="e.g. Technology" value={formData.industry} onChange={(e) => handleFormChange("industry", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearsExperience">Years of Experience</Label>
                    <Input id="yearsExperience" placeholder="e.g. 5" value={formData.yearsExperience} onChange={(e) => handleFormChange("yearsExperience", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="careerGoals">Career Goals</Label>
                    <Textarea id="careerGoals" placeholder="What do you want to achieve in the next 2-3 years?" value={formData.careerGoals} onChange={(e) => handleFormChange("careerGoals", e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="areasOfInterest">Areas of Interest</Label>
                    <Textarea id="areasOfInterest" placeholder="e.g. Leadership, Digital Transformation, Sustainability" value={formData.areasOfInterest} onChange={(e) => handleFormChange("areasOfInterest", e.target.value)} rows={2} />
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="wantsInfo" checked={wantsInfo} onCheckedChange={(checked) => setWantsInfo(checked === true)} />
                    <Label htmlFor="wantsInfo" className="text-sm font-normal cursor-pointer">
                      I'd like to receive more information about recommended programmes
                    </Label>
                  </div>
                </TabsContent>

                <TabsContent value="cv" className="space-y-4 text-left">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cvName">Your Name (optional)</Label>
                      <Input id="cvName" placeholder="We'll try to extract from CV" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvEmail">Your Email (optional)</Label>
                      <Input id="cvEmail" type="email" placeholder="We'll try to extract from CV" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                    </div>
                  </div>
                  <div
                    className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-8 transition-colors hover:border-primary/50 hover:bg-muted"
                    onClick={() => document.getElementById("cv-upload")?.click()}
                  >
                    <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                    {cvFile ? (
                      <div className="text-center">
                        <p className="font-medium text-foreground">{cvFile.name}</p>
                        <p className="text-sm text-muted-foreground">Click to replace</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="font-medium text-foreground">Drop your CV here or click to upload</p>
                        <p className="text-sm text-muted-foreground">PDF or Word documents accepted</p>
                      </div>
                    )}
                    <input id="cv-upload" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="cvWantsInfo" checked={wantsInfo} onCheckedChange={(checked) => setWantsInfo(checked === true)} />
                    <Label htmlFor="cvWantsInfo" className="text-sm font-normal cursor-pointer">
                      I'd like to receive more information about recommended programmes
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Your CV will be parsed by AI to extract your professional profile. No data is stored.</p>
                </TabsContent>

                <TabsContent value="linkedin" className="space-y-4 text-left">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="liName">Your Name</Label>
                      <Input id="liName" placeholder="e.g. Jane Doe" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="liEmail">Your Email</Label>
                      <Input id="liEmail" type="email" placeholder="e.g. jane@company.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn Profile Text</Label>
                    <Textarea id="linkedin" placeholder="Copy and paste your LinkedIn summary, experience section, or About text here..." value={linkedinText} onChange={(e) => setLinkedinText(e.target.value)} rows={8} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="liWantsInfo" checked={wantsInfo} onCheckedChange={(checked) => setWantsInfo(checked === true)} />
                    <Label htmlFor="liWantsInfo" className="text-sm font-normal cursor-pointer">
                      I'd like to receive more information about recommended programmes
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Paste your LinkedIn profile text — we'll extract your experience and skills from it.</p>
                </TabsContent>
              </Tabs>

              <Button className="mt-6 w-full gap-2" size="lg" disabled={!hasInput || loading} onClick={handleSubmit}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {loadingMessage || "Processing..."}
                  </>
                ) : (
                  <>
                    Get Recommendations
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
