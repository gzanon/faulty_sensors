export const FACES = ['Topo', 'Base', 'Frente', 'Verso', 'Esquerda', 'Direita'] as const;
export type Face = (typeof FACES)[number];

export type IdSource = 'qr' | 'ocr' | 'manual';

export interface CapturedPhoto {
  face: Face;
  blob: Blob;
  capturedAt: string;
}

export interface NamedPhoto {
  face: Face;
  fileName: string;
  blob: Blob;
}

export interface SensorSession {
  idSensor: string;
  idSource: IdSource;
  labelFace: Face;
  dataRegistro: string;
  photos: Partial<Record<Face, CapturedPhoto>>;
}

export function createEmptySession(): SensorSession {
  return {
    idSensor: '',
    idSource: 'manual',
    labelFace: 'Topo',
    dataRegistro: '',
    photos: {},
  };
}
