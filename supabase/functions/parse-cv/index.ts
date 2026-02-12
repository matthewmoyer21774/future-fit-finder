/**
 * PARSE-CV Edge Function
 *
 * PURPOSE:
 *   Accepts a base64-encoded CV/resume file (PDF or other format) and uses
 *   Google Gemini 3 Flash (via the Lovable AI Gateway) to extract a structured
 *   professional profile using multimodal input + function calling.
 *
 * WHY GEMINI 3 FLASH?
 *   Gemini 3 Flash is a multimodal model that can directly process PDFs as
 *   base64-encoded images.  This avoids the need for server-side PDF text
 *   extraction (pypdf, pdfplumber, etc.) — the model "reads" the PDF visually.
 *   Flash is chosen over Pro for its lower latency (~2s vs ~5s) and cost,
 *   while still providing excellent structured extraction quality.
 *
 * FUNCTION CALLING (tool_choice):
 *   We define a `profileTool` with a strict JSON schema for the profile fields.
 *   By setting tool_choice to force the "extract_profile" function, we guarantee
 *   the model returns structured JSON matching our schema — no free-text parsing
 *   needed.  This is more reliable than asking the model to "return JSON".
 *
 *   See: https://ai.google.dev/gemini-api/docs/function-calling
 *
 * DATA FLOW:
 *   Frontend (React)  →  POST /parse-cv { file_base64, file_name }
 *                     →  Gemini 3 Flash (multimodal)
 *                     →  { profile: { name, jobTitle, industry, ... } }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ---------------------------------------------------------------------------
// CORS HEADERS
// ---------------------------------------------------------------------------
// Required for browser-based requests from the Lovable frontend.
// The Access-Control-Allow-Headers list includes Supabase-specific headers
// that the JS client sends automatically.
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------------------------------------------------------------------------
// PROFILE EXTRACTION TOOL SCHEMA
// ---------------------------------------------------------------------------
// This defines the structured output schema for the Gemini function call.
// Each field maps to a specific piece of professional information we want
// to extract from the CV.  The "required" array ensures the model always
// provides at least the core fields (name, jobTitle, industry, etc.).
// ---------------------------------------------------------------------------
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
  // Handle CORS preflight (OPTIONS) requests from the browser
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { file_base64, file_name } = body;

    // Validate that a file was provided
    if (!file_base64) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base64 = file_base64;
    // Determine MIME type — Gemini needs this to correctly interpret the file
    const isPdf = (file_name || "").toLowerCase().endsWith(".pdf");
    const mimeType = isPdf ? "application/pdf" : "application/octet-stream";

    // The Lovable AI Gateway key is automatically provisioned for Cloud projects
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // -----------------------------------------------------------------------
    // Send the PDF to Gemini 3 Flash as a multimodal input
    // -----------------------------------------------------------------------
    // The file is sent as a base64 data URL in the "image_url" content part.
    // Gemini treats PDFs as visual documents, extracting text and layout
    // information directly from the rendered pages.
    // -----------------------------------------------------------------------
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
                  // The PDF is passed as a base64 data URL — Gemini reads it visually
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
          // Force the model to call our extract_profile function — guarantees
          // structured JSON output matching our schema
          tool_choice: { type: "function", function: { name: "extract_profile" } },
        }),
      }
    );

    // -----------------------------------------------------------------------
    // Handle rate limit and credit limit errors from the AI gateway
    // -----------------------------------------------------------------------
    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        // 429 = Too Many Requests — the user is sending requests too quickly
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        // 402 = Payment Required — AI usage credits exhausted
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    // -----------------------------------------------------------------------
    // Extract the structured profile from the function call response
    // -----------------------------------------------------------------------
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No structured profile returned from AI");
    }

    // The function arguments contain the extracted profile as a JSON string
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
