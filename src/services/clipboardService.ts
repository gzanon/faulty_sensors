import { FACES, type SensorSession } from '../types/sensor';
import { oneDriveFolderName, photoFileName } from './fileNaming';

/**
 * Gera uma linha TSV (separada por tabulação) pronta para colar na
 * visualização "Editar em Grade" da lista do SharePoint, na ordem:
 * idSensor, dataRegistro, Foto_Topo, Foto_Frente, Foto_Direita, Foto_Verso,
 * Foto_Esquerda, Foto_Base, CaminhoPasta, Observacoes.
 */
export function buildSharePointRow(session: SensorSession): string {
  const fotoColumns = FACES.map((face) => {
    const photo = session.photos[face];
    return photo ? photoFileName(session.idSensor, face, photo.capturedAt) : '';
  });
  const cells = [
    session.idSensor,
    session.dataRegistro,
    ...fotoColumns,
    oneDriveFolderName(),
    session.observacoes,
  ];
  return cells.join('\t');
}

export async function copySharePointRow(session: SensorSession): Promise<void> {
  const row = buildSharePointRow(session);
  await navigator.clipboard.writeText(row);
}
