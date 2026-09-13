import { getSession, updateSession } from '../state/appState';
import { FACES, type Face } from '../types/sensor';
import type { Navigate } from './types';

export function renderReview(container: HTMLElement, navigate: Navigate): void {
  const session = getSession();
  const missing = FACES.filter((f) => !session.photos[f]);
  const objectUrls: string[] = [];

  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-review';

  const title = document.createElement('h2');
  title.textContent = 'Revisão das fotos';

  const subtitle = document.createElement('p');
  subtitle.className = 'muted';
  subtitle.textContent = `Sensor ${session.idSensor}`;

  const grid = document.createElement('div');
  grid.className = 'review-grid';

  for (const face of FACES) {
    const cell = document.createElement('div');
    cell.className = 'review-cell';

    const label = document.createElement('p');
    label.className = 'review-cell-label';
    label.textContent = face;
    cell.appendChild(label);

    const photo = session.photos[face];
    if (photo) {
      const url = URL.createObjectURL(photo.blob);
      objectUrls.push(url);
      const img = document.createElement('img');
      img.className = 'review-thumb';
      img.src = url;
      cell.appendChild(img);

      const retakeBtn = document.createElement('button');
      retakeBtn.className = 'btn btn-small btn-secondary';
      retakeBtn.type = 'button';
      retakeBtn.textContent = 'Refazer';
      retakeBtn.addEventListener('click', () => void retakeFace(face));
      cell.appendChild(retakeBtn);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'review-placeholder';
      placeholder.textContent = 'Faltando';
      cell.appendChild(placeholder);
    }

    grid.appendChild(cell);
  }

  const actions = document.createElement('div');
  actions.className = 'actions';

  const continueBtn = document.createElement('button');
  continueBtn.className = 'btn btn-primary btn-large';
  continueBtn.type = 'button';
  continueBtn.disabled = missing.length > 0;
  continueBtn.textContent = missing.length > 0 ? `Faltam ${missing.length} fotos` : 'Continuar para compartilhar';
  continueBtn.addEventListener('click', () => {
    cleanupUrls();
    navigate('share');
  });

  if (missing.length > 0) {
    const captureMissingBtn = document.createElement('button');
    captureMissingBtn.className = 'btn btn-secondary';
    captureMissingBtn.type = 'button';
    captureMissingBtn.textContent = 'Fotografar faces restantes';
    captureMissingBtn.addEventListener('click', () => {
      cleanupUrls();
      navigate('faces');
    });
    actions.appendChild(captureMissingBtn);
  }

  actions.appendChild(continueBtn);
  wrapper.append(title, subtitle, grid, actions);
  container.appendChild(wrapper);

  function cleanupUrls(): void {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
  }

  async function retakeFace(face: Face): Promise<void> {
    const current = getSession();
    const photos = { ...current.photos };
    delete photos[face];
    await updateSession({ photos });
    cleanupUrls();
    navigate(face === current.labelFace ? 'label' : 'faces');
  }
}
