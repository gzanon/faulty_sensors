import { mountCameraCapture } from '../services/camera';
import { getSession, updateSession } from '../state/appState';
import type { Face } from '../types/sensor';
import type { Navigate } from './types';

const LABEL_FACE: Face = 'Topo';

export function renderLabelCapture(container: HTMLElement, navigate: Navigate): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-label';

  const title = document.createElement('h2');
  title.textContent = 'Foto da etiqueta (face Topo)';

  const description = document.createElement('p');
  description.className = 'muted';
  description.textContent =
    'Fotografe a face de Topo do sensor, onde fica a etiqueta com QR code e número de série. ' +
    'Só essa foto é usada para identificar o sensor — as outras 5 faces não precisam de QR nem texto.';

  const photoBtn = document.createElement('button');
  photoBtn.className = 'btn btn-primary btn-large';
  photoBtn.type = 'button';
  photoBtn.textContent = 'Fotografar etiqueta';

  const cameraContainer = document.createElement('div');
  cameraContainer.className = 'camera-slot';

  wrapper.append(title, description, photoBtn, cameraContainer);
  container.appendChild(wrapper);

  photoBtn.addEventListener('click', () => {
    wrapper.classList.add('capturing');

    void mountCameraCapture(cameraContainer, {
      instructionText: 'Alinhe a face "Topo" (45x45mm) com a etiqueta dentro do quadro.',
      onCancel: () => {
        cameraContainer.innerHTML = '';
        wrapper.classList.remove('capturing');
      },
      onCapture: async (blob) => {
        await updateSession({
          labelFace: LABEL_FACE,
          photos: {
            ...getSession().photos,
            [LABEL_FACE]: { face: LABEL_FACE, blob, capturedAt: new Date().toISOString() },
          },
        });
        navigate('confirm');
      },
    });
  });
}
