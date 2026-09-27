"use client";

/**
 * Downscale a photo in the browser and return a JPEG data URL.
 * The real app does the same before uploading, so phone photos (4–12 MB)
 * become ~150 KB and load fast inside Instagram's browser.
 */
export async function resizeImage(file: File, maxDim = 1200, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
