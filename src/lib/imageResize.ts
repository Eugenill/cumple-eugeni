/**
 * Comprimeix una imatge al navegador abans de pujar-la.
 *
 * Per què: Vercel rebutja amb un 413 (Payload Too Large) qualsevol POST de
 * més de ~4.5 MB. Les fotos d'un iPhone fàcilment passen aquest límit, i
 * la resposta no és JSON, cosa que provoca a iOS Safari el missatge
 * "The string did not match the expected pattern" quan intentem fer
 * `res.json()`. Re-encodem a JPEG i fem un downscale fins a `maxDim` px
 * (la dimensió més llarga). Si alguna cosa va malament, retornem el
 * fitxer original.
 */
export async function resizeImageFile(
  file: File,
  opts: { maxDim?: number; quality?: number } = {}
): Promise<File> {
  const { maxDim = 2200, quality = 0.85 } = opts;

  if (!file.type.startsWith("image/")) return file;

  // Si ja és un JPEG petit no cal tocar res
  const ALREADY_OK_BYTES = 1.5 * 1024 * 1024; // 1.5 MB
  const SAFE_LIMIT = 3.8 * 1024 * 1024; // marge sota els 4.5 MB de Vercel

  let dataUrl: string;
  try {
    dataUrl = await readAsDataURL(file);
  } catch {
    return file;
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(dataUrl);
  } catch {
    // Alguns navegadors no descodifiquen HEIC nadiu — retornem
    // l'original perquè el servidor el rebutgi/accepti com pugui.
    return file;
  }

  const { width: w0, height: h0 } = img;
  if (!w0 || !h0) return file;

  const max = Math.max(w0, h0);
  const haDeReduir = max > maxDim;
  const haDeRecodificar =
    file.type !== "image/jpeg" || file.size > ALREADY_OK_BYTES;

  if (!haDeReduir && !haDeRecodificar && file.size < SAFE_LIMIT) {
    return file;
  }

  const escala = haDeReduir ? maxDim / max : 1;
  const w = Math.max(1, Math.round(w0 * escala));
  const h = Math.max(1, Math.round(h0 * escala));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return file;

  // Si la "compressió" l'ha fet més gros que l'original (pot passar amb
  // imatges ja molt comprimides) ens quedem amb l'original.
  if (blob.size >= file.size && !haDeReduir) {
    return file;
  }

  const baseName =
    file.name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_") || "foto";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imatge no llegible"));
    img.src = src;
  });
}
