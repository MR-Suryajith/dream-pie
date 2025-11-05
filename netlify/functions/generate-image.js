const fetch = require("node-fetch");

// This function acts as a secure proxy to the Imagen API.
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
  // CRITICAL: Netlify MUST have SEEDDREAM_API_KEY set in its environment variables
  const apiKey = process.env.SEEDDREAM_API_KEY;
  if (!apiKey) {
    console.error(
      "FATAL: SEEDDREAM_API_KEY environment variable is NOT set in Netlify settings."
    );
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Configuration Error: API Key is missing in Netlify Environment Variables.",
      }),
    };
  }

  // 3. Construct the API call
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

  const payload = {
    instances: [{ prompt: prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1",
    },
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // 4. ✨ CRITICAL FIX: Propagate external API status code (e.g., 403 or 400)
    if (!response.ok) {
      console.error(
        `External Gemini API failed with status ${response.status}. Full error:`,
        result
      );
      return {
        statusCode: response.status, // <-- Returns the actual error code (e.g., 403)
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result), // Send the full error details back
      };
    }

    // 5. Return successful response
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Function Execution or Network Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error during image generation proxy.",
      }),
    };
  }
};
