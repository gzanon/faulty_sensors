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
 * mais robusto a brilho, reflexo, baixo contraste e enquadramento do que
 * bibliotecas de decodificação em JS puro). Requer um navegador com suporte
 * (Chrome/Edge no Android e desktop); retorna null nos demais.
 */
export async function decodeQrFromBlob(blob: Blob): Promise<string | null> {
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
