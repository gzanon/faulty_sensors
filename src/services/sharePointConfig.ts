import type { Face } from '../types/sensor';

const STORAGE_KEY = 'faulty-sensors-sharepoint-config';

export interface SharePointFieldNames {
  idSensor: string;
  dataRegistro: string;
  caminhoPasta: string;
  observacoes: string;
  fotoPorFace: Record<Face, string>;
}

export interface SharePointConfig {
  formUrl: string;
  fields: SharePointFieldNames;
}

export function defaultFieldNames(): SharePointFieldNames {
  return {
    idSensor: 'idSensor',
    dataRegistro: 'dataRegistro',
    caminhoPasta: 'CaminhoPasta',
    observacoes: 'Observacoes',
    fotoPorFace: {
      Topo: 'Foto_Topo',
      Frente: 'Foto_Frente',
      Direita: 'Foto_Direita',
      Verso: 'Foto_Verso',
      Esquerda: 'Foto_Esquerda',
      Base: 'Foto_Base',
    },
  };
}

export function loadSharePointConfig(): SharePointConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SharePointConfig;
  } catch {
    return null;
  }
}

export function saveSharePointConfig(config: SharePointConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearSharePointConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
