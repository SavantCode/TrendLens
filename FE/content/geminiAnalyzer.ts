export interface ChartPattern {
  name: string;
  description: string;
  position: {
    x: number;
    y: number;
  };
}

export interface AnalysisResult {
  patterns: ChartPattern[];
}

export async function analyzeChartWithGemini(
  imageBlob: Blob
): Promise<AnalysisResult> {
  try {
    const formData = new FormData();
    formData.append("image", imageBlob);

    // This URL should point to your backend server's analysis endpoint.
    // In your provided files, app.js sets up an /api route, and chartClassifier.js
    // is intended to handle the analysis. You would need a route in analyzeRoutes.js
    // that points to this analysis logic.
    const response = await fetch("http://localhost:5000/analyze", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      // If the server response is not OK (e.g., 4xx or 5xx status code)
      const errorText = await response.text(); // Get the error message from the server
      throw new Error(`Server error: ${response.statusText}. Details: ${errorText}`);
    }

    const result: AnalysisResult = await response.json();
    return result;
  } catch (error: any) {
    // Catch any network errors or errors thrown from the response check
    console.error("Error analyzing chart with Gemini:", error);
    // Return a default empty patterns array in case of an error
    throw new Error(`Failed to analyze chart: ${error.message || "Unknown error"}`);
  }
}
