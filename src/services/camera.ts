import {
  captureFrameFromVideo,
  cropCapturedPhoto,
  guideBoxFromFraction,
  resizeBlob,
  type GuideBox,
  type GuideFraction,
} from './imageResize';

const GUIDE_FRACTION = 0.65;
const FOCUS_SETTLE_MS = 500;

export interface CameraCaptureOptions {
  instructionText: string;
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

type FocusCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  pointsOfInterest?: unknown;
};

interface ImageCaptureLike {
  takePhoto: () => Promise<Blob>;
}

type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const onReady = () => {
      if (video.videoWidth > 0) {
        video.removeEventListener('loadeddata', onReady);
        resolve();
      }
    };
    video.addEventListener('loadeddata', onReady);
  });
}

/**
 * Tenta focar a câmera (foco único ou contínuo, com ponto de interesse
 * opcional) usando a Image Capture API. Retorna false silenciosamente em
 * qualquer aparelho/navegador sem suporte, sem quebrar a captura.
 */
async function triggerFocus(stream: MediaStream, pointOfInterest?: { x: number; y: number }): Promise<boolean> {
  const [track] = stream.getVideoTracks();
  if (!track || typeof track.getCapabilities !== 'function') return false;

  let capabilities: FocusCapabilities;
  try {
    capabilities = track.getCapabilities() as FocusCapabilities;
  } catch {
    return false;
  }

  const focusModes = capabilities.focusMode ?? [];
  const mode = focusModes.includes('continuous') ? 'continuous' : focusModes.includes('single-shot') ? 'single-shot' : null;
  if (!mode) return false;

  const advanced: Record<string, unknown> = { focusMode: mode };
  if (pointOfInterest && capabilities.pointsOfInterest) {
    advanced.pointsOfInterest = [pointOfInterest];
  }

  try {
    await track.applyConstraints({ advanced: [advanced] } as MediaTrackConstraints);
    return true;
  } catch {
    return false;
  }
}

/**
 * Tira a foto usando o pipeline nativo de captura da câmera (ImageCapture),
 * que costuma focar/expor melhor que um frame do preview de vídeo. Cai para
 * a captura de frame do <video> se a API não existir ou falhar.
 */
async function capturePhoto(stream: MediaStream, video: HTMLVideoElement, guideFrac: GuideFraction): Promise<Blob> {
  const [track] = stream.getVideoTracks();
  const ImageCaptureImpl = (window as unknown as { ImageCapture?: ImageCaptureCtor }).ImageCapture;

  if (track && ImageCaptureImpl) {
    try {
      const imageCapture = new ImageCaptureImpl(track);
      const photoBlob = await imageCapture.takePhoto();
      return await cropCapturedPhoto(photoBlob, guideFrac);
    } catch {
      // segue para o fallback de captura via frame do vídeo
    }
  }

  const guideBoxPixels = guideBoxFromFraction(guideFrac, video.videoWidth, video.videoHeight);
  return captureFrameFromVideo(video, guideBoxPixels);
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
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 2560 },
        height: { ideal: 1440 },
      },
      audio: false,
    });
  } catch {
    mountFileInputFallback(container, options);
    return;
  }

  const activeStream = stream;

  const wrapper = document.createElement('div');
  wrapper.className = 'camera-wrapper';

  const video = document.createElement('video');
  video.className = 'camera-video';
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.srcObject = activeStream;

  const guide = document.createElement('div');
  guide.className = 'camera-guide';
  guide.innerHTML =
    '<span class="corner corner-tl"></span><span class="corner corner-tr"></span>' +
    '<span class="corner corner-bl"></span><span class="corner corner-br"></span>';

  const focusRing = document.createElement('div');
  focusRing.className = 'camera-focus-ring';
  focusRing.hidden = true;

  const instruction = document.createElement('p');
  instruction.className = 'camera-instruction';
  instruction.textContent = options.instructionText;

  const tapHint = document.createElement('p');
  tapHint.className = 'camera-tap-hint';
  tapHint.textContent = 'Toque na tela para focar num ponto específico.';

  const controls = document.createElement('div');
  controls.className = 'camera-controls';

  const captureBtn = document.createElement('button');
  captureBtn.className = 'btn btn-primary btn-capture';
  captureBtn.type = 'button';
  captureBtn.textContent = 'Abrindo câmera...';
  captureBtn.disabled = true;

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancelar';

  controls.append(cancelBtn, captureBtn);
  wrapper.append(video, guide, focusRing, instruction, tapHint, controls);
  container.appendChild(wrapper);

  const stopStream = () => activeStream.getTracks().forEach((track) => track.stop());

  void waitForVideoReady(video).then(() => {
    captureBtn.disabled = false;
    captureBtn.textContent = 'Tirar foto';
    void triggerFocus(activeStream, { x: 0.5, y: 0.5 });
  });

  video.addEventListener('click', (event) => {
    const rect = video.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    void triggerFocus(activeStream, { x, y }).then((focused) => {
      if (focused) showFocusRing(focusRing, event.clientX - rect.left, event.clientY - rect.top);
    });
  });

  cancelBtn.addEventListener('click', () => {
    stopStream();
    options.onCancel();
  });

  captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;
    const originalLabel = captureBtn.textContent;
    captureBtn.textContent = 'Focando...';
    const focused = await triggerFocus(activeStream, { x: 0.5, y: 0.5 });
    if (focused) await wait(FOCUS_SETTLE_MS);
    captureBtn.textContent = originalLabel;

    const guideFrac = computeGuideFraction(video, wrapper);
    try {
      const blob = await capturePhoto(activeStream, video, guideFrac);
      stopStream();
      options.onCapture(blob);
    } catch {
      captureBtn.disabled = false;
    }
  });
}

function showFocusRing(ring: HTMLElement, x: number, y: number): void {
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.hidden = false;
  ring.classList.remove('camera-focus-ring-pulse');
  // força reflow para reiniciar a animação em toques consecutivos no mesmo ponto
  void ring.offsetWidth;
  ring.classList.add('camera-focus-ring-pulse');
  setTimeout(() => {
    ring.hidden = true;
  }, 600);
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

function computeGuideFraction(video: HTMLVideoElement, container: HTMLElement): GuideFraction {
  const pixelBox = computeGuideBoxInVideoSpace(video, container);
  return {
    xFrac: pixelBox.x / video.videoWidth,
    yFrac: pixelBox.y / video.videoHeight,
    sizeFrac: pixelBox.size / Math.min(video.videoWidth, video.videoHeight),
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
