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
    const RAILWAY_BACKEND_URL = Deno.env.get("RAILWAY_BACKEND_URL");
    if (!RAILWAY_BACKEND_URL) throw new Error("RAILWAY_BACKEND_URL not configured");

    const { file_base64, file_name, career_goals, linkedin_text } = await req.json();

    // Build multipart form data for the Python backend
    const formData = new FormData();

    if (file_base64 && file_name) {
      // Convert base64 back to binary
      const binaryString = atob(file_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes]);
      formData.append("file", blob, file_name);
    }

    if (career_goals) {
      formData.append("career_goals", career_goals);
    }

    if (linkedin_text) {
      formData.append("linkedin_url", linkedin_text);
    }

    // Ensure protocol is present
    let baseUrl = RAILWAY_BACKEND_URL.replace(/\/$/, "");
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }
    const backendUrl = `${baseUrl}/recommend`;
    console.log("Proxying to:", backendUrl);

    const response = await fetch(backendUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Backend error:", response.status, errText);
      // Try to parse JSON error from backend
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error) {
          return new Response(
            JSON.stringify({ error: errJson.error }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (_) { /* not JSON */ }
      return new Response(
        JSON.stringify({ error: `Backend returned status ${response.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // If the backend says it's still starting up, return error in 200 response
    if (data.error) {
      return new Response(
        JSON.stringify({ error: data.error }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map Python backend response to frontend format
    const recommendations = (data.recommendations || []).map((rec: Record<string, string>) => ({
      programmeTitle: rec.title || rec.programmeTitle || "",
      category: rec.category || "",
      fee: rec.fee || "",
      duration: rec.format || rec.duration || "",
      location: rec.location || "",
      startDate: rec.start_date || rec.startDate || "",
      url: rec.url || "",
      reasoning: rec.reason || rec.reasoning || "",
    }));

    return new Response(
      JSON.stringify({
        recommendations,
        outreachEmail: data.email_draft || "",
        profile: data.profile || {},
        topCategories: data.top_categories || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("backend-proxy error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Failed to proxy request",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
