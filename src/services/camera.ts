import { captureFrameFromVideo, resizeBlob, type GuideBox } from './imageResize';

const GUIDE_FRACTION = 0.65;

export interface CameraCaptureOptions {
  instructionText: string;
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

/**
 * Monta uma UI de câmera ao vivo em tela cheia com um quadrado-guia
 * centralizado (calibrado para a face de 45x45mm do sensor). Se
 * getUserMedia falhar, cai para um <input capture> nativo sem overlay.
 */
export async function mountCameraCapture(container: HTMLElement, options: CameraCaptureOptions): Promise<void> {
  container.innerHTML = '';

  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
  } catch {
    mountFileInputFallback(container, options);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'camera-wrapper';

  const video = document.createElement('video');
  video.className = 'camera-video';
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.srcObject = stream;

  const guide = document.createElement('div');
  guide.className = 'camera-guide';
  guide.innerHTML =
    '<span class="corner corner-tl"></span><span class="corner corner-tr"></span>' +
    '<span class="corner corner-bl"></span><span class="corner corner-br"></span>';

  const instruction = document.createElement('p');
  instruction.className = 'camera-instruction';
  instruction.textContent = options.instructionText;

  const controls = document.createElement('div');
  controls.className = 'camera-controls';

  const captureBtn = document.createElement('button');
  captureBtn.className = 'btn btn-primary btn-capture';
  captureBtn.type = 'button';
  captureBtn.textContent = 'Tirar foto';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancelar';

  controls.append(cancelBtn, captureBtn);
  wrapper.append(video, guide, instruction, controls);
  container.appendChild(wrapper);

  const stopStream = () => stream?.getTracks().forEach((track) => track.stop());

  cancelBtn.addEventListener('click', () => {
    stopStream();
    options.onCancel();
  });

  captureBtn.addEventListener('click', async () => {
    const guideBox = computeGuideBoxInVideoSpace(video, wrapper);
    captureBtn.disabled = true;
    try {
      const blob = await captureFrameFromVideo(video, guideBox);
      stopStream();
      options.onCapture(blob);
    } catch {
      captureBtn.disabled = false;
    }
  });
}

function computeGuideBoxInVideoSpace(video: HTMLVideoElement, container: HTMLElement): GuideBox {
  const containerRect = container.getBoundingClientRect();
  const scale = Math.min(containerRect.width / video.videoWidth, containerRect.height / video.videoHeight);
  const renderedW = video.videoWidth * scale;
  const renderedH = video.videoHeight * scale;
  const offsetX = (containerRect.width - renderedW) / 2;
  const offsetY = (containerRect.height - renderedH) / 2;

  const guideSizeCss = Math.min(containerRect.width, containerRect.height) * GUIDE_FRACTION;
  const guideXCss = (containerRect.width - guideSizeCss) / 2;
  const guideYCss = (containerRect.height - guideSizeCss) / 2;

  return {
    x: (guideXCss - offsetX) / scale,
    y: (guideYCss - offsetY) / scale,
    size: guideSizeCss / scale,
  };
}

function mountFileInputFallback(container: HTMLElement, options: CameraCaptureOptions): void {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'camera-fallback';

  const notice = document.createElement('p');
  notice.className = 'camera-fallback-notice';
  notice.textContent =
    'Não foi possível abrir a câmera com guia de enquadramento. Use o app de câmera do celular e tente ' +
    'centralizar a face do sensor (45x45mm) no quadro.';

  const instruction = document.createElement('p');
  instruction.className = 'camera-instruction';
  instruction.textContent = options.instructionText;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.className = 'camera-file-input';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', () => options.onCancel());

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const blob = await resizeBlob(file);
    options.onCapture(blob);
  });

  wrapper.append(notice, instruction, input, cancelBtn);
  container.appendChild(wrapper);
}
