import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Extract text from the uploaded file
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let text = "";

    // For PDF: extract text naively (works for text-based PDFs)
    if (file.name.toLowerCase().endsWith(".pdf")) {
      // Decode as latin1 to preserve byte values, then extract text between stream markers
      const raw = Array.from(uint8)
        .map((b) => String.fromCharCode(b))
        .join("");

      // Extract text objects from PDF streams
      const textParts: string[] = [];
      // Match text between parentheses in PDF text operators
      const matches = raw.matchAll(/\(([^)]*)\)/g);
      for (const m of matches) {
        const t = m[1]
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\");
        if (t.trim().length > 1) {
          textParts.push(t);
        }
      }

      if (textParts.length > 20) {
        text = textParts.join(" ");
      } else {
        // Fallback: decode as UTF-8 and strip non-printable
        text = new TextDecoder("utf-8", { fatal: false }).decode(uint8);
        text = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ");
      }
    } else {
      // For DOCX / plain text
      text = new TextDecoder("utf-8", { fatal: false }).decode(uint8);
      // Strip XML tags if DOCX
      text = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    }

    // Truncate to avoid token limits
    text = text.slice(0, 15000);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
              content: `You are a CV parser. Extract a structured professional profile from the CV text provided. Use the extract_profile tool to return the result.`,
            },
            {
              role: "user",
              content: `Parse this CV and extract the professional profile:\n\n${text}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_profile",
                description:
                  "Extract a structured professional profile from a CV",
                parameters: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Full name" },
                    jobTitle: {
                      type: "string",
                      description: "Current or most recent job title",
                    },
                    industry: {
                      type: "string",
                      description: "Primary industry",
                    },
                    yearsExperience: {
                      type: "string",
                      description:
                        "Estimated years of professional experience",
                    },
                    skills: {
                      type: "array",
                      items: { type: "string" },
                      description: "Key skills",
                    },
                    education: {
                      type: "string",
                      description:
                        "Highest education level and field",
                    },
                    careerGoals: {
                      type: "string",
                      description:
                        "Inferred career goals or aspirations based on trajectory",
                    },
                    seniorityLevel: {
                      type: "string",
                      enum: [
                        "junior",
                        "mid-level",
                        "senior",
                        "executive",
                        "c-suite",
                      ],
                      description: "Estimated seniority level",
                    },
                    areasOfInterest: {
                      type: "string",
                      description:
                        "Inferred areas of professional interest",
                    },
                  },
                  required: [
                    "name",
                    "jobTitle",
                    "industry",
                    "yearsExperience",
                    "careerGoals",
                    "areasOfInterest",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_profile" },
          },
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
      JSON.stringify({
        error: e instanceof Error ? e.message : "Failed to parse CV",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
