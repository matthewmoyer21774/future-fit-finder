import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const profileTool = {
  type: "function" as const,
  function: {
    name: "extract_profile",
    description: "Extract a structured professional profile from a CV",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name" },
        email: { type: "string", description: "Email address if present in the document" },
        jobTitle: { type: "string", description: "Current or most recent job title" },
        industry: { type: "string", description: "Primary industry" },
        yearsExperience: { type: "string", description: "Estimated years of professional experience" },
        skills: { type: "array", items: { type: "string" }, description: "Key skills" },
        education: { type: "string", description: "Highest education level and field" },
        careerGoals: { type: "string", description: "Inferred career goals or aspirations based on trajectory" },
        seniorityLevel: {
          type: "string",
          enum: ["junior", "mid-level", "senior", "executive", "c-suite"],
          description: "Estimated seniority level",
        },
        areasOfInterest: { type: "string", description: "Inferred areas of professional interest" },
      },
      required: ["name", "jobTitle", "industry", "yearsExperience", "careerGoals", "areasOfInterest"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let base64 = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      base64 += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
    }
    base64 = btoa(base64);

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const mimeType = isPdf ? "application/pdf" : "application/octet-stream";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Send the PDF directly to Gemini as multimodal input
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: "You are a CV parser. Extract a structured professional profile from the uploaded document. Use the extract_profile tool to return the result. Be accurate — only report what is actually in the document.",
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64}` },
                },
                {
                  type: "text",
                  text: "Parse this CV/resume and extract the professional profile accurately. Only include information that is actually present in the document.",
                },
              ],
            },
          ],
          tools: [profileTool],
          tool_choice: { type: "function", function: { name: "extract_profile" } },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No structured profile returned from AI");
    }

    const profile = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-cv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Failed to parse CV" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
