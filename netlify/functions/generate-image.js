const fetch = require("node-fetch");

// This function acts as a secure proxy to the Stability AI API (Stable Diffusion 2.1).
exports.handler = async (event, context) => {
  // 1. Input Validation & Setup
  if (event.httpMethod !== "POST" || !event.body) {
    return { statusCode: 405, body: "Method Not Allowed or Missing Body" };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (error) {
    return { statusCode: 400, body: "Invalid JSON format" };
  }

  const prompt = data.prompt;
  if (!prompt) {
    return { statusCode: 400, body: "Missing prompt in request body" };
  }

  // 2. Configuration & API Key Check
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    console.error(
      "FATAL: STABILITY_API_KEY environment variable is NOT set in Netlify settings."
    );
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Configuration Error: Stability AI API Key is missing in Netlify Environment Variables.",
      }),
    };
  }

  // --- Stability AI API Configuration (Using a Stable JSON-Compatible Endpoint) ---
  const STABILITY_API_URL =
    "https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image";
  const STABILITY_MODEL = "stable-diffusion-v1-6"; // A reliable model for JSON requests

  // 3. Construct the API call payload (Simplified and proven JSON structure)
  const payload = {
    // The API key is passed via the header, not here
    text_prompts: [
      {
        text: prompt,
        weight: 1,
      },
    ],
    cfg_scale: 7, // Default configuration scale
    clip_guidance_preset: "FAST_BLUE", // Standard preset
    height: 512, // Standard Stable Diffusion resolution
    width: 512,
    samples: 1, // Number of images to generate
    steps: 30, // Number of steps
  };

  try {
    const response = await fetch(STABILITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // 4. CRITICAL: Check status code and log detailed error
    if (!response.ok) {
      console.error(
        `External Stability AI API failed with status ${response.status}. Full error:`,
        result
      );

      let detailedError = result.message || JSON.stringify(result);

      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `Stability AI Error (${response.status}): ${detailedError}`,
        }),
      };
    }

    // 5. Stability AI v1 endpoint returns a 'artifacts' array
    const base64Data = result?.artifacts?.[0]?.base64;

    if (!base64Data) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Image data not found in Stability AI response structure.",
        }),
      };
    }

    // 6. Return successful response
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image: base64Data }),
    };
  } catch (error) {
    console.error("Function Execution or Network Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error during Stability AI proxy execution.",
      }),
    };
  }
};
