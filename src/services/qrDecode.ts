import { BrowserQRCodeReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import { preprocessForOcr } from './imageResize';

let reader: BrowserQRCodeReader | null = null;

function getReader(): BrowserQRCodeReader {
  if (!reader) {
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.TRY_HARDER, true);
    reader = new BrowserQRCodeReader(hints);
  }
  return reader;
}

async function decodeImageBlob(blob: Blob): Promise<string | null> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Falha ao carregar imagem para leitura de QR'));
    });
    const result = await getReader().decodeFromImageElement(img);
    return result.getText();
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Tenta decodificar o QR na imagem original e, se falhar, numa versão em
 * escala de cinza com contraste realçado — ajuda em fotos com reflexo ou
 * baixo contraste onde a primeira tentativa não encontra o código.
 */
export async function decodeQrFromBlob(blob: Blob): Promise<string | null> {
  const direct = await decodeImageBlob(blob);
  if (direct) return direct;

  try {
    const preprocessed = await preprocessForOcr(blob);
    return await decodeImageBlob(preprocessed);
  } catch {
    return null;
  }
}
