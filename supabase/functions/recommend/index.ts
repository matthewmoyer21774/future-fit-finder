import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { profile } = await req.json();

    if (!profile) {
      return new Response(JSON.stringify({ error: "No profile provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load catalogue from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: programmes, error: dbError } = await supabase
      .from("programmes")
      .select("title, category, description, url, fee, format, location, start_date, target_audience, why_this_programme, key_topics, full_text");

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Failed to load programme catalogue");
    }

    if (!programmes || programmes.length === 0) {
      throw new Error("Programme catalogue is empty. Please seed the database first.");
    }

    // Build catalogue string for the AI
    const catalogue = programmes.map((p) => {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const profileSummary = Object.entries(profile)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const systemPrompt = `You are an expert Vlerick Business School admissions consultant. Your job is to recommend the best executive education programmes for professionals based on their profile.

You have access to the complete Vlerick programme catalogue below. Analyze the candidate's profile carefully and select the TOP 3 programmes that best match their career stage, goals, industry, and interests.

For each recommendation, provide a personalized 2-3 sentence explanation of WHY this programme is a great fit for this specific person.

Also generate a warm, professional outreach email draft (150-200 words) that a Vlerick advisor could send to this person, mentioning the top recommendations.

PROGRAMME CATALOGUE:
${catalogue}`;

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
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Here is the candidate's professional profile:\n\n${profileSummary}\n\nPlease recommend the top 3 Vlerick programmes and draft an outreach email.`,
            },
          ],
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
          tool_choice: {
            type: "function",
            function: { name: "provide_recommendations" },
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
    console.log("AI response structure:", JSON.stringify(data.choices?.[0]?.message, null, 2));

    const message = data.choices?.[0]?.message;
    let result;

    const toolCall = message?.tool_calls?.[0];
    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    } else if (message?.content) {
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
