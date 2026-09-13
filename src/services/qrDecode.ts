import {
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  NotFoundException,
  RGBLuminanceSource,
} from '@zxing/library';

// Frações do menor lado da imagem usadas como tamanho da janela de busca.
// A etiqueta costuma ocupar só uma pequena parte da foto e nem sempre fica
// centralizada, então buscamos em várias escalas e posições antes de desistir.
const WINDOW_FRACTIONS = [1, 0.5, 0.3, 0.18];
const STEP_FACTOR = 0.6;

function getReader(): MultiFormatReader {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.TRY_HARDER, true);
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  return reader;
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Falha ao carregar imagem para leitura de QR'));
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toGrayscale(img: HTMLImageElement): { luminances: Uint8ClampedArray; width: number; height: number } {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  ctx.drawImage(img, 0, 0);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const luminances = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    luminances[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  return { luminances, width: canvas.width, height: canvas.height };
}

function tryDecodeRegion(
  reader: MultiFormatReader,
  luminances: Uint8ClampedArray,
  dataWidth: number,
  dataHeight: number,
  left: number,
  top: number,
  size: number,
): string | null {
  const source = new RGBLuminanceSource(luminances, size, size, dataWidth, dataHeight, left, top);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  try {
    return reader.decode(bitmap).getText();
  } catch (err) {
    if (err instanceof NotFoundException) return null;
    return null;
  } finally {
    reader.reset();
  }
}

/**
 * Busca o QR em janelas deslizantes de tamanhos decrescentes, cobrindo toda
 * a foto. Necessário porque a etiqueta costuma ocupar só uma fração pequena
 * do quadro e não fica sempre centralizada.
 */
function decodeGridSearch(luminances: Uint8ClampedArray, width: number, height: number): string | null {
  const reader = getReader();
  const minDim = Math.min(width, height);

  for (const frac of WINDOW_FRACTIONS) {
    const size = Math.max(50, Math.round(minDim * frac));
    if (size > width || size > height) continue;
    const step = Math.max(1, Math.round(size * STEP_FACTOR));

    const xPositions = new Set<number>();
    for (let x = 0; x + size <= width; x += step) xPositions.add(x);
    xPositions.add(width - size);

    const yPositions = new Set<number>();
    for (let y = 0; y + size <= height; y += step) yPositions.add(y);
    yPositions.add(height - size);

    for (const y of yPositions) {
      for (const x of xPositions) {
        const text = tryDecodeRegion(reader, luminances, width, height, x, y, size);
        if (text) return text;
      }
    }
  }
  return null;
}

interface BarcodeDetectorResult {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: ImageBitmap): Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorLike;
}

/**
 * Usa a API nativa BarcodeDetector do navegador (no Chrome/Android, isso usa
 * o mesmo mecanismo de detecção do leitor de QR nativo do sistema — muito
 * mais robusto a brilho, reflexo e baixo contraste do que o zxing em JS puro).
 * Indisponível em navegadores sem suporte (ex: Firefox, Safari), retorna null.
 */
async function decodeViaNativeDetector(blob: Blob): Promise<string | null> {
  const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  if (!BarcodeDetectorCtor) return null;

  let bitmap: ImageBitmap | null = null;
  try {
    const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
    bitmap = await createImageBitmap(blob);
    const results = await detector.detect(bitmap);
    return results[0]?.rawValue ?? null;
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

export async function decodeQrFromBlob(blob: Blob): Promise<string | null> {
  const native = await decodeViaNativeDetector(blob);
  if (native) return native;

  try {
    const img = await loadImage(blob);
    const { luminances, width, height } = toGrayscale(img);
    return decodeGridSearch(luminances, width, height);
  } catch {
    return null;
  }
}
