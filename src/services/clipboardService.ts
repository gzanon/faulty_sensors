import { FACES, type SensorSession } from '../types/sensor';
import { oneDriveFolderName, photoFileName } from './fileNaming';

/**
 * Gera uma linha TSV (separada por tabulação) pronta para colar na
 * visualização "Editar em Grade" da lista do SharePoint, na ordem:
 * idSensor, dataRegistro, Foto_Topo, Foto_Frente, Foto_Direita, Foto_Verso,
 * Foto_Esquerda, Foto_Base, CaminhoPasta, Observacoes.
 *
 * Aviso: colar várias colunas de uma vez a partir de uma linha com
 * tabulação costuma não funcionar no navegador do celular (o recurso do
 * SharePoint foi feito para desktop). Nesse caso, use buildSharePointFieldList
 * para copiar/colar campo por campo.
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

export interface SharePointFieldValue {
  label: string;
  value: string;
}

/** Lista de campos e valores para copiar/colar um de cada vez no formulário "Novo Item" — confiável no celular. */
export function buildSharePointFieldList(session: SensorSession): SharePointFieldValue[] {
  const fields: SharePointFieldValue[] = [
    { label: 'idSensor', value: session.idSensor },
    { label: 'dataRegistro', value: new Date(session.dataRegistro).toLocaleString('pt-BR') },
  ];

  for (const face of FACES) {
    const photo = session.photos[face];
    if (photo) {
      fields.push({ label: `Foto_${face}`, value: photoFileName(session.idSensor, face, photo.capturedAt) });
    }
  }

  fields.push({ label: 'CaminhoPasta', value: oneDriveFolderName() });
  if (session.observacoes) fields.push({ label: 'Observacoes', value: session.observacoes });

  return fields;
}
