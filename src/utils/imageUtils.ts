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

      const whitespaceHeight = 100; // Space for the text below the image
      const orderIdFontSize = 60; // Font size for the order ID

      // Use the natural dimensions of the captured image for the main part of the canvas
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight + whitespaceHeight;

      // Fill background with white
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the original image (captured design) at the top
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

      // Draw Order Display ID
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center'; // Center the text horizontally
      ctx.textBaseline = 'middle'; // Vertically center the text within its allocated space
      ctx.font = `900 ${orderIdFontSize}px Arial`; // Set font to extra-bold

      const textX = canvas.width / 2; // Horizontal center of the canvas
      const textY = img.naturalHeight + (whitespaceHeight / 2); // Vertical center of the whitespace below the image

      ctx.fillText(orderDisplayId, textX, textY);

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