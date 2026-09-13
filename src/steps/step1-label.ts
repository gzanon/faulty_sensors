import { mountCameraCapture } from '../services/camera';
import { getSession, updateSession } from '../state/appState';
import { FACES, type Face } from '../types/sensor';
import type { Navigate } from './types';

export function renderLabelCapture(container: HTMLElement, navigate: Navigate): void {
  const session = getSession();

  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-label';

  const title = document.createElement('h2');
  title.textContent = 'Foto da etiqueta';

  const description = document.createElement('p');
  description.className = 'muted';
  description.textContent =
    'Escolha qual face do sensor tem a etiqueta com QR code e número de série, depois fotografe essa face primeiro.';

  const selectorLabel = document.createElement('label');
  selectorLabel.className = 'field-label';
  selectorLabel.textContent = 'Face com a etiqueta';

  const select = document.createElement('select');
  select.className = 'select';
  for (const face of FACES) {
    const opt = document.createElement('option');
    opt.value = face;
    opt.textContent = face;
    if (face === session.labelFace) opt.selected = true;
    select.appendChild(opt);
  }

  const photoBtn = document.createElement('button');
  photoBtn.className = 'btn btn-primary btn-large';
  photoBtn.type = 'button';
  photoBtn.textContent = 'Fotografar etiqueta';

  const cameraContainer = document.createElement('div');
  cameraContainer.className = 'camera-slot';

  wrapper.append(title, description, selectorLabel, select, photoBtn, cameraContainer);
  container.appendChild(wrapper);

  photoBtn.addEventListener('click', () => {
    const labelFace = select.value as Face;
    wrapper.classList.add('capturing');

    void mountCameraCapture(cameraContainer, {
      instructionText: `Alinhe a face "${labelFace}" (45x45mm) com a etiqueta dentro do quadro.`,
      onCancel: () => {
        cameraContainer.innerHTML = '';
        wrapper.classList.remove('capturing');
      },
      onCapture: async (blob) => {
        await updateSession({
          labelFace,
          photos: {
            ...getSession().photos,
            [labelFace]: { face: labelFace, blob, capturedAt: new Date().toISOString() },
          },
        });
        navigate('confirm');
      },
    });
  });
}
