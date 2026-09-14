export const FACES = ['Topo', 'Frente', 'Direita', 'Verso', 'Esquerda', 'Base'] as const;
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
  observacoes: string;
  photos: Partial<Record<Face, CapturedPhoto>>;
  /** false quando o sensor está extraviado e o cadastro é feito só com o ID digitado, sem fotos. */
  withPhotos: boolean;
}

/** Um sensor já cadastrado, guardado na fila local à espera de compartilhamento em lote. */
export interface QueuedSensor {
  queueId: string;
  queuedAt: string;
  session: SensorSession;
}

export function createEmptySession(): SensorSession {
  return {
    idSensor: '',
    idSource: 'manual',
    labelFace: 'Topo',
    dataRegistro: '',
    observacoes: '',
    photos: {},
    withPhotos: true,
  };
}
