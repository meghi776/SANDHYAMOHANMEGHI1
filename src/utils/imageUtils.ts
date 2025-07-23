import { proxyImageUrl } from '@/utils/imageProxy';

export const addTextToImage = (imageUrl: string, productName: string, orderDisplayId: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      const fixedWidth = 1100;
      const fixedHeight = 2100;
      const whitespaceHeight = 100; // Increased height for order ID text below the image
      const orderIdFontSize = 60; // Adjusted font size for better visibility on larger canvas

      // Set canvas dimensions to include the fixed image area plus whitespace for text
      canvas.width = fixedWidth;
      canvas.height = fixedHeight + whitespaceHeight;

      // Fill background with white
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the original image onto the fixed area of the canvas
      // It will be scaled to fit 1100x2100
      ctx.drawImage(img, 0, 0, fixedWidth, fixedHeight);

      // Common text properties
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw Order Display ID - MIRRORED
      ctx.save(); // Save the current canvas state
      ctx.font = `900 ${orderIdFontSize}px Arial`; // Set font to extra-bold
      const orderIdX = canvas.width / 2;
      const orderIdY = fixedHeight + (whitespaceHeight / 2); // Position below the image

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