/**
 * Comprimeix una imatge al navegador abans de pujar-la.
 *
 * Per què: Vercel rebutja amb un 413 (Payload Too Large) qualsevol POST de
 * més de ~4.5 MB. Les fotos d'un iPhone fàcilment passen aquest límit, i
 * la resposta no és JSON, cosa que provoca a iOS Safari el missatge
 * "The string did not match the expected pattern" quan intentem fer
 * `res.json()`.
 *
 * Decodifiquem la imatge amb tres mètodes en cascada per cobrir el màxim
 * de navegadors (incloent HEIC/HEIF a iOS 17+):
 *   1. `createImageBitmap(file)` — el més modern i amb més suport.
 *   2. `URL.createObjectURL(file)` + `<img>`.
 *   3. data URL + `<img>`.
 * Re-encodem a JPEG i fem un downscale fins a `maxDim` px (la dimensió
 * més llarga). Si tot falla, retornem el fitxer original i marquem un
 * flag perquè la UI pugui informar l'usuari.
 */

export type ResizeOptions = { maxDim?: number; quality?: number };
export type ResizeResult = {
  file: File;
  /** True si no s'ha pogut tocar (probablement HEIC en un dispositiu antic). */
  unprocessed: boolean;
  /** True si la imatge sembla ser HEIC/HEIF segons MIME o extensió. */
  esHeic: boolean;
};

export async function resizeImageFile(
  file: File,
  opts: ResizeOptions = {}
): Promise<File> {
  const { file: out } = await resizeImageFileDetallat(file, opts);
  return out;
}

export async function resizeImageFileDetallat(
  file: File,
  opts: ResizeOptions = {}
): Promise<ResizeResult> {
  const esHeic = isHeic(file);
  try {
    const out = await intentarResize(file, opts);
    if (out) return { file: out, unprocessed: false, esHeic };
  } catch {
    // ignore — fem fallback
  }
  return { file, unprocessed: true, esHeic };
}

async function intentarResize(
  file: File,
  { maxDim = 2200, quality = 0.85 }: ResizeOptions
): Promise<File | null> {
  if (!file.type.startsWith("image/") && !isHeic(file)) return null;

  const ALREADY_OK_BYTES = 1.5 * 1024 * 1024; // 1.5 MB
  const SAFE_LIMIT = 3.8 * 1024 * 1024; // marge sota els 4.5 MB de Vercel

  const decoded = await decodificar(file);
  if (!decoded) return null;

  const { width: w0, height: h0, source, cleanup } = decoded;
  try {
    if (!w0 || !h0) return null;

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
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return null;

    // Si la "compressió" l'ha fet més gros que l'original (pot passar amb
    // imatges ja molt comprimides) ens quedem amb l'original — només si
    // l'original no és HEIC, perquè HEIC l'hem de convertir sí o sí.
    if (
      blob.size >= file.size &&
      !haDeReduir &&
      file.type === "image/jpeg"
    ) {
      return file;
    }

    const baseName =
      file.name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_") || "foto";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    cleanup?.();
  }
}

type Decoded = {
  width: number;
  height: number;
  source: CanvasImageSource;
  cleanup?: () => void;
};

async function decodificar(file: File): Promise<Decoded | null> {
  // 1) createImageBitmap a partir del fitxer — el més robust, i a iOS 17+
  //    sap obrir HEIC/HEIF.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      // fallback
    }
  }

  // 2) Object URL + <img>
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (w && h) {
        return {
          width: w,
          height: h,
          source: img,
          cleanup: () => URL.revokeObjectURL(url),
        };
      }
      URL.revokeObjectURL(url);
    } catch {
      URL.revokeObjectURL(url);
    }
  } catch {
    // fallback
  }

  // 3) data URL + <img>
  try {
    const dataUrl = await readAsDataURL(file);
    const img = await loadImage(dataUrl);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w && h) {
      return { width: w, height: h, source: img };
    }
  } catch {
    // ignore
  }

  return null;
}

function isHeic(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t === "image/heic" || t === "image/heif") return true;
  if (t === "image/heic-sequence" || t === "image/heif-sequence") return true;
  // Alguns iOS no reporten MIME — comprovem extensió
  return /\.hei[cf]$/i.test(file.name);
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    } catch (e) {
      reject(e);
    }
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
