export interface OcrProgress {
  status: string;
  progress: number;
}

export async function recognizeCardText(
  image: Blob | HTMLCanvasElement,
  onProgress?: (update: OcrProgress) => void,
): Promise<string> {
  const tesseract = await import("tesseract.js");
  const worker = await tesseract.createWorker("eng", 1, {
    logger: (message) => {
      if (message.status && typeof message.progress === "number") {
        onProgress?.({
          status: message.status,
          progress: message.progress,
        });
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: tesseract.PSM.AUTO,
      preserve_interword_spaces: "1",
    });
    const result = await worker.recognize(image);
    return result.data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

export function cropVideoToCard(
  video: HTMLVideoElement,
  overlay: DOMRect,
  videoRect: DOMRect,
): HTMLCanvasElement {
  const scaleX = video.videoWidth / videoRect.width;
  const scaleY = video.videoHeight / videoRect.height;
  const sx = Math.max(0, (overlay.left - videoRect.left) * scaleX);
  const sy = Math.max(0, (overlay.top - videoRect.top) * scaleY);
  const sw = Math.min(video.videoWidth - sx, overlay.width * scaleX);
  const sh = Math.min(video.videoHeight - sy, overlay.height * scaleY);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  enhanceForOcr(ctx, canvas.width, canvas.height);
  return canvas;
}

export async function prepareImageFile(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  enhanceForOcr(ctx, canvas.width, canvas.height);
  return canvas;
}

function enhanceForOcr(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const boosted = gray > 150 ? 255 : gray < 90 ? 0 : (gray - 90) * (255 / 60);
    data[i] = data[i + 1] = data[i + 2] = boosted;
  }
  ctx.putImageData(image, 0, 0);
}
