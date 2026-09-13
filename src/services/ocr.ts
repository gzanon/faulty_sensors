import { createWorker, type Worker } from 'tesseract.js';

const CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-/';

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/tesseract-core-simd-lstm.js',
      langPath: '/tesseract',
      cacheMethod: 'none',
    }).then(async (worker) => {
      await worker.setParameters({ tessedit_char_whitelist: CHAR_WHITELIST });
      return worker;
    });
  }
  return workerPromise;
}

export async function ocrBlob(blob: Blob): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(blob);
  return data.text.trim();
}

/** Extrai o trecho alfanumérico mais provável de ser um ID/PN de sensor. */
export function suggestSensorIdFromText(text: string): string | null {
  const candidates = text.match(/[A-Za-z0-9]{2,}(?:[.\-/][A-Za-z0-9]{2,}){1,4}/g);
  if (!candidates || candidates.length === 0) return null;
  return candidates.reduce((best, cur) => (cur.length > best.length ? cur : best));
}
