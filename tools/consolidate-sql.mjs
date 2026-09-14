// Consolida os arquivos .sql (um por cadastro de sensor, gerados pelo app e
// compartilhados para uma pasta local/OneDrive) em um único banco SQLite.
//
// Uso:
//   node tools/consolidate-sql.mjs <pasta-com-os-.sql> [caminho-do-banco.db]
//
// Cada arquivo .sql processado é movido para uma subpasta "importados"
// dentro da pasta de origem, para não ser importado de novo numa próxima
// execução.

import Database from 'better-sqlite3';
import { readdirSync, renameSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const [, , sourceDirArg, dbPathArg] = process.argv;

if (!sourceDirArg) {
  console.error('Uso: node tools/consolidate-sql.mjs <pasta-com-os-.sql> [caminho-do-banco.db]');
  process.exit(1);
}

const sourceDir = path.resolve(sourceDirArg);
const dbPath = path.resolve(dbPathArg ?? path.join(sourceDir, 'sensores.db'));
const importedDir = path.join(sourceDir, 'importados');

if (!existsSync(sourceDir)) {
  console.error(`Pasta não encontrada: ${sourceDir}`);
  process.exit(1);
}
mkdirSync(importedDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS sensores (
    idSensor TEXT PRIMARY KEY,
    dataRegistro TEXT,
    Foto_Topo TEXT,
    Foto_Frente TEXT,
    Foto_Direita TEXT,
    Foto_Verso TEXT,
    Foto_Esquerda TEXT,
    Foto_Base TEXT,
    CaminhoPasta TEXT,
    Observacoes TEXT
  );
`);

// O app compartilha os arquivos como .txt (o compartilhamento nativo do Android
// não permite a extensão .sql), então aceitamos as duas aqui.
const sqlFiles = readdirSync(sourceDir).filter((f) => /\.(sql|txt)$/i.test(f));

if (sqlFiles.length === 0) {
  console.log('Nenhum arquivo .sql novo encontrado em', sourceDir);
  process.exit(0);
}

let ok = 0;
let failed = 0;

for (const fileName of sqlFiles) {
  const filePath = path.join(sourceDir, fileName);
  try {
    const sql = readFileSync(filePath, 'utf8');
    db.exec(sql);
    renameSync(filePath, path.join(importedDir, fileName));
    ok += 1;
    console.log(`OK: ${fileName}`);
  } catch (err) {
    failed += 1;
    console.error(`FALHOU: ${fileName} — ${err.message}`);
  }
}

const total = db.prepare('SELECT COUNT(*) AS n FROM sensores').get().n;

console.log('---');
console.log(`Importados agora: ${ok}${failed > 0 ? `, falharam: ${failed}` : ''}`);
console.log(`Total de sensores no banco: ${total}`);
console.log(`Banco: ${dbPath}`);

db.close();
