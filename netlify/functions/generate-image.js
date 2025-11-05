const fetch = require("node-fetch");

// This function uses the stable v2beta/stable-image/generate/core endpoint.
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

  // --- Stability AI API Configuration ---
  const STABILITY_API_URL =
    "https://api.stability.ai/v2beta/stable-image/generate/core";
  const STABILITY_MODEL = "ultra-fast";

  // 3. Construct the API call payload
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
        // CRITICAL: Ensure Content-Type is correct
        "Content-Type": "application/json",
        // CRITICAL: Authorization header must be a Bearer token
        Authorization: `Bearer ${apiKey}`,
        // CRITICAL: Accept must be set to application/json to get the base64 string back
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

      let detailedError = result.message || JSON.stringify(result);

      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `Stability AI Error (${response.status}): ${detailedError}`,
        }),
      };
    }

    // 5. Stability AI v2beta/core returns 'image' containing the base64 string
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
