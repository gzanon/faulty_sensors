export interface GuideBox {
  x: number;
  y: number;
  size: number;
}

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;
const CROP_MARGIN = 0.15;

async function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

/**
 * Captura o frame atual de um <video>, opcionalmente recorta na área do
 * quadrado-guia (com margem) e redimensiona/comprime o resultado.
 */
export async function captureFrameFromVideo(video: HTMLVideoElement, guideBox?: GuideBox): Promise<Blob> {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = video.videoWidth;
  sourceCanvas.height = video.videoHeight;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Canvas 2D indisponível');
  sourceCtx.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height);

  let cropX = 0;
  let cropY = 0;
  let cropSize = Math.min(sourceCanvas.width, sourceCanvas.height);

  if (guideBox) {
    const margin = guideBox.size * CROP_MARGIN;
    cropSize = Math.min(sourceCanvas.width, sourceCanvas.height, guideBox.size + margin * 2);
    cropX = Math.max(0, Math.min(sourceCanvas.width - cropSize, guideBox.x - margin));
    cropY = Math.max(0, Math.min(sourceCanvas.height - cropSize, guideBox.y - margin));
  }

  const outSize = Math.min(MAX_DIMENSION, cropSize);
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outSize;
  outCanvas.height = outSize;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Canvas 2D indisponível');
  outCtx.drawImage(sourceCanvas, cropX, cropY, cropSize, cropSize, 0, 0, outSize, outSize);

  return blobFromCanvas(outCanvas);
}

/** Redimensiona/comprime uma foto já existente (usada no fallback sem overlay). */
export async function resizeBlob(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    });

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponível');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return blobFromCanvas(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
