/**
 * RECOMMEND Edge Function
 *
 * PURPOSE:
 *   Given a candidate's professional profile, this function loads the full
 *   Vlerick programme catalogue from the database and uses GPT-5 (via the
 *   Lovable AI Gateway) to select the TOP 3 best-fit programmes with
 *   personalised reasoning and a draft outreach email.
 *
 * WHY GPT-5?
 *   Programme recommendation requires nuanced reasoning: matching a candidate's
 *   career stage, industry, goals, and seniority to the right programme.
 *   GPT-5 provides the strongest reasoning capabilities available, producing
 *   higher-quality, more personalised recommendations than smaller models.
 *
 * FUNCTION CALLING (tool_choice):
 *   We use OpenAI's function calling (tools API) with `tool_choice` set to
 *   force the "provide_recommendations" function.  This guarantees the model
 *   returns structured JSON matching our exact schema — no regex parsing or
 *   markdown stripping needed.
 *
 * DATABASE-FIRST CATALOGUE LOADING:
 *   The function first tries to load programmes from the Supabase `programmes`
 *   table (seeded by the seed-programmes function).  If the database is empty
 *   or unavailable, it falls back to a `catalogue` string sent in the request
 *   body.  This dual approach ensures the function works both with and without
 *   database connectivity.
 *
 * DATA FLOW:
 *   Frontend  →  POST /recommend { profile, catalogue? }
 *             →  Load programmes from DB (or fallback)
 *             →  GPT-5 (function calling)
 *             →  { recommendations: [...], outreachEmail: "..." }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers required for cross-origin requests from the frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept the candidate profile and an optional fallback catalogue string
    const { profile, catalogue: fallbackCatalogue } = await req.json();

    if (!profile) {
      return new Response(JSON.stringify({ error: "No profile provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let catalogue = "";

    // -----------------------------------------------------------------------
    // STEP 1: Load programme catalogue from the database
    // -----------------------------------------------------------------------
    // We use the anon key (read-only) to query the programmes table.
    // The query selects all fields needed to build a rich text catalogue
    // that the LLM can reason over.
    // -----------------------------------------------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: programmes, error: dbError } = await supabase
      .from("programmes")
      .select("title, category, description, url, fee, format, location, start_date, target_audience, why_this_programme, key_topics, full_text");

    if (!dbError && programmes && programmes.length > 0) {
      // Build a structured text catalogue from database rows.
      // Each programme is formatted as a labelled block for the LLM to parse.
      catalogue = programmes.map((p) => {
        const parts = [`PROGRAMME: ${p.title}`];
        if (p.category) parts.push(`Category: ${p.category}`);
        if (p.description) parts.push(`Description: ${p.description}`);
        if (p.fee) parts.push(`Fee: ${p.fee}`);
        if (p.format) parts.push(`Format: ${p.format}`);
        if (p.location) parts.push(`Location: ${p.location}`);
        if (p.start_date) parts.push(`Start date: ${p.start_date}`);
        if (p.target_audience) parts.push(`Target audience: ${p.target_audience}`);
        if (p.why_this_programme) parts.push(`Why this programme: ${p.why_this_programme}`);
        if (p.url) parts.push(`URL: ${p.url}`);
        return parts.join("\n");
      }).join("\n\n---\n\n");
      console.log(`Loaded ${programmes.length} programmes from database`);
    } else if (fallbackCatalogue) {
      // Use the catalogue string provided in the request body as fallback
      catalogue = fallbackCatalogue;
      console.log("Using fallback catalogue from request");
    } else {
      throw new Error("No programme data available. Please seed the database or provide catalogue.");
    }

    // The Lovable AI Gateway key — automatically provisioned for Cloud projects
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // -----------------------------------------------------------------------
    // STEP 2: Build the profile summary for the LLM
    // -----------------------------------------------------------------------
    // Convert the profile object to a human-readable key: value format,
    // filtering out null/empty values for a cleaner prompt.
    // -----------------------------------------------------------------------
    const profileSummary = Object.entries(profile)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    // -----------------------------------------------------------------------
    // SYSTEM PROMPT DESIGN
    // -----------------------------------------------------------------------
    // The system prompt:
    //   1. Sets the role (Vlerick admissions consultant)
    //   2. Injects the FULL programme catalogue directly into the prompt
    //   3. Instructs the model to select TOP 3 programmes with reasoning
    //   4. Requests a draft outreach email (150–200 words)
    //
    // Injecting the full catalogue into the system prompt ensures the model
    // only recommends actual programmes (no hallucination).
    // -----------------------------------------------------------------------
    const systemPrompt = `You are an expert Vlerick Business School admissions consultant. Your job is to recommend the best executive education programmes for professionals based on their profile.

You have access to the complete Vlerick programme catalogue below. Analyze the candidate's profile carefully and select the TOP 3 programmes that best match their career stage, goals, industry, and interests.

For each recommendation, provide a personalized 2-3 sentence explanation of WHY this programme is a great fit for this specific person.

Also generate a warm, professional outreach email draft (150-200 words) that a Vlerick advisor could send to this person, mentioning the top recommendations.

PROGRAMME CATALOGUE:
${catalogue}`;

    // -----------------------------------------------------------------------
    // STEP 3: Call GPT-5 via the Lovable AI Gateway with function calling
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
          model: "openai/gpt-5",  // GPT-5 for highest reasoning quality
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Here is the candidate's professional profile:\n\n${profileSummary}\n\nPlease recommend the top 3 Vlerick programmes and draft an outreach email.`,
            },
          ],
          // Define the structured output schema via function calling
          tools: [
            {
              type: "function",
              function: {
                name: "provide_recommendations",
                description:
                  "Return the top 3 programme recommendations with reasoning and an outreach email",
                parameters: {
                  type: "object",
                  properties: {
                    recommendations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          programmeTitle: { type: "string", description: "Exact programme title" },
                          category: { type: "string" },
                          fee: { type: "string" },
                          duration: { type: "string" },
                          location: { type: "string" },
                          startDate: { type: "string" },
                          url: { type: "string", description: "Full URL to the programme page" },
                          reasoning: { type: "string", description: "2-3 sentence personalized explanation of why this programme fits the candidate" },
                        },
                        required: ["programmeTitle", "category", "url", "reasoning"],
                        additionalProperties: false,
                      },
                    },
                    outreachEmail: {
                      type: "string",
                      description: "A warm, professional outreach email draft (150-200 words)",
                    },
                  },
                  required: ["recommendations", "outreachEmail"],
                  additionalProperties: false,
                },
              },
            },
          ],
          // Force the model to use our function — guarantees structured output
          tool_choice: {
            type: "function",
            function: { name: "provide_recommendations" },
          },
        }),
      }
    );

    // -----------------------------------------------------------------------
    // Handle error responses from the AI gateway
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // STEP 4: Parse the AI response
    // -----------------------------------------------------------------------
    const data = await response.json();
    console.log("AI response structure:", JSON.stringify(data.choices?.[0]?.message, null, 2));

    const message = data.choices?.[0]?.message;
    let result;

    // Primary path: function call response (structured JSON)
    const toolCall = message?.tool_calls?.[0];
    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    } else if (message?.content) {
      // Fallback: some models may return JSON in content instead of tool_calls.
      // We attempt to parse it, stripping markdown code fences if present.
      let content = message.content.trim();
      if (content.startsWith("```")) {
        content = content.split("```")[1];
        if (content.startsWith("json")) content = content.slice(4);
      }
      try {
        result = JSON.parse(content);
      } catch {
        console.error("Failed to parse content as JSON:", content.substring(0, 500));
        throw new Error("No recommendations returned from AI");
      }
    } else {
      throw new Error("No recommendations returned from AI");
    }

    // Validate the response structure
    if (!result.recommendations || !Array.isArray(result.recommendations)) {
      console.error("Invalid result structure:", JSON.stringify(result).substring(0, 500));
      throw new Error("No recommendations returned from AI");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Failed to generate recommendations",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
