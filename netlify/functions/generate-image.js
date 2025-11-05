const fetch = require("node-fetch");

// This function acts as a secure proxy to the Stability AI API (Stable Diffusion XL).
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

  // --- Stability AI API Configuration (Using the stable SDXL 1.0 endpoint) ---
  // This is the V1 endpoint which is highly compatible with JSON payloads.
  const STABILITY_API_URL =
    "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image";

  // 3. Construct the API call payload (Using the simple SDXL v1 JSON structure)
  const payload = {
    // Text prompts must be wrapped in an array of objects for this endpoint
    text_prompts: [
      { text: prompt, weight: 1.0 },
      {
        text: "low quality, bad anatomy, text, watermark, blurry",
        weight: -1.0,
      },
    ],
    // Standard SDXL resolution (1024x1024)
    height: 1024,
    width: 1024,
    samples: 1, // Number of images to generate (keep at 1 for speed/cost)
    steps: 30, // Lower steps for fast generation
    cfg_scale: 7,
  };

  try {
    const response = await fetch(STABILITY_API_URL, {
      method: "POST",
      headers: {
        // CRITICAL: Content-Type must be 'application/json'
        "Content-Type": "application/json",
        // CRITICAL: Authorization header must be a Bearer token
        Authorization: `Bearer ${apiKey}`,
        // We expect the JSON response containing the base64 image data
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // 4. Check status code and log detailed error
    if (!response.ok) {
      console.error(
        `External Stability AI API failed with status ${response.status}. Full error:`,
        result
      );

      // This endpoint puts the error message in result.message
      let detailedError = result.message || JSON.stringify(result);

      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `Stability AI Error (${response.status}): ${detailedError}`,
        }),
      };
    }

    // 5. SDXL v1 returns an 'artifacts' array, containing the base64 string in 'base64'
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
