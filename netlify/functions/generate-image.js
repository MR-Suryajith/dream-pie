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
  // CRITICAL: Netlify MUST have STABILITY_API_KEY set in its environment variables
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

  // Stability AI API Configuration
  // We will use the Stable Diffusion 3 Medium model for high quality.
  const STABILITY_API_URL =
    "https://api.stability.ai/v2beta/stable-image/generate/sd3";
  const STABILITY_MODEL = "sd3-medium";

  // 3. Construct the API call payload
  const payload = {
    prompt: prompt,
    model: STABILITY_MODEL,
    aspect_ratio: "1:1",
    output_format: "png",
  };

  try {
    const response = await fetch(STABILITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Authorization is done via a dedicated header
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // 4. CRITICAL FIX: Propagate external API status code (e.g., 403 or 400)
    if (!response.ok) {
      console.error(
        `External Stability AI API failed with status ${response.status}. Full error:`,
        result
      );
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result), // Send the full error details back
      };
    }

    // 5. Stability AI returns a JSON object with an 'image' field containing the base64 string
    const base64Data = result?.image;

    if (!base64Data) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Image data not found in Stability AI response structure.",
        }),
      };
    }

    // 6. Return successful response (wrapping the base64 data for the client)
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
