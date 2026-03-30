import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapping from external BU slugs to local BU keys
const buSlugToLocalKey: Record<string, string> = {
  "principal": "modelo_atual",
  "o2-tax": "o2_tax",
  "franquias": "franquia",
  "oxy-hacker": "oxy_hacker",
};

// Mapping from numeric month to text format
const monthNumberToText: Record<number, string> = {
  1: "Jan",
  2: "Fev",
  3: "Mar",
  4: "Abr",
  5: "Mai",
  6: "Jun",
  7: "Jul",
  8: "Ago",
  9: "Set",
  10: "Out",
  11: "Nov",
  12: "Dez",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting sales data sync...");

    // Local Supabase credentials
    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const localServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create local Supabase client for auth verification
    const localSupabase = createClient(localUrl, localServiceKey);

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await localSupabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication failed:", authError?.message || "Invalid token");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User authenticated: ${user.id}`);

    // Check if user has admin role
    const { data: roleData, error: roleError } = await localSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("Admin role check failed:", roleError?.message || "User is not an admin");
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin role verified, proceeding with sync...");
    // ========== END AUTHENTICATION CHECK ==========

    // External Supabase credentials
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_KEY");

    if (!externalUrl || !externalKey) {
      console.error("Missing external Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Missing external Supabase credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create external client
    const externalSupabase = createClient(externalUrl, externalKey);

    // Fetch aggregated data from external project with JOINs
    console.log("Fetching aggregated sales data from external project...");
    
    // First, get seller_monthly_achievements with seller info
    const { data: achievementsData, error: achievementsError } = await externalSupabase
      .from("seller_monthly_achievements")
      .select(`
        month,
        year,
        achievement_value,
        seller_id,
        sellers!inner(
          business_unit_id,
          business_units!inner(
            slug
          )
        )
      `)
      .eq("year", 2026);

    if (achievementsError) {
      console.error("Error fetching achievements data:", achievementsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch achievements data", details: achievementsError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetched ${achievementsData?.length || 0} achievement records from external project`);

    if (!achievementsData || achievementsData.length === 0) {
      console.log("No achievement data to sync");
      return new Response(
        JSON.stringify({ success: true, message: "No data to sync", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate data by BU slug and month
    const aggregatedData: Record<string, Record<string, number>> = {};

    for (const record of achievementsData) {
      // Navigate the nested structure to get the BU slug
      const sellers = record.sellers as any;
      const buSlug = sellers?.business_units?.slug;
      
      if (!buSlug) {
        console.warn("Skipping record without BU slug:", record);
        continue;
      }

      // Convert month to text format if it's a number
      let monthText: string;
      if (typeof record.month === "number") {
        monthText = monthNumberToText[record.month] || `Month${record.month}`;
      } else {
        monthText = record.month;
      }

      // Initialize nested objects if needed
      if (!aggregatedData[buSlug]) {
        aggregatedData[buSlug] = {};
      }
      if (!aggregatedData[buSlug][monthText]) {
        aggregatedData[buSlug][monthText] = 0;
      }

      // Sum the achievement values
      aggregatedData[buSlug][monthText] += Number(record.achievement_value) || 0;
    }

    console.log("Aggregated data by BU:", JSON.stringify(aggregatedData, null, 2));

    // Upsert aggregated data into local database
    let syncedCount = 0;
    const errors: any[] = [];
    const skippedBUs: string[] = [];

    for (const [buSlug, months] of Object.entries(aggregatedData)) {
      const localBuKey = buSlugToLocalKey[buSlug];
      
      if (!localBuKey) {
        console.warn(`Unknown BU slug: ${buSlug}, skipping...`);
        if (!skippedBUs.includes(buSlug)) {
          skippedBUs.push(buSlug);
        }
        continue;
      }

      for (const [month, value] of Object.entries(months)) {
        const { error: upsertError } = await localSupabase
          .from("sales_realized")
          .upsert(
            {
              bu: localBuKey,
              month: month,
              year: 2026,
              value: value,
            },
            { onConflict: "bu,month,year" }
          );

        if (upsertError) {
          console.error(`Error upserting record for ${localBuKey}/${month}:`, upsertError);
          errors.push({ bu: localBuKey, month, error: upsertError });
        } else {
          console.log(`Synced: ${localBuKey}/${month} = ${value}`);
          syncedCount++;
        }
      }
    }

    console.log(`Sync completed. Synced: ${syncedCount}, Errors: ${errors.length}, Skipped BUs: ${skippedBUs.join(", ") || "none"}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${syncedCount} records`,
        synced: syncedCount,
        skippedBUs: skippedBUs.length > 0 ? skippedBUs : undefined,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error during sync:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
