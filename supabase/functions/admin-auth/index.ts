/**
 * ADMIN-AUTH Edge Function
 *
 * PURPOSE:
 *   Provides password-protected admin access to view all submission data.
 *   The admin enters a password in the frontend, which is validated against
 *   the ADMIN_PASSWORD environment variable.  On success, all submissions
 *   are returned ordered by newest first.
 *
 * AUTHENTICATION APPROACH:
 *   We use a simple shared-password model (not Supabase Auth) because:
 *     1. Only one admin user needs access (the Vlerick team).
 *     2. It avoids the complexity of setting up full auth for a demo app.
 *     3. The password is stored as a server-side secret (ADMIN_PASSWORD
 *        env var), never exposed to the client.
 *
 * SERVICE ROLE KEY:
 *   We use SUPABASE_SERVICE_ROLE_KEY to query submissions because the table
 *   has RLS policies that would block anonymous reads.  The service role key
 *   bypasses all RLS, giving the admin full read access.
 *
 * DATA FLOW:
 *   Admin page  →  POST /admin-auth { password }
 *               →  Validate password
 *               →  SELECT * FROM submissions ORDER BY created_at DESC
 *               →  { submissions: [...] }
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
    const { password } = await req.json();

    // Retrieve the admin password from the server-side environment
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");

    if (!adminPassword) {
      throw new Error("ADMIN_PASSWORD not configured");
    }

    // Simple string comparison for password validation
    // In a production app you'd use bcrypt or similar hashing
    if (password !== adminPassword) {
      return new Response(JSON.stringify({ error: "Invalid password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticated — now fetch all submissions using the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all submissions, newest first, for the admin dashboard
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ submissions: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-auth error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Admin auth failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
