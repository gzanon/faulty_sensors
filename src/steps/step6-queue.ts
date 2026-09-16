import { namedPhotosFromSession } from '../services/fileNaming';
import { buildSensorSqlInsert } from '../services/sqlExport';
import { canShareFiles, downloadFilesFallback, downloadPhotosFallback, shareFiles } from '../services/shareService';
import { clearQueue, loadQueue, removeFromQueue } from '../services/storage';
import type { NamedPhoto } from '../types/sensor';
import type { Navigate } from './types';

// O Chrome/Android recusa compartilhar arquivos demais numa única chamada
// (acima de ~10 já costuma falhar com "Permission denied"), então dividimos
// as fotos em lotes menores, cada um com seu próprio botão de compartilhar.
const PHOTO_BATCH_SIZE = 6;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function batchSqlFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `lote_${ts}.txt`;
}

export async function renderQueue(container: HTMLElement, navigate: Navigate): Promise<void> {
  const queue = await loadQueue();

  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-queue';

  const title = document.createElement('h2');
  title.textContent = `Fila de sensores pendentes (${queue.length})`;

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-secondary';
  backBtn.type = 'button';
  backBtn.textContent = 'Voltar ao início';
  backBtn.addEventListener('click', () => navigate('intro'));

  wrapper.append(title);

  if (queue.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'muted';
    emptyMsg.textContent = 'Nenhum sensor pendente. Use "Salvar e cadastrar outro sensor" na tela final de um cadastro para acumular aqui.';
    wrapper.append(emptyMsg, backBtn);
    container.appendChild(wrapper);
    return;
  }

  const list = document.createElement('div');
  list.className = 'field-copy-list';

  for (const entry of queue) {
    const row = document.createElement('div');
    row.className = 'field-copy-row';

    const info = document.createElement('div');
    info.className = 'field-copy-info';
    const label = document.createElement('p');
    label.className = 'field-copy-label';
    label.textContent = entry.session.idSensor;
    const value = document.createElement('p');
    value.className = 'field-copy-value';
    const photoCount = Object.keys(entry.session.photos).length;
    value.textContent = `${new Date(entry.queuedAt).toLocaleString('pt-BR')} — ${entry.session.withPhotos ? `${photoCount}/6 fotos` : 'sem fotos'}`;
    info.append(label, value);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-small btn-secondary';
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remover';
    removeBtn.addEventListener('click', async () => {
      if (!window.confirm(`Remover ${entry.session.idSensor} da fila? Isso apaga as fotos guardadas dele.`)) return;
      await removeFromQueue(entry.queueId);
      await renderQueue(container, navigate);
    });

    row.append(info, removeBtn);
    list.appendChild(row);
  }

  const photosCard = document.createElement('div');
  photosCard.className = 'card';
  const photosTitle = document.createElement('h3');
  photosTitle.textContent = 'Enviar fotos de todos ao OneDrive';

  const allPhotos: NamedPhoto[] = queue.flatMap((q) => namedPhotosFromSession(q.session));
  const photoBatches = chunk(allPhotos, PHOTO_BATCH_SIZE);

  if (photoBatches.length > 1) {
    const photosHint = document.createElement('p');
    photosHint.className = 'muted';
    photosHint.textContent = `Dividido em ${photoBatches.length} lotes de até ${PHOTO_BATCH_SIZE} fotos (o Android recusa muitos arquivos de uma vez só). Toque em cada botão.`;
    photosCard.appendChild(photosHint);
  }

  photosCard.appendChild(photosTitle);

  photoBatches.forEach((batch, index) => {
    const batchRow = document.createElement('div');
    batchRow.className = 'field-copy-row';

    const batchBtn = document.createElement('button');
    batchBtn.className = 'btn btn-primary';
    batchBtn.type = 'button';
    batchBtn.textContent =
      photoBatches.length > 1 ? `Lote ${index + 1}/${photoBatches.length} (${batch.length} fotos)` : `Compartilhar ${batch.length} fotos`;

    const batchStatus = document.createElement('p');
    batchStatus.className = 'status-text';

    batchBtn.addEventListener('click', async () => {
      batchBtn.disabled = true;

      if (!canShareFiles()) {
        batchStatus.textContent = 'Compartilhamento direto não é suportado neste navegador. Baixando fotos...';
        downloadPhotosFallback(batch);
        batchStatus.textContent = 'Fotos baixadas. Envie-as manualmente pelo app do OneDrive.';
        batchBtn.disabled = false;
        return;
      }

      const result = await shareFiles(
        batch.map((p) => ({ fileName: p.fileName, blob: p.blob, mimeType: 'image/jpeg' })),
        `Fotos dos sensores (lote ${index + 1})`,
      );
      batchBtn.disabled = false;
      if (result.status === 'shared') {
        batchStatus.textContent = 'Compartilhado com sucesso.';
        batchStatus.className = 'status-text status-success';
      } else if (result.status === 'cancelled') {
        batchStatus.textContent = 'Cancelado. Toque novamente quando quiser.';
        batchStatus.className = 'status-text';
      } else {
        batchStatus.textContent = `Erro: ${result.message ?? 'tente novamente'}.`;
        batchStatus.className = 'status-text status-error';
      }
    });

    batchRow.append(batchBtn, batchStatus);
    photosCard.appendChild(batchRow);
  });

  const sqlCard = document.createElement('div');
  sqlCard.className = 'card';
  const sqlTitle = document.createElement('h3');
  sqlTitle.textContent = 'Enviar SQL combinado de todos';
  const sqlHint = document.createElement('p');
  sqlHint.className = 'muted';
  sqlHint.textContent = `Um único arquivo .txt com o INSERT de cada um dos ${queue.length} sensores da fila.`;
  const sqlBtn = document.createElement('button');
  sqlBtn.className = 'btn btn-primary btn-large';
  sqlBtn.type = 'button';
  sqlBtn.textContent = 'Compartilhar SQL combinado';
  const sqlStatus = document.createElement('p');
  sqlStatus.className = 'status-text';
  sqlCard.append(sqlTitle, sqlHint, sqlBtn, sqlStatus);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn btn-secondary';
  clearBtn.type = 'button';
  clearBtn.textContent = 'Limpar fila (depois de confirmar o envio)';
  const clearStatus = document.createElement('p');
  clearStatus.className = 'status-text';
  clearBtn.addEventListener('click', async () => {
    if (!window.confirm('Confirma que já enviou/salvou as fotos e o SQL? Isso apaga a fila e libera espaço no celular.')) return;
    await clearQueue();
    navigate('intro');
  });

  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.append(backBtn, clearBtn);

  wrapper.append(list, photosCard, sqlCard, clearStatus, actions);
  container.appendChild(wrapper);

  sqlBtn.addEventListener('click', async () => {
    sqlBtn.disabled = true;
    const combinedSql = queue.map((q) => buildSensorSqlInsert(q.session)).join('\n');
    const sqlBlob = new Blob([combinedSql], { type: 'text/plain' });
    const sqlFile = { fileName: batchSqlFileName(), blob: sqlBlob, mimeType: 'text/plain' };

    if (!canShareFiles()) {
      sqlStatus.textContent = 'Compartilhamento direto não é suportado neste navegador. Baixando arquivo...';
      downloadFilesFallback([sqlFile]);
      sqlStatus.textContent = 'Arquivo .txt baixado. Envie-o manualmente para onde quiser.';
      sqlBtn.disabled = false;
      return;
    }

    const result = await shareFiles([sqlFile], `SQL de ${queue.length} sensores`);
    sqlBtn.disabled = false;
    if (result.status === 'shared') {
      sqlStatus.textContent = 'Arquivo SQL combinado compartilhado com sucesso.';
      sqlStatus.className = 'status-text status-success';
    } else if (result.status === 'cancelled') {
      sqlStatus.textContent = 'Compartilhamento cancelado. Toque no botão novamente quando quiser.';
      sqlStatus.className = 'status-text';
    } else {
      sqlStatus.textContent = `Erro ao compartilhar: ${result.message ?? 'tente novamente'}.`;
      sqlStatus.className = 'status-text status-error';
    }
  });
}
