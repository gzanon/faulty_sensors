import { FACES, type SensorSession } from '../types/sensor';
import { oneDriveFolderName, photoFileName } from './fileNaming';
import type { SharePointConfig } from './sharePointConfig';

function formatDateForSharePoint(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  // Formato MM/DD/YYYY HH:mm, aceito pela maioria dos sites do SharePoint no preenchimento via URL.
  // Se sua lista usar outro formato regional, ajuste a data manualmente após abrir o formulário.
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Monta a URL do formulário "Novo Item" do SharePoint já com os valores
 * preenchidos via parâmetros de consulta (querystring), usando os nomes
 * internos de coluna configurados pelo usuário. A URL base e os nomes de
 * coluna ficam só no armazenamento local do aparelho — nunca no código.
 */
export function buildSharePointFormLink(session: SensorSession, config: SharePointConfig): string {
  const params = new URLSearchParams();
  params.set(config.fields.idSensor, session.idSensor);
  params.set(config.fields.dataRegistro, formatDateForSharePoint(session.dataRegistro));
  params.set(config.fields.caminhoPasta, oneDriveFolderName());
  if (session.observacoes) params.set(config.fields.observacoes, session.observacoes);

  for (const face of FACES) {
    const photo = session.photos[face];
    const fieldName = config.fields.fotoPorFace[face];
    if (photo && fieldName) {
      params.set(fieldName, photoFileName(session.idSensor, face, photo.capturedAt));
    }
  }

  const separator = config.formUrl.includes('?') ? '&' : '?';
  return `${config.formUrl}${separator}${params.toString()}`;
}
