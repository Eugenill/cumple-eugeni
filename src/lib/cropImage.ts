export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Retalla la imatge `src` segons `crop` (en píxels d'imatge original) i
 * retorna un {Blob, dataUrl}. Rota `rotation` graus abans de retallar.
 */
export async function getCroppedImage(
  src: string,
  crop: PixelCrop,
  rotation = 0,
  mime: string = "image/jpeg",
  quality: number = 0.92
): Promise<{ blob: Blob; dataUrl: string }> {
  const image = await loadImage(src);

  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  // Mida del llenç després de rotar la imatge completa (bounding box).
  const rotW = image.width * cos + image.height * sin;
  const rotH = image.width * sin + image.height * cos;

  // 1) Dibuixem la imatge rotada en un llenç auxiliar.
  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = rotW;
  rotCanvas.height = rotH;
  const rotCtx = rotCanvas.getContext("2d");
  if (!rotCtx) throw new Error("Canvas not supported");
  rotCtx.translate(rotW / 2, rotH / 2);
  rotCtx.rotate(radians);
  rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

  // 2) Retallem la regió demanada del llenç rotat.
  const out = document.createElement("canvas");
  out.width = Math.round(crop.width);
  out.height = Math.round(crop.height);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(
    rotCanvas,
    Math.round(crop.x),
    Math.round(crop.y),
    Math.round(crop.width),
    Math.round(crop.height),
    0,
    0,
    Math.round(crop.width),
    Math.round(crop.height)
  );

  const dataUrl = out.toDataURL(mime, quality);
  const blob: Blob = await new Promise((resolve, reject) => {
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob va fallar"))),
      mime,
      quality
    );
  });

  return { blob, dataUrl };
}
