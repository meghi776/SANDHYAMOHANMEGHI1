import { proxyImageUrl } from '@/utils/imageProxy';

export const addTextToImage = (imageUrl: string, orderDisplayId: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      console.log(`Image loaded successfully for order ${orderDisplayId}.`);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error(`Could not get canvas context for order ${orderDisplayId}.`);
        return reject(new Error('Could not get canvas context'));
      }

      const whitespaceHeight = 60; // Increased height for larger text
      const orderIdFontSize = 30; // Increased font size

      // New canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height + whitespaceHeight;

      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Original image
      ctx.drawImage(img, 0, 0);

      // Common text properties
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw Order Display ID
      ctx.font = `900 ${orderIdFontSize}px Arial`; // Set font to extra-bold
      const orderIdX = canvas.width / 2;
      const orderIdY = img.height + (whitespaceHeight / 2); // Center vertically

      ctx.fillText(orderDisplayId, orderIdX, orderIdY);

      canvas.toBlob((blob) => {
        if (blob) {
          console.log(`Canvas to Blob conversion successful for order ${orderDisplayId}.`);
          resolve(blob);
        } else {
          console.error(`Canvas to Blob conversion failed for order ${orderDisplayId}. Blob is null.`);
          reject(new Error('Canvas to Blob conversion failed'));
        }
      }, 'image/png');
    };
    img.onerror = (err) => {
      console.error(`Error loading image for text addition for order ${orderDisplayId}:`, err);
      reject(new Error('Failed to load image'));
    };
    img.src = proxyImageUrl(imageUrl);
  });
};