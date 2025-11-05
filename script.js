document.addEventListener("DOMContentLoaded", () => {
  // --- Global Variables and Constants ---
  const promptInput = document.getElementById("prompt-input");
  const imageResultBox = document.getElementById("image-result");
  const downloadButton = document.getElementById("download-button");
  const generateButton = document.querySelector(".generate-button");
  const randomPromptButton = document.getElementById("random-prompt-button");
  const messageBox = document.getElementById("message-box");

  // View switching elements
  const views = document.querySelectorAll(".view");
  const galleryGrid = document.getElementById("gallery-grid");
  const backToHomeButton = document.getElementById("back-to-home");
  const navLinks = document.querySelectorAll(".nav-link[data-view]");
  const exploreGalleryButton = document.getElementById(
    "explore-gallery-button"
  );

  // 🔑 API Configuration - Call the secure Netlify Function proxy
  const API_ENDPOINT = "/.netlify/functions/generate-image";
  const MAX_RETRIES = 3;

  // --- Poco Pie's Random Inspirations ---
  const randomPrompts = [
    "A hyper-realistic fox wearing a crown, lit by neon streetlights, cinematic",
    "A 1950s retro-futuristic robot bartender serving a martini, digital art",
    "A floating bonsai tree enclosed in a glass bubble, detailed photorealistic render",
    "An ancient library built inside a massive hollowed-out tree trunk, fantasy art",
    "A synthwave-style landscape with pink and blue gradients, a lone surfer on a neon wave",
    "A detailed oil painting of a cup of coffee that looks like a galaxy",
    "A minimalist, black and white sketch of a majestic lion wearing reading glasses",
  ];

  // --- Simulated Gallery Data (For the Gallery tab) ---
  const simulatedGalleryData = [
    {
      id: 1,
      prompt:
        "Giant iridescent beetle sitting on a melting ice cream cone, hyper-detail.",
      user: "PocoPie",
      imgUrl: `https://placehold.co/250x250/0000FF/FFFFFF?text=Dream+1`,
    },
    {
      id: 2,
      prompt:
        "A cityscape made of candy canes and gingerbread, volumetric lighting.",
      user: "User123",
      imgUrl: `https://placehold.co/250x250/FF00FF/000000?text=Dream+2`,
    },
    {
      id: 3,
      prompt:
        "A grumpy space pirate feeding a tiny alien cat, digital painting.",
      user: "ChaosSpark",
      imgUrl: `https://placehold.co/250x250/FFFF00/000000?text=Dream+3`,
    },
    {
      id: 4,
      prompt:
        "A deep sea diver discovering an ancient, glowing mushroom forest.",
      user: "OceanDreamer",
      imgUrl: `https://placehold.co/250x250/00FFFF/000000?text=Dream+4`,
    },
    {
      id: 5,
      prompt:
        "Minimalist geometric abstraction of a sunset over Mars, vibrant colors.",
      user: "ShapeShifter",
      imgUrl: `https://placehold.co/250x250/FF0000/FFFFFF?text=Dream+5`,
    },
    {
      id: 6,
      prompt:
        "Steampunk owl operating a complex analog machine, cinematic focus.",
      user: "ClockworkFan",
      imgUrl: `https://placehold.co/250x250/00FF00/000000?text=Dream+6`,
    },
  ];

  /**
   * Displays a temporary, themed message box.
   * @param {string} message The message to display.
   */
  function showMessage(message) {
    messageBox.textContent = message;
    messageBox.classList.add("show");

    setTimeout(() => {
      messageBox.classList.remove("show");
    }, 3000);
  }

  /**
   * Switches the active view based on the navigation click.
   * @param {string} targetViewId The ID of the view element to show.
   */
  function navigateTo(targetViewId) {
    views.forEach((view) => {
      view.classList.remove("active");
    });

    const targetView = document.getElementById(targetViewId);
    if (targetView) {
      targetView.classList.add("active");
    }

    if (targetViewId === "gallery-section") {
      populateGallery();
    }
  }

  /**
   * Dynamically populates the gallery grid with simulated content.
   */
  function populateGallery() {
    galleryGrid.innerHTML = "";
    const galleryLoading = document.getElementById("gallery-loading");
    if (galleryLoading) galleryLoading.style.display = "none";

    simulatedGalleryData.forEach((item) => {
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("gallery-item");
      itemDiv.setAttribute("data-prompt", item.prompt);

      itemDiv.innerHTML = `
                <img src="${item.imgUrl}" alt="${item.prompt}">
                <div class="gallery-caption">
                    <span title="${item.prompt}">${item.prompt}</span>
                </div>
            `;

      itemDiv.addEventListener("click", () => {
        showMessage(`Prompt: "${item.prompt}"`);
      });

      galleryGrid.appendChild(itemDiv);
    });
  }

  /**
   * Handles the Imagen API call using the Netlify Function proxy with retry logic.
   * @param {string} prompt The text prompt for the image.
   */
  async function generateImage(prompt) {
    // Use a loop for exponential backoff retries
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Call the Netlify function endpoint
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt }),
        });

        const result = await response.json();

        if (!response.ok) {
          // Check if the proxy returned a 4xx or 5xx error
          let errorMessage = "Unknown generation error.";

          if (response.status === 403) {
            errorMessage = `❌ **Authentication Failed (403):** Your **SEEDDREAM_API_KEY** is invalid or missing in Netlify settings.`;
          } else if (result.error && result.error.message) {
            // Extract specific error message from the nested JSON response
            errorMessage = `Generation Error (${response.status}): ${result.error.message}`;
          } else if (result.error) {
            errorMessage = `Generation Error (${
              response.status
            }): ${JSON.stringify(result.error)}`;
          } else {
            errorMessage = `Generation Error: Proxy failed with status ${response.status}. Check Netlify logs.`;
          }

          throw new Error(errorMessage);
        }

        // Process successful image data from the proxy response
        if (
          result.predictions &&
          result.predictions.length > 0 &&
          result.predictions[0].bytesBase64Encoded
        ) {
          const base64Data = result.predictions[0].bytesBase64Encoded;
          const imageUrl = `data:image/png;base64,${base64Data}`;

          const imageElement = document.createElement("img");
          imageElement.src = imageUrl;
          imageElement.alt = prompt;

          imageResultBox.innerHTML = "";
          imageResultBox.appendChild(imageElement);
          imageResultBox.classList.remove("loading-state");

          showMessage("Dream baked! Image generated successfully!");
          downloadButton.disabled = false;
          return; // Success, exit the retry loop
        } else {
          throw new Error(
            "Invalid response structure or missing image data. Check Netlify function logs."
          );
        }
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error.message);

        const isFinalAttempt = attempt === MAX_RETRIES - 1;

        if (isFinalAttempt) {
          // Display final error message to the user
          showMessage(error.message, true);
          imageResultBox.innerHTML = `<p id="placeholder-text">${error.message}</p>`;
        } else {
          // Exponential backoff wait
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.log(`Retrying in ${delay.toFixed(0)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } finally {
        // Restore button state
        generateButton.disabled = false;
        generateButton.innerHTML = 'Generate Image<span class="glow"></span>';
      }
    }
  }

  // --- Dynamic CSS for Loading Spinners ---
  // This dynamically adds the necessary spinner styles to the document head
  const style = document.createElement("style");
  style.innerHTML = `
         /* Spinner for the image result box */
         .spinner { 
             border: 4px solid rgba(245, 245, 245, 0.2); 
             border-top: 4px solid var(--neon-glow); 
             border-radius: 50%; 
             width: 40px; 
             height: 40px; 
             animation: spin 1s linear infinite; 
         }
         /* Spinner for the button */
         .loading-spinner { 
             display: inline-block; 
             width: 15px; 
             height: 15px; 
             border: 2px solid rgba(255, 255, 255, 0.4); 
             border-top-color: var(--neon-glow); 
             border-radius: 50%; 
             animation: spin 0.8s linear infinite; 
             margin-right: 8px; 
         }
     `;
  document.head.appendChild(style);

  // --- Event Listeners ---

  // 1. Random Prompt Button
  if (randomPromptButton) {
    randomPromptButton.addEventListener("click", () => {
      const randomIndex = Math.floor(Math.random() * randomPrompts.length);
      promptInput.value = randomPrompts[randomIndex];
      showMessage("A little spark of inspiration from Poco Pie!");
    });
  }

  // 2. Generator Form Submission
  document
    .getElementById("generation-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const prompt = promptInput.value.trim();

      if (prompt === "") {
        showMessage("Poco Pie says: You gotta give me something to work with!");
        return;
      }

      // UI update for loading state
      generateButton.disabled = true;
      generateButton.innerHTML =
        '<span class="loading-spinner"></span> Baking Dream...';
      imageResultBox.innerHTML = '<div class="spinner"></div>';
      imageResultBox.classList.remove("loading-state");
      downloadButton.disabled = true;

      await generateImage(prompt);
    });

  // 3. Download functionality
  downloadButton.addEventListener("click", () => {
    const imageElement = imageResultBox.querySelector("img");
    if (imageElement) {
      showMessage(`Poco Pie's preparing your download...`);
      const a = document.createElement("a");
      a.href = imageElement.src;
      a.download = `dream_pie_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  });

  // 4. Navigation Links (Handles clicking Generator/Gallery links)
  navLinks.forEach((link) => {
    if (link.dataset.view) {
      link.addEventListener("click", (e) => {
        // Handle "about" link which should use default anchor behavior
        if (link.getAttribute("href") !== "#about") {
          e.preventDefault();
          navigateTo(link.dataset.view);
        }
      });
    }
  });

  // 5. Explore Gallery Button & Back to Home Button
  exploreGalleryButton.addEventListener("click", () =>
    navigateTo("gallery-section")
  );
  backToHomeButton.addEventListener("click", () => navigateTo("home-view"));

  // Initial navigation to ensure the home view is active on load
  navigateTo("home-view");
});
