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
    const base = import.meta.env.BASE_URL;

    // O tesseract.js tem um bug conhecido: se o carregamento do idioma ou a
    // inicialização falharem, a promessa interna do createWorker nunca
    // resolve nem rejeita (o erro é engolido internamente). Por isso usamos
    // `errorHandler` para capturar o erro manualmente e rejeitar nós mesmos.
    workerPromise = new Promise<Worker>((resolve, reject) => {
      createWorker('eng', 1, {
        workerPath: `${base}tesseract/worker.min.js`,
        corePath: `${base}tesseract/tesseract-core-simd-lstm.js`,
        langPath: `${base}tesseract`,
        cacheMethod: 'none',
        // Cria o worker a partir da URL de rede diretamente, em vez de baixar o
        // script e envolver num blob: URL (comportamento padrão) — evita um
        // possível travamento de fetch dentro do contexto de um worker blob.
        workerBlobURL: false,
        logger: (m: OcrProgress) => progressListener?.(m),
        errorHandler: (err: unknown) => {
          reject(new Error(`Falha interna do OCR: ${typeof err === 'string' ? err : JSON.stringify(err)}`));
        },
      })
        .then(async (worker) => {
          await worker.setParameters({ tessedit_char_whitelist: CHAR_WHITELIST });
          resolve(worker);
        })
        .catch(reject);
    }).catch((err) => {
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
