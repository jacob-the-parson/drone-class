// Image utilities. Chroma-key removal = the in-house half of the
// AI-texturing path (generate → key out → use).
export const removeChromaKeyPixels = (
  srcUrl: string,
  targetRgb: { r: number; g: number; b: number },
  tolerance: number,
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    // crossOrigin on data: URIs causes CORS errors in some browsers
    if (!srcUrl.startsWith('data:')) img.crossOrigin = 'Anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(srcUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const distance = Math.sqrt(
          Math.pow(data[i] - targetRgb.r, 2) +
            Math.pow(data[i + 1] - targetRgb.g, 2) +
            Math.pow(data[i + 2] - targetRgb.b, 2),
        );
        if (distance < tolerance) data[i + 3] = 0;
      }
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(srcUrl);
    img.src = srcUrl;
  });
};
