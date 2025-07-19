import { captureSelectedArea, CaptureArea } from "./capture";
import { analyzeChartWithGemini, AnalysisResult, ChartPattern } from "./geminiAnalyzer";

// Create the main overlay div that covers the entire screen for selection
const overlay = document.createElement("div");
overlay.id = "chart-selector-overlay";
Object.assign(overlay.style, {
  position: "fixed",
  top: "0",
  left: "0",
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0, 0, 0, 0.3)", // Semi-transparent background
  cursor: "crosshair", // Cursor to indicate selection mode
  zIndex: "1000000", // High z-index to be on top of page content
});

document.body.appendChild(overlay);

let startX = 0; // X-coordinate where mouse down event occurred
let startY = 0; // Y-coordinate where mouse down event occurred
let selectionBox: HTMLDivElement | null = null; // The visual selection rectangle
let currentResultWindow: HTMLDivElement | null = null; // Reference to the floating analysis/loading window

// Function to remove any existing result or loading window from the DOM
function removeCurrentResultWindow() {
  if (currentResultWindow) {
    currentResultWindow.remove();
    currentResultWindow = null;
  }
}

// Function to display a loading indicator while the chart is being analyzed
function showLoadingIndicator() {
  removeCurrentResultWindow(); // Clear any previous messages
  currentResultWindow = document.createElement("div");
  currentResultWindow.id = "floating-result-window"; // Reusing the ID for consistent styling from overlay.css
  Object.assign(currentResultWindow.style, {
    display: "flex", // Use flexbox for centering content
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    textAlign: "center",
  });
  currentResultWindow.innerHTML = `
    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
    <h3>Analyzing Chart...</h3>
    <p>Please wait while AI processes the image.</p>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(currentResultWindow);
}

// Function to display the final analysis results or an error message
function showAnalysisResult(result: AnalysisResult | null, error: string | null) {
  removeCurrentResultWindow(); // Remove the loading indicator
  currentResultWindow = document.createElement("div");
  currentResultWindow.id = "floating-result-window"; // Use the same ID for styling
  currentResultWindow.style.pointerEvents = "auto"; // Make the window interactive (clickable)

  if (error) {
    // Display an error message if analysis failed
    currentResultWindow.innerHTML = `
      <h3>Analysis Error</h3>
      <p style="color: red;">${error}</p>
      <button id="close-result-btn" style="background-color: #f44336; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">Close</button>
    `;
  } else if (result && result.patterns.length > 0) {
    // Display detected patterns if any
    let patternsHtml = result.patterns.map((p: ChartPattern) => `
      <p><strong>${p.name}:</strong> ${p.description}</p>
    `).join('');
    currentResultWindow.innerHTML = `
      <h3>Chart Analysis Complete!</h3>
      ${patternsHtml}
      <button id="close-result-btn" style="background-color: #4CAF50; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">Close</button>
    `;
  } else {
    // Message if no patterns were detected
    currentResultWindow.innerHTML = `
      <h3>No Patterns Detected</h3>
      <p>The AI did not identify any specific chart patterns in the selected area. Please ensure you selected a clear chart.</p>
      <button id="close-result-btn" style="background-color: #2196F3; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">Close</button>
    `;
  }

  document.body.appendChild(currentResultWindow);

  // Add event listener to the close button within the result window
  const closeResultBtn = document.getElementById("close-result-btn");
  if (closeResultBtn) {
    closeResultBtn.addEventListener("click", () => {
      removeCurrentResultWindow(); // Close the result window
    });
  }
}

// Close button for the main overlay (to cancel the selection process)
const closeBtn = document.createElement("button");
closeBtn.textContent = "×"; // Unicode multiplication sign for a close icon
Object.assign(closeBtn.style, {
  position: "fixed",
  top: "10px",
  right: "10px",
  fontSize: "24px",
  background: "transparent",
  border: "none",
  color: "white",
  cursor: "pointer",
  zIndex: "1000001", // Higher than overlay
});
closeBtn.addEventListener("click", () => {
  overlay.remove(); // Remove the main selection overlay
  document.removeEventListener("keydown", onKeyDown); // Clean up key listener
  removeCurrentResultWindow(); // Also close any active result/loading window
});
overlay.appendChild(closeBtn);

// Escape key listener to close the overlay
function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    overlay.remove(); // Remove the main selection overlay
    document.removeEventListener("keydown", onKeyDown); // Clean up key listener
    removeCurrentResultWindow(); // Also close any active result/loading window
  }
}
document.addEventListener("keydown", onKeyDown);

// Click outside the selection box (on the overlay itself) to close it
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) { // Check if the click was directly on the overlay, not a child element
    overlay.remove(); // Remove the main selection overlay
    document.removeEventListener("keydown", onKeyDown); // Clean up key listener
    removeCurrentResultWindow(); // Also close any active result/loading window
  }
});

// Mouse down event listener on the overlay to start the selection process
overlay.onmousedown = (e: MouseEvent) => {
  // Only start selection if it's the left mouse button (button 0)
  if (e.button !== 0) return;

  startX = e.clientX; // Record starting X position
  startY = e.clientY; // Record starting Y position

  removeCurrentResultWindow(); // Ensure no old result/loading windows are present when starting a new selection

  selectionBox = document.createElement("div"); // Create the visual selection box
  Object.assign(selectionBox.style, {
    position: "fixed",
    border: "2px dashed #00ff00", // Green dashed border
    backgroundColor: "rgba(0, 255, 0, 0.2)", // Semi-transparent green fill
    left: `${startX}px`,
    top: `${startY}px`,
    zIndex: "1000001", // Higher than overlay to be visible
  });

  overlay.appendChild(selectionBox); // Add selection box to the overlay

  // Mouse move event listener to update the selection box size and position
  overlay.onmousemove = (e: MouseEvent) => {
    const currentX = e.clientX;
    const currentY = e.clientY;

    // Calculate the top-left corner and dimensions of the rectangle
    const rectX = Math.min(currentX, startX);
    const rectY = Math.min(currentY, startY);
    const rectWidth = Math.abs(currentX - startX);
    const rectHeight = Math.abs(currentY - startY);

    if (selectionBox) {
      selectionBox.style.left = rectX + "px";
      selectionBox.style.top = rectY + "px";
      selectionBox.style.width = rectWidth + "px";
      selectionBox.style.height = rectHeight + "px";
    }
  };

  // Mouse up event listener to finalize selection, capture, and analyze
  overlay.onmouseup = async (e: MouseEvent) => {
    // Remove mouse move and mouse up listeners to stop selection
    overlay.onmousemove = null;
    overlay.onmouseup = null;

    if (!selectionBox) {
      // If no selection box was created (e.g., just a click without drag)
      overlay.remove();
      document.removeEventListener("keydown", onKeyDown);
      return;
    }

    const rect = selectionBox.getBoundingClientRect(); // Get final dimensions of the selection box
    selectionBox.remove(); // Remove the visual selection box from the DOM

    // Define the area to be captured based on the selection box's final position and size
    const captureArea: CaptureArea = {
      startX: rect.left,
      startY: rect.top,
      endX: rect.right,
      endY: rect.bottom,
    };

    // Remove the main overlay immediately after selection is complete
    overlay.remove();
    document.removeEventListener("keydown", onKeyDown);

    showLoadingIndicator(); // Show loading message to the user

    try {
      // Attempt to capture the selected area as an image Blob
      const imageBlob = await captureSelectedArea(captureArea);

      if (imageBlob) {
        // If image captured successfully, send it for AI analysis
        const analysisResult = await analyzeChartWithGemini(imageBlob);
        showAnalysisResult(analysisResult, null); // Display the analysis result
      } else {
        // Handle cases where image capture failed
        showAnalysisResult(null, "Failed to capture the selected area. This might be due to security restrictions (e.g., cross-origin content) or no content in selection.");
      }
    } catch (error: any) {
      // Catch any errors during the capture or analysis process
      console.error("Error during analysis flow:", error);
      showAnalysisResult(null, `An error occurred during analysis: ${error.message || error}`);
    }
  };
};
