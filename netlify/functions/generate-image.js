// This Netlify Function now calls the free-tier-eligible Gemini API endpoint
// for image generation (gemini-2.5-flash-image-preview).

const API_KEY = process.env.SEEDDREAM_API_KEY;

// The new API URL for the free-tier Gemini API endpoint
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${API_KEY}`;

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Prompt is required." }),
      };
    }

    // Construct the payload for the Gemini API
    const payload = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        // We ask for both TEXT and IMAGE modalities in the response
        responseModalities: ["TEXT", "IMAGE"],
      },
    };

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      // Log the error for debugging on Netlify side
      console.error("API Error Response:", result);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `API Request Failed (${response.status}): ${
            result.error?.message || "Unknown API Error"
          }`,
        }),
      };
    }

    // --- Extract Base64 Data from Gemini Response ---
    const imagePart = result?.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData
    );
    const base64Data = imagePart?.inlineData?.data;

    if (!base64Data) {
      // If no image data is found, return an error
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Image data not found in API response.",
        }),
      };
    }

    // Return the Base64 image data to the client
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image: base64Data }),
    };
  } catch (error) {
    console.error("Function execution error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error." }),
    };
  }
};
