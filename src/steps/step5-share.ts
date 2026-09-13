import { namedPhotosFromSession, oneDriveFolderName } from '../services/fileNaming';
import { canShareFiles, downloadPhotosFallback, sharePhotos } from '../services/shareService';
import { buildSharePointRow, copySharePointRow } from '../services/clipboardService';
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

  const step2 = document.createElement('div');
  step2.className = 'card';
  const step2Title = document.createElement('h3');
  step2Title.textContent = 'Registrar na lista do SharePoint';
  const step2Hint = document.createElement('p');
  step2Hint.className = 'muted';
  step2Hint.textContent =
    'Copie os dados abaixo, abra a lista no navegador, mude para "Editar em Grade", clique na primeira ' +
    'célula de uma linha nova e cole.';
  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn btn-primary';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copiar dados para o SharePoint';
  const copyStatus = document.createElement('p');
  copyStatus.className = 'status-text';
  const rowPreview = document.createElement('textarea');
  rowPreview.className = 'row-preview';
  rowPreview.readOnly = true;
  rowPreview.value = buildSharePointRow(session);
  step2.append(step2Title, step2Hint, copyBtn, copyStatus, rowPreview);

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
  wrapper.append(title, summary);
  if (session.withPhotos) wrapper.appendChild(step1);
  wrapper.append(step2, finalActions);
  container.appendChild(wrapper);

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

  copyBtn.addEventListener('click', async () => {
    try {
      await copySharePointRow(session);
      copyStatus.textContent = 'Copiado! Cole na lista do SharePoint.';
      copyStatus.className = 'status-text status-success';
    } catch {
      copyStatus.textContent = 'Não foi possível copiar automaticamente. Selecione o texto abaixo e copie manualmente.';
      copyStatus.className = 'status-text status-error';
      rowPreview.focus();
      rowPreview.select();
    }
  });
}
