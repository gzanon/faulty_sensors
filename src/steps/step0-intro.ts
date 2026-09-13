import { getSession, resetSession } from '../state/appState';
import { FACES } from '../types/sensor';
import type { Navigate } from './types';

export function renderIntro(container: HTMLElement, navigate: Navigate): void {
  const session = getSession();
  const capturedCount = FACES.filter((f) => session.photos[f]).length;
  const hasDraft = capturedCount > 0 || session.idSensor !== '';

  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-intro';

  const title = document.createElement('h1');
  title.textContent = 'Catalogação de Sensores Defeituosos';

  const description = document.createElement('p');
  description.className = 'muted';
  description.textContent =
    'Fotografe as 6 faces do sensor. A etiqueta com QR code identifica o sensor automaticamente. ' +
    'Depois é só compartilhar as fotos para o OneDrive e registrar na lista do SharePoint.';

  wrapper.append(title, description);

  if (hasDraft) {
    const draftBox = document.createElement('div');
    draftBox.className = 'card';

    const draftText = document.createElement('p');
    draftText.textContent = session.idSensor
      ? `Sensor em andamento: ${session.idSensor}${session.withPhotos ? ` (${capturedCount}/6 fotos)` : ' (sem fotos)'}`
      : `Captura em andamento (${capturedCount}/6 fotos, ID ainda não confirmado)`;

    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'btn btn-primary';
    resumeBtn.type = 'button';
    resumeBtn.textContent = 'Continuar';
    resumeBtn.addEventListener('click', () => {
      if (!session.idSensor) {
        navigate('label');
      } else if (!session.withPhotos) {
        navigate('notes');
      } else {
        navigate('faces');
      }
    });

    const discardBtn = document.createElement('button');
    discardBtn.className = 'btn btn-secondary';
    discardBtn.type = 'button';
    discardBtn.textContent = 'Descartar e começar novo';
    discardBtn.addEventListener('click', async () => {
      await resetSession();
      navigate('intro');
    });

    draftBox.append(draftText, resumeBtn, discardBtn);
    wrapper.appendChild(draftBox);
  } else {
    const actions = document.createElement('div');
    actions.className = 'actions';

    const startWithPhotosBtn = document.createElement('button');
    startWithPhotosBtn.className = 'btn btn-primary btn-large';
    startWithPhotosBtn.type = 'button';
    startWithPhotosBtn.textContent = 'Novo sensor (com fotos)';
    startWithPhotosBtn.addEventListener('click', () => navigate('label'));

    const startWithoutPhotosBtn = document.createElement('button');
    startWithoutPhotosBtn.className = 'btn btn-secondary btn-large';
    startWithoutPhotosBtn.type = 'button';
    startWithoutPhotosBtn.textContent = 'Cadastrar apenas o ID (sem fotos)';
    startWithoutPhotosBtn.addEventListener('click', () => navigate('manualId'));

    actions.append(startWithPhotosBtn, startWithoutPhotosBtn);
    wrapper.appendChild(actions);
  }

  const ocrTestLink = document.createElement('button');
  ocrTestLink.className = 'btn btn-small btn-secondary';
  ocrTestLink.type = 'button';
  ocrTestLink.textContent = 'Testar leitura de QR / OCR';
  ocrTestLink.addEventListener('click', () => navigate('ocrTest'));
  wrapper.appendChild(ocrTestLink);

  container.appendChild(wrapper);
}
