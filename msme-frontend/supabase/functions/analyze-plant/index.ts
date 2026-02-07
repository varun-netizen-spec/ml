// analyze-plant.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Allow requests from your frontend
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Main function entry
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse incoming JSON body
    const { image, plantType } = await req.json();

    if (!image || !plantType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: image and plantType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔍 Sending ${plantType} image to Flask backend...`);

    // Decode base64 string → binary data
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Prepare form-data to send to Flask
    const formData = new FormData();
    formData.append("image", new Blob([imageBuffer], { type: "image/jpeg" }), "plant.jpg");
    formData.append("plant_type", plantType);

    // 🔗 Your Flask backend URL
    // If you’re testing locally: use your LAN IP (not localhost)
    const FLASK_URL = "http://192.168.29.208:5000/api/predict";

    // Send request to Flask backend
    const flaskResponse = await fetch(FLASK_URL, {
      method: "POST",
      body: formData,
    });

    if (!flaskResponse.ok) {
      const text = await flaskResponse.text();
      console.error("❌ Flask model error:", flaskResponse.status, text);
      return new Response(
        JSON.stringify({ error: "Failed to connect to Flask backend", details: text }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Flask JSON result
    const result = await flaskResponse.json();
    console.log("✅ Prediction received from Flask:", result);

    // Return final response to frontend
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("⚠️ Error in analyze-plant function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
