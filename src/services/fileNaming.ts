import { FACES, type Face, type NamedPhoto, type SensorSession } from '../types/sensor';

const ONEDRIVE_FOLDER = 'APP Sensores';

export function sanitizeSensorId(raw: string): string {
  return raw
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9.\-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatTimestamp(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function buildFileName(idSensor: string, face: Face, date: Date): string {
  return `${idSensor}_${face}_${formatTimestamp(date)}.jpg`;
}

export function photoFileName(idSensor: string, face: Face, capturedAt: string): string {
  return buildFileName(idSensor, face, new Date(capturedAt));
}

export function oneDriveFolderName(): string {
  return ONEDRIVE_FOLDER;
}

export function namedPhotosFromSession(session: SensorSession): NamedPhoto[] {
  return FACES.filter((face) => session.photos[face]).map((face) => {
    const photo = session.photos[face]!;
    return {
      face,
      fileName: photoFileName(session.idSensor, face, photo.capturedAt),
      blob: photo.blob,
    };
  });
}
