// This code runs securely on the server (Netlify's backend)
const fetch = require("node-fetch"); // You might need to install 'node-fetch' locally

exports.handler = async (event, context) => {
  // 1. Securely access the environment variable set in Netlify dashboard
  const API_KEY = process.env.SEEDDREAM_API_KEY;

  // Check if key is available
  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API Key is missing." }),
    };
  }

  // 2. Parse the prompt sent from the client-side
  const { prompt } = JSON.parse(event.body);

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${API_KEY}`;

  try {
    const payload = {
      instances: [{ prompt: prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1",
      },
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // 3. Return the API response directly to the client
    const data = await response.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate image." }),
    };
  }
};
