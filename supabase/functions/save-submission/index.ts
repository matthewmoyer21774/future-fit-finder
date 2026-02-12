/**
 * SAVE-SUBMISSION Edge Function
 *
 * PURPOSE:
 *   Persists a completed recommendation session to the `submissions` table.
 *   This is called after the user receives their recommendations and optionally
 *   indicates they want more information.
 *
 * WHY A SEPARATE FUNCTION?
 *   The save step is decoupled from the recommendation step so that:
 *     1. Recommendations can be generated without requiring a database write.
 *     2. The user can review recommendations before deciding to save/submit.
 *     3. The save operation uses the SERVICE_ROLE_KEY (bypasses RLS), while
 *        recommendation generation uses the anon key.
 *
 * SERVICE ROLE KEY:
 *   We use SUPABASE_SERVICE_ROLE_KEY instead of the anon key because the
 *   `submissions` table has RLS policies that restrict anonymous inserts.
 *   The service role key bypasses all RLS policies, allowing server-side
 *   inserts without requiring user authentication.
 *
 *   SECURITY NOTE: The service role key is only available server-side in
 *   edge functions — it is never exposed to the browser.
 *
 * DATA FLOW:
 *   Frontend  →  POST /save-submission { name, email, wantsInfo, profile, ... }
 *             →  INSERT into submissions table
 *             →  { success: true }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Destructure the submission data from the request body
    const { name, email, wantsInfo, profile, recommendations, outreachEmail, inputMethod } = await req.json();

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Insert the submission record.
    // Nullable fields (name, email) default to null if not provided.
    // wants_info defaults to false if not specified.
    // input_method tracks how the user provided their information (form, cv, voice).
    const { error } = await supabase.from("submissions").insert({
      name: name || null,
      email: email || null,
      wants_info: wantsInfo ?? false,        // Nullish coalescing — false if undefined
      profile,                                // Full profile JSON object
      recommendations,                        // Array of recommendation objects
      outreach_email: outreachEmail,          // Generated email draft string
      input_method: inputMethod || "form",   // Default to "form" if not specified
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("save-submission error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Failed to save submission" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
