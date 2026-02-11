import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, PenLine, ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

interface ProfileData {
  jobTitle: string;
  industry: string;
  yearsExperience: string;
  careerGoals: string;
  areasOfInterest: string;
  cvText?: string;
  linkedinText?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("form");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [linkedinText, setLinkedinText] = useState("");
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

  const handleSubmit = () => {
    // TODO: Send to AI recommendation engine
    const profilePayload = {
      ...formData,
      linkedinText: linkedinText || undefined,
      cvFileName: cvFile?.name || undefined,
    };
    console.log("Profile submitted:", profilePayload);
    // navigate("/results", { state: { profile: profilePayload } });
  };

  const hasInput =
    formData.jobTitle ||
    formData.careerGoals ||
    linkedinText ||
    cvFile;

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
              <h2 className="text-lg font-bold font-sans text-foreground">Vlerick Advisor</h2>
              <p className="text-xs text-muted-foreground">Programme Recommendation Tool</p>
            </div>
          </div>
          <Link to="/programmes">
            <Button variant="outline" size="sm">
              Browse Programmes
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
            Find Your Perfect{" "}
            <span className="text-primary">Programme</span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
            Tell us about your career and goals — our AI advisor will match you
            with the best Vlerick Business School programmes for your profile.
          </p>
        </motion.div>

        {/* Input Section */}
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
                    <PenLine className="h-4 w-4" />
                    Manual Form
                  </TabsTrigger>
                  <TabsTrigger value="cv" className="flex-1 gap-2">
                    <Upload className="h-4 w-4" />
                    Upload CV
                  </TabsTrigger>
                  <TabsTrigger value="linkedin" className="flex-1 gap-2">
                    <FileText className="h-4 w-4" />
                    LinkedIn
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="form" className="space-y-4 text-left">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Current Job Title</Label>
                      <Input
                        id="jobTitle"
                        placeholder="e.g. Marketing Manager"
                        value={formData.jobTitle}
                        onChange={(e) => handleFormChange("jobTitle", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        placeholder="e.g. Technology"
                        value={formData.industry}
                        onChange={(e) => handleFormChange("industry", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearsExperience">Years of Experience</Label>
                    <Input
                      id="yearsExperience"
                      placeholder="e.g. 5"
                      value={formData.yearsExperience}
                      onChange={(e) => handleFormChange("yearsExperience", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="careerGoals">Career Goals</Label>
                    <Textarea
                      id="careerGoals"
                      placeholder="What do you want to achieve in the next 2-3 years?"
                      value={formData.careerGoals}
                      onChange={(e) => handleFormChange("careerGoals", e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="areasOfInterest">Areas of Interest</Label>
                    <Textarea
                      id="areasOfInterest"
                      placeholder="e.g. Leadership, Digital Transformation, Sustainability"
                      value={formData.areasOfInterest}
                      onChange={(e) => handleFormChange("areasOfInterest", e.target.value)}
                      rows={2}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="cv" className="space-y-4 text-left">
                  <div
                    className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-8 transition-colors hover:border-primary/50 hover:bg-muted"
                    onClick={() => document.getElementById("cv-upload")?.click()}
                  >
                    <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                    {cvFile ? (
                      <div className="text-center">
                        <p className="font-medium text-foreground">{cvFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Click to replace
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="font-medium text-foreground">
                          Drop your CV here or click to upload
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PDF or Word documents accepted
                        </p>
                      </div>
                    )}
                    <input
                      id="cv-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your CV will be parsed by AI to extract your professional profile. No data is stored.
                  </p>
                </TabsContent>

                <TabsContent value="linkedin" className="space-y-4 text-left">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn Profile Text</Label>
                    <Textarea
                      id="linkedin"
                      placeholder="Copy and paste your LinkedIn summary, experience section, or About text here..."
                      value={linkedinText}
                      onChange={(e) => setLinkedinText(e.target.value)}
                      rows={8}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Paste your LinkedIn profile text — we'll extract your experience and skills from it.
                  </p>
                </TabsContent>
              </Tabs>

              <Button
                className="mt-6 w-full gap-2"
                size="lg"
                disabled={!hasInput}
                onClick={handleSubmit}
              >
                Get Recommendations
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
