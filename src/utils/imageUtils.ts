import { proxyImageUrl } from '@/utils/imageProxy';

export const addTextToImage = (
  imageUrl: string,
  productName: string,
  orderDisplayId: string,
  printingWidthMm?: number | null,
  printingHeightMm?: number | null
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      const DPI = 300;
      const MM_PER_INCH = 25.4;

      // Use printing dimensions if available, otherwise fallback to original image dimensions
      const targetWidthPx = printingWidthMm ? Math.round((printingWidthMm / MM_PER_INCH) * DPI) : img.width;
      const targetHeightPx = printingHeightMm ? Math.round((printingHeightMm / MM_PER_INCH) * DPI) : img.height;

      // Adjust whitespace and font size based on the target resolution
      const whitespaceHeight = Math.round(targetHeightPx * 0.1); // 10% of height for whitespace
      const orderIdFontSize = Math.round(targetHeightPx * 0.05); // 5% of height for font size

      canvas.width = targetWidthPx;
      canvas.height = targetHeightPx + whitespaceHeight;

      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Original image, scaled to fit target dimensions
      ctx.drawImage(img, 0, 0, targetWidthPx, targetHeightPx);

      // Common text properties
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw Order Display ID - MIRRORED
      ctx.save(); // Save the current canvas state
      ctx.font = `900 ${orderIdFontSize}px Arial`; // Set font to extra-bold
      const orderIdX = canvas.width / 2;
      const orderIdY = targetHeightPx + (whitespaceHeight / 2); // Center vertically

      // Translate to the center of where the text will be, then flip horizontally
      ctx.translate(orderIdX, orderIdY);
      ctx.scale(-1, 1); // Apply horizontal flip

      // Draw the text at the new origin (which is its center)
      ctx.fillText(orderDisplayId, 0, 0);

      ctx.restore(); // Restore the canvas state to undo the transformations

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob conversion failed'));
        }
      }, 'image/png');
    };
    img.onerror = (err) => {
      console.error("Error loading image for text addition:", err);
      reject(new Error('Failed to load image'));
    };
    img.src = proxyImageUrl(imageUrl);
  });
};