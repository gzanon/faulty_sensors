import { FACES, type SensorSession } from '../types/sensor';
import { oneDriveFolderName, photoFileName, sanitizeSensorId } from './fileNaming';

export const SQL_TABLE_NAME = 'sensores';

/** Escapa aspas simples para uso em um literal de texto SQL (padrão SQLite/ANSI). */
function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function sqlLiteral(value: string): string {
  return `'${sqlEscape(value)}'`;
}

/**
 * Gera um comando INSERT OR REPLACE (SQLite) com os dados do sensor — usa
 * idSensor como chave, então importar o mesmo sensor de novo substitui o
 * registro anterior em vez de duplicar.
 */
export function buildSensorSqlInsert(session: SensorSession): string {
  const columns = [
    'idSensor',
    'dataRegistro',
    ...FACES.map((face) => `Foto_${face}`),
    'CaminhoPasta',
    'Observacoes',
  ];

  const values = [
    session.idSensor,
    session.dataRegistro,
    ...FACES.map((face) => {
      const photo = session.photos[face];
      return photo ? photoFileName(session.idSensor, face, photo.capturedAt) : '';
    }),
    oneDriveFolderName(),
    session.observacoes,
  ];

  const columnList = columns.join(', ');
  const valueList = values.map(sqlLiteral).join(', ');

  return `INSERT OR REPLACE INTO ${SQL_TABLE_NAME} (${columnList})\nVALUES (${valueList});\n`;
}

/**
 * A extensão do arquivo compartilhado é .txt (não .sql) de propósito: o
 * compartilhamento nativo de arquivos do Chrome/Android só permite uma
 * lista fixa de extensões consideradas seguras, e .sql fica de fora dela —
 * o conteúdo continua sendo um comando SQL válido, só o nome do arquivo muda.
 */
export function sqlExportFileName(session: SensorSession): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = new Date(session.dataRegistro || Date.now());
  const timestamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${sanitizeSensorId(session.idSensor)}_${timestamp}.txt`;
}
