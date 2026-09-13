import { getSession, resetSession } from '../state/appState';
import { FACES } from '../types/sensor';
import type { Navigate } from './types';

export function renderIntro(container: HTMLElement, navigate: Navigate): void {
  const session = getSession();
  const capturedCount = FACES.filter((f) => session.photos[f]).length;
  const hasDraft = capturedCount > 0;

  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-intro';

  const title = document.createElement('h1');
  title.textContent = 'Catalogação de Sensores Defeituosos';

  const description = document.createElement('p');
  description.className = 'muted';
  description.textContent =
    'Fotografe as 6 faces do sensor (45x45x45mm). A etiqueta com QR code identifica o sensor ' +
    'automaticamente. Depois é só compartilhar as fotos para o OneDrive e registrar na lista do SharePoint.';

  wrapper.append(title, description);

  if (hasDraft) {
    const draftBox = document.createElement('div');
    draftBox.className = 'card';

    const draftText = document.createElement('p');
    draftText.textContent = session.idSensor
      ? `Sensor em andamento: ${session.idSensor} (${capturedCount}/6 fotos)`
      : `Captura em andamento (${capturedCount}/6 fotos, ID ainda não confirmado)`;

    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'btn btn-primary';
    resumeBtn.type = 'button';
    resumeBtn.textContent = 'Continuar';
    resumeBtn.addEventListener('click', () => {
      navigate(session.idSensor ? 'faces' : 'label');
    });

    const discardBtn = document.createElement('button');
    discardBtn.className = 'btn btn-secondary';
    discardBtn.type = 'button';
    discardBtn.textContent = 'Descartar e começar novo';
    discardBtn.addEventListener('click', async () => {
      await resetSession();
      navigate('label');
    });

    draftBox.append(draftText, resumeBtn, discardBtn);
    wrapper.appendChild(draftBox);
  } else {
    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-primary btn-large';
    startBtn.type = 'button';
    startBtn.textContent = 'Começar';
    startBtn.addEventListener('click', () => navigate('label'));
    wrapper.appendChild(startBtn);
  }

  container.appendChild(wrapper);
}
