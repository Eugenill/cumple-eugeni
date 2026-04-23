"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { getCroppedImage } from "@/lib/cropImage";

type Props = {
  src: string;
  aspect?: number;
  onClose: () => void;
  /**
   * Rep el resultat de l'enquadrat. Si la promesa es resol sense llançar,
   * el modal es tanca automàticament; si llança, mostrem l'error i el
   * modal queda obert.
   */
  onSave: (blob: Blob, dataUrl: string) => Promise<void> | void;
  saveLabel?: string;
  title?: string;
  subtitle?: string;
};

export function ImageEditor({
  src,
  aspect = 4 / 3,
  onClose,
  onSave,
  saveLabel = "Desar enquadrat",
  title = "Ajusta l'enquadrat",
  subtitle = "Mou, amplia i rota la imatge. A la dreta veuràs com quedarà al timeline.",
}: Props) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedPixels(pixels);
  }, []);

  // Cada cop que canvia el retall, generem un preview en JPEG a baixa qualitat.
  useEffect(() => {
    if (!croppedPixels) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setGeneratingPreview(true);
      try {
        const { dataUrl } = await getCroppedImage(
          src,
          croppedPixels,
          rotation,
          "image/jpeg",
          0.72
        );
        setPreviewUrl(dataUrl);
      } catch (err) {
        console.error("Error generant preview:", err);
      } finally {
        setGeneratingPreview(false);
      }
    }, 180);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [croppedPixels, rotation, src]);

  // Esc per tancar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function handleSaveClick() {
    if (!croppedPixels) return;
    setSaving(true);
    setError(null);
    try {
      const { blob, dataUrl } = await getCroppedImage(
        src,
        croppedPixels,
        rotation,
        "image/jpeg",
        0.92
      );
      await onSave(blob, dataUrl);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperat";
      setError(msg);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-sepia-700/50 backdrop-blur-sm grid place-items-center p-4"
      onClick={() => !saving && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card w-full max-w-4xl p-5 md:p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Tancar"
          onClick={() => !saving && onClose()}
          disabled={saving}
          className="absolute top-3 right-3 w-8 h-8 rounded-full grid place-items-center text-sepia-500 hover:text-accent-rose hover:bg-cream-100 transition-colors disabled:opacity-50"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="hand text-accent-rose text-lg">editor d&apos;imatge</div>
        <h3 className="font-serif text-2xl leading-tight pr-8">{title}</h3>
        <p className="text-sepia-500 text-sm mt-1">{subtitle}</p>

        <div className="grid md:grid-cols-[1fr_260px] gap-5 md:gap-6 mt-5">
          {/* Editor */}
          <div>
            <div
              className="relative w-full bg-sepia-100 rounded-lg overflow-hidden"
              style={{ height: 380 }}
            >
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                restrictPosition={false}
                objectFit="contain"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-xs text-sepia-500 mb-1 block">
                  Zoom
                </label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-accent-rose"
                />
              </div>
              <div>
                <label className="text-xs text-sepia-500 mb-1 block">
                  Rotació
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(parseFloat(e.target.value))}
                    className="w-full accent-accent-rose"
                  />
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="chip shrink-0"
                    title="Gira 90°"
                  >
                    ↻ 90°
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <div className="text-xs uppercase tracking-wider text-sepia-400 mb-2">
              Com quedarà al timeline
            </div>
            <div className="polaroid rotate-[-0.4deg]">
              <div className="relative aspect-[4/3] rounded overflow-hidden bg-sepia-100">
                {previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-sepia-400 hand">
                    {generatingPreview ? "generant…" : "ajusta l'enquadrat"}
                  </div>
                )}
                {generatingPreview && previewUrl && (
                  <div className="absolute top-1 right-1 text-[10px] hand text-accent-rose bg-cream-50/80 rounded px-1.5 py-0.5">
                    actualitzant…
                  </div>
                )}
              </div>
              <div className="text-center mt-2 hand text-sm text-sepia-500">
                preview
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-accent-rose/10 border border-accent-rose/30 text-accent-rose rounded-lg px-4 py-3 text-sm mt-4">
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="ink-btn-outline flex-1"
          >
            Cancel·lar
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving || !croppedPixels}
            className="ink-btn flex-1 justify-center"
          >
            {saving ? "Desant…" : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
