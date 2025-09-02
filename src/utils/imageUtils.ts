import { proxyImageUrl } from '@/utils/imageProxy';

export const addTextToImage = (imageUrl: string, productName: string, orderDisplayId: string): Promise<Blob> => {
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

      const textHeight = 80; // Increased height to accommodate both lines of text
      const productNameFontSize = 25; // Font size for product name
      const orderIdFontSize = 30; // Font size for order ID

      // New canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height + textHeight;

      // White background for the text area
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Original image
      ctx.drawImage(img, 0, 0);

      // Common text properties
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw Product Name
      ctx.font = `normal ${productNameFontSize}px Arial`;
      const productNameX = canvas.width / 2;
      const productNameY = img.height + (textHeight / 2) - (productNameFontSize / 2) - 5; // Position above order ID
      ctx.fillText(productName, productNameX, productNameY);

      // Draw Order Display ID
      ctx.font = `900 ${orderIdFontSize}px Arial`; // Extra-bold font
      const orderIdX = canvas.width / 2;
      const orderIdY = img.height + (textHeight / 2) + (orderIdFontSize / 2) + 5; // Position below product name
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