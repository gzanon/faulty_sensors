import { createWorker, type Worker } from 'tesseract.js';
import { preprocessForOcr } from './imageResize';

const CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-/';

export interface OcrProgress {
  status: string;
  progress: number;
}

type ProgressListener = (p: OcrProgress) => void;

let workerPromise: Promise<Worker> | null = null;
let progressListener: ProgressListener | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/tesseract-core-simd-lstm.js',
      langPath: '/tesseract',
      cacheMethod: 'none',
      logger: (m: OcrProgress) => progressListener?.(m),
    })
      .then(async (worker) => {
        await worker.setParameters({ tessedit_char_whitelist: CHAR_WHITELIST });
        return worker;
      })
      .catch((err) => {
        // Permite que uma tentativa futura recrie o worker em vez de ficar preso num erro permanente.
        workerPromise = null;
        throw err;
      });
  }
  return workerPromise;
}

export async function ocrBlob(blob: Blob, onProgress?: ProgressListener): Promise<string> {
  progressListener = onProgress ?? null;
  try {
    const worker = await getWorker();
    const preprocessed = await preprocessForOcr(blob);
    const { data } = await worker.recognize(preprocessed);
    return data.text.trim();
  } finally {
    progressListener = null;
  }
}

/** Extrai o trecho alfanumérico mais provável de ser um ID/PN de sensor. */
export function suggestSensorIdFromText(text: string): string | null {
  const candidates = text.match(/[A-Za-z0-9]{2,}(?:[.\-/][A-Za-z0-9]{2,}){1,4}/g);
  if (!candidates || candidates.length === 0) return null;
  return candidates.reduce((best, cur) => (cur.length > best.length ? cur : best));
}
