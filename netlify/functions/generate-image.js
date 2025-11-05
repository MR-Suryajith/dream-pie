const fetch = require("node-fetch");

// This function acts as a secure proxy to the Stability AI API (Stable Diffusion).
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

  // --- Stability AI API Configuration (Switching to the reliable v2beta/core endpoint) ---
  // This is the recommended endpoint for simple, modern image generation requests.
  const STABILITY_API_URL =
    "https://api.stability.ai/v2beta/stable-image/generate/core";
  const STABILITY_MODEL = "ultra-fast"; // Using a fast, modern model

  // 3. Construct the API call payload (Using the v2beta/core JSON structure)
  const payload = {
    prompt: prompt,
    model: STABILITY_MODEL,
    output_format: "png", // Requesting PNG format
    aspect_ratio: "1:1",
    negative_prompt: "low quality, text, artifacts, watermark",
  };

  try {
    const response = await fetch(STABILITY_API_URL, {
      method: "POST",
      headers: {
        // CRITICAL: Must be 'application/json' for this endpoint to work reliably
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json", // We expect the base64 JSON response
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

    // 5. Stability AI v2beta/core returns a 'base64' field within the image object
    const base64Data = result?.image;

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
