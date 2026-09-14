import type { NamedPhoto } from '../types/sensor';

export interface ShareableFile {
  fileName: string;
  blob: Blob;
  mimeType: string;
}

export function canShareFiles(): boolean {
  if (!navigator.canShare) return false;
  try {
    const probe = new File([new Blob(['x'])], 'probe.jpg', { type: 'image/jpeg' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export interface ShareResult {
  status: 'shared' | 'cancelled' | 'unsupported' | 'error';
  message?: string;
}

export async function shareFiles(files: ShareableFile[], title: string): Promise<ShareResult> {
  if (!canShareFiles()) return { status: 'unsupported' };

  const shareFilesList = files.map((f) => new File([f.blob], f.fileName, { type: f.mimeType }));

  try {
    await navigator.share({ files: shareFilesList, title });
    return { status: 'shared' };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { status: 'cancelled' };
    }
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

export async function sharePhotos(photos: NamedPhoto[]): Promise<ShareResult> {
  return shareFiles(
    photos.map((p) => ({ fileName: p.fileName, blob: p.blob, mimeType: 'image/jpeg' })),
    'Fotos do sensor',
  );
}

/** Fallback: baixa cada arquivo individualmente para a pasta de downloads do aparelho. */
export function downloadFilesFallback(files: ShareableFile[]): void {
  for (const file of files) {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

export function downloadPhotosFallback(photos: NamedPhoto[]): void {
  downloadFilesFallback(photos.map((p) => ({ fileName: p.fileName, blob: p.blob, mimeType: 'image/jpeg' })));
}
