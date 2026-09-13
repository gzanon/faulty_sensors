import { resizeBlob } from './imageResize';

export interface CameraCaptureOptions {
  instructionText: string;
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

/**
 * Abre o app de câmera nativo do celular via <input capture>, em vez de um
 * preview de vídeo dentro do navegador (getUserMedia). O app nativo já
 * resolve foco, exposição e qualidade de foto de forma muito mais confiável
 * do que qualquer controle que o navegador exponha via API web.
 */
export function mountCameraCapture(container: HTMLElement, options: CameraCaptureOptions): void {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'camera-native';

  const instruction = document.createElement('p');
  instruction.className = 'camera-native-instruction';
  instruction.textContent = options.instructionText;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.className = 'camera-file-input';
  input.hidden = true;

  const photoBtn = document.createElement('button');
  photoBtn.className = 'btn btn-primary btn-large';
  photoBtn.type = 'button';
  photoBtn.textContent = 'Abrir câmera';

  const status = document.createElement('p');
  status.className = 'status-text';

  const actions = document.createElement('div');
  actions.className = 'actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', () => options.onCancel());

  actions.append(cancelBtn, photoBtn);
  wrapper.append(instruction, input, actions, status);
  container.appendChild(wrapper);

  photoBtn.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    photoBtn.disabled = true;
    status.textContent = 'Processando foto...';
    try {
      const blob = await resizeBlob(file);
      options.onCapture(blob);
    } catch {
      status.textContent = 'Não foi possível processar a foto. Tente novamente.';
      status.className = 'status-text status-error';
      photoBtn.disabled = false;
    }
  });
}
