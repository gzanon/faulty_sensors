import type { NamedPhoto } from '../types/sensor';

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

export async function sharePhotos(photos: NamedPhoto[]): Promise<ShareResult> {
  if (!canShareFiles()) return { status: 'unsupported' };

  const files = photos.map((p) => new File([p.blob], p.fileName, { type: 'image/jpeg' }));

  try {
    await navigator.share({ files, title: 'Fotos do sensor' });
    return { status: 'shared' };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { status: 'cancelled' };
    }
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

/** Fallback: baixa cada foto individualmente para a galeria/downloads do aparelho. */
export function downloadPhotosFallback(photos: NamedPhoto[]): void {
  for (const photo of photos) {
    const url = URL.createObjectURL(photo.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = photo.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
