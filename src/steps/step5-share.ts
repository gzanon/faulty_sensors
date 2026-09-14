import { namedPhotosFromSession, oneDriveFolderName } from '../services/fileNaming';
import { canShareFiles, downloadFilesFallback, downloadPhotosFallback, shareFiles, sharePhotos } from '../services/shareService';
import { buildSensorSqlInsert, sqlExportFileName } from '../services/sqlExport';
import { addToQueue } from '../services/storage';
import { getSession, resetSession } from '../state/appState';
import { FACES } from '../types/sensor';
import type { Navigate } from './types';

export function renderShare(container: HTMLElement, navigate: Navigate): void {
  const session = getSession();
  const namedPhotos = namedPhotosFromSession(session);

  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-share';

  const title = document.createElement('h2');
  title.textContent = 'Compartilhar e registrar';

  const summary = document.createElement('div');
  summary.className = 'card';
  const summaryTitle = document.createElement('p');
  summaryTitle.innerHTML = `<strong>Sensor:</strong> ${session.idSensor}`;
  const summaryDate = document.createElement('p');
  summaryDate.innerHTML = `<strong>Data:</strong> ${new Date(session.dataRegistro).toLocaleString('pt-BR')}`;
  summary.append(summaryTitle, summaryDate);

  if (session.withPhotos) {
    const fileList = document.createElement('ul');
    fileList.className = 'file-list';
    for (const face of FACES) {
      const item = document.createElement('li');
      const named = namedPhotos.find((p) => p.face === face);
      item.textContent = named ? named.fileName : `${face}: faltando`;
      fileList.appendChild(item);
    }
    summary.appendChild(fileList);
  } else {
    const noPhotosNote = document.createElement('p');
    noPhotosNote.className = 'muted';
    noPhotosNote.textContent = 'Cadastro sem fotos (sensor extraviado).';
    summary.appendChild(noPhotosNote);
  }

  if (session.observacoes) {
    const summaryObs = document.createElement('p');
    const obsLabel = document.createElement('strong');
    obsLabel.textContent = 'Observações: ';
    summaryObs.append(obsLabel, document.createTextNode(session.observacoes));
    summary.appendChild(summaryObs);
  }

  const batchCard = document.createElement('div');
  batchCard.className = 'card';
  const batchTitle = document.createElement('h3');
  batchTitle.textContent = 'Catalogando vários sensores?';
  const batchHint = document.createElement('p');
  batchHint.className = 'muted';
  batchHint.textContent =
    'Guarda este cadastro (fotos incluídas) neste celular e já parte para o próximo sensor, sem compartilhar ' +
    'agora. Depois, na fila de sensores pendentes, compartilha tudo de uma vez.';
  const batchBtn = document.createElement('button');
  batchBtn.className = 'btn btn-primary btn-large';
  batchBtn.type = 'button';
  batchBtn.textContent = 'Salvar e cadastrar outro sensor';
  const batchStatus = document.createElement('p');
  batchStatus.className = 'status-text';
  batchCard.append(batchTitle, batchHint, batchBtn, batchStatus);

  const step1 = document.createElement('div');
  step1.className = 'card';
  const step1Title = document.createElement('h3');
  step1Title.textContent = 'Enviar fotos ao OneDrive';
  const step1Hint = document.createElement('p');
  step1Hint.className = 'muted';
  step1Hint.textContent = `No menu que abrir, escolha o app OneDrive e selecione a pasta "${oneDriveFolderName()}".`;
  const shareBtn = document.createElement('button');
  shareBtn.className = 'btn btn-primary btn-large';
  shareBtn.type = 'button';
  shareBtn.textContent = 'Compartilhar 6 fotos';
  const shareStatus = document.createElement('p');
  shareStatus.className = 'status-text';
  step1.append(step1Title, step1Hint, shareBtn, shareStatus);

  const sqlCard = document.createElement('div');
  sqlCard.className = 'card';
  const sqlTitle = document.createElement('h3');
  sqlTitle.textContent = 'Compartilhar arquivo SQL';
  const sqlHint = document.createElement('p');
  sqlHint.className = 'muted';
  sqlHint.textContent =
    'Gera um arquivo .txt com o comando SQL deste cadastro para enviar a uma pasta fora do celular (ex: OneDrive).';
  const sqlBtn = document.createElement('button');
  sqlBtn.className = 'btn btn-primary btn-large';
  sqlBtn.type = 'button';
  sqlBtn.textContent = 'Compartilhar arquivo SQL';
  const sqlStatus = document.createElement('p');
  sqlStatus.className = 'status-text';
  sqlCard.append(sqlTitle, sqlHint, sqlBtn, sqlStatus);

  const finalActions = document.createElement('div');
  finalActions.className = 'actions';

  const homeBtn = document.createElement('button');
  homeBtn.className = 'btn btn-secondary';
  homeBtn.type = 'button';
  homeBtn.textContent = 'Início';
  homeBtn.addEventListener('click', () => navigate('intro'));

  const finishBtn = document.createElement('button');
  finishBtn.className = 'btn btn-secondary';
  finishBtn.type = 'button';
  finishBtn.textContent = 'Novo sensor';
  finishBtn.addEventListener('click', async () => {
    await resetSession();
    navigate('intro');
  });

  finalActions.append(homeBtn, finishBtn);
  wrapper.append(title, summary, batchCard);
  if (session.withPhotos) wrapper.appendChild(step1);
  wrapper.append(sqlCard, finalActions);
  container.appendChild(wrapper);

  batchBtn.addEventListener('click', async () => {
    batchBtn.disabled = true;
    await addToQueue(session);
    await resetSession();
    navigate('intro');
  });

  shareBtn.addEventListener('click', async () => {
    shareBtn.disabled = true;
    if (!canShareFiles()) {
      shareStatus.textContent = 'Compartilhamento direto não é suportado neste navegador. Baixando fotos...';
      downloadPhotosFallback(namedPhotos);
      shareStatus.textContent = 'Fotos baixadas. Envie-as manualmente pelo app do OneDrive.';
      shareBtn.disabled = false;
      return;
    }

    const result = await sharePhotos(namedPhotos);
    shareBtn.disabled = false;
    if (result.status === 'shared') {
      shareStatus.textContent = 'Fotos compartilhadas com sucesso.';
      shareStatus.className = 'status-text status-success';
    } else if (result.status === 'cancelled') {
      shareStatus.textContent = 'Compartilhamento cancelado. Toque no botão novamente quando quiser.';
      shareStatus.className = 'status-text';
    } else {
      shareStatus.textContent = `Erro ao compartilhar: ${result.message ?? 'tente novamente'}.`;
      shareStatus.className = 'status-text status-error';
    }
  });

  sqlBtn.addEventListener('click', async () => {
    sqlBtn.disabled = true;
    // Usa text/plain (não "application/sql") porque a maioria dos apps do Android
    // (OneDrive, e-mail, etc.) só registra recebimento de tipos MIME comuns;
    // um tipo pouco usado faz o compartilhamento falhar com "Permission denied".
    const sqlBlob = new Blob([buildSensorSqlInsert(session)], { type: 'text/plain' });
    const sqlFile = { fileName: sqlExportFileName(session), blob: sqlBlob, mimeType: 'text/plain' };

    if (!canShareFiles()) {
      sqlStatus.textContent = 'Compartilhamento direto não é suportado neste navegador. Baixando arquivo...';
      downloadFilesFallback([sqlFile]);
      sqlStatus.textContent = 'Arquivo .sql baixado. Envie-o manualmente para onde quiser.';
      sqlBtn.disabled = false;
      return;
    }

    const result = await shareFiles([sqlFile], `SQL do sensor ${session.idSensor}`);
    sqlBtn.disabled = false;
    if (result.status === 'shared') {
      sqlStatus.textContent = 'Arquivo SQL compartilhado com sucesso.';
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
