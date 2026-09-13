import { mountCameraCapture } from '../services/camera';
import { getSession, updateSession } from '../state/appState';
import { FACES } from '../types/sensor';
import type { Navigate } from './types';

export function renderCaptureFaces(container: HTMLElement, navigate: Navigate): void {
  const session = getSession();
  const remaining = FACES.filter((f) => !session.photos[f]);

  if (remaining.length === 0) {
    navigate('review');
    return;
  }

  const face = remaining[0];
  const doneCount = FACES.length - remaining.length;

  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-faces';

  const title = document.createElement('h2');
  title.textContent = `Face ${doneCount + 1} de ${FACES.length}: ${face}`;

  const progress = document.createElement('p');
  progress.className = 'muted';
  progress.textContent = `Sensor ${session.idSensor} — ${doneCount}/${FACES.length} fotos concluídas.`;

  const cameraContainer = document.createElement('div');
  cameraContainer.className = 'camera-slot';

  wrapper.append(title, progress, cameraContainer);
  container.appendChild(wrapper);

  mountCameraCapture(cameraContainer, {
    instructionText: `Enquadre a face "${face}" do sensor preenchendo bem a foto.`,
    onCancel: () => navigate('review'),
    onCapture: async (blob) => {
      await updateSession({
        photos: {
          ...getSession().photos,
          [face]: { face, blob, capturedAt: new Date().toISOString() },
        },
      });
      navigate('faces');
    },
  });
}
