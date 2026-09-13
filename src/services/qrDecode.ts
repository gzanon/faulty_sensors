import { BrowserQRCodeReader } from '@zxing/browser';

let reader: BrowserQRCodeReader | null = null;

function getReader(): BrowserQRCodeReader {
  if (!reader) reader = new BrowserQRCodeReader();
  return reader;
}

export async function decodeQrFromBlob(blob: Blob): Promise<string | null> {
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
