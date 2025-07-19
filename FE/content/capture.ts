import html2canvas from "html2canvas";

export interface CaptureArea {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export async function captureSelectedArea(
  area: CaptureArea
): Promise<Blob | null> {
  try {
    // Capture the entire document body as a canvas
    const canvas = await html2canvas(document.body);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Calculate width and height of the selected area
    const width = area.endX - area.startX;
    const height = area.endY - area.startY;

    // Ensure positive width & height (handle cases where user drags from right-to-left or bottom-to-top)
    const absWidth = Math.abs(width);
    const absHeight = Math.abs(height);
    const startX = width < 0 ? area.endX : area.startX;
    const startY = height < 0 ? area.endY : area.startY;

    // Get the image data from the selected portion of the captured canvas
    const imgData = ctx.getImageData(startX, startY, absWidth, absHeight);

    // Create a temporary canvas to draw only the selected image data
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = imgData.width;
    tempCanvas.height = imgData.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return null;

    // Put the selected image data onto the temporary canvas
    tempCtx.putImageData(imgData, 0, 0);

    // Convert the temporary canvas content to a Blob (PNG format by default)
    return new Promise((resolve) => {
      tempCanvas.toBlob((blob: Blob | null) => {
        resolve(blob);
      });
    });
  } catch (error) {
    console.error("Error capturing image:", error);
    return null;
  }
}
