import { decodeQrFromBlob } from '../services/qrDecode';
import { sanitizeSensorId } from '../services/fileNaming';
import { getSession, updateSession } from '../state/appState';
import type { IdSource } from '../types/sensor';
import type { Navigate } from './types';

const OCR_TIMEOUT_MS = 25_000;

const OCR_STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'carregando mecanismo de OCR',
  'initializing tesseract': 'inicializando OCR',
  'loading language traineddata': 'carregando idioma',
  'initializing api': 'preparando OCR',
  'recognizing text': 'lendo texto',
};

function describeOcrStatus(status: string): string {
  return OCR_STATUS_LABELS[status] ?? status;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tempo esgotado ao processar OCR')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

export function renderConfirmId(container: HTMLElement, navigate: Navigate): void {
  const session = getSession();
  const photo = session.photos[session.labelFace];

  if (!photo) {
    navigate('label');
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-confirm';

  const title = document.createElement('h2');
  title.textContent = 'Confirme o ID do sensor';

  const imgUrl = URL.createObjectURL(photo.blob);
  const preview = document.createElement('img');
  preview.className = 'label-preview';
  preview.src = imgUrl;
  preview.alt = 'Foto da etiqueta';

  const badge = document.createElement('p');
  badge.className = 'badge badge-pending';
  badge.textContent = 'Analisando etiqueta...';

  const fieldLabel = document.createElement('label');
  fieldLabel.className = 'field-label';
  fieldLabel.textContent = 'ID do sensor (edite ou digite manualmente a qualquer momento)';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'text-input';
  input.placeholder = 'Aguardando leitura automática...';

  const rawTextDetails = document.createElement('details');
  rawTextDetails.className = 'raw-ocr-details';
  rawTextDetails.hidden = true;
  const rawTextSummary = document.createElement('summary');
  rawTextSummary.textContent = 'Ver texto bruto lido por OCR';
  const rawTextPre = document.createElement('pre');
  rawTextDetails.append(rawTextSummary, rawTextPre);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const retryBtn = document.createElement('button');
  retryBtn.className = 'btn btn-secondary';
  retryBtn.type = 'button';
  retryBtn.textContent = 'Tirar a foto de novo';
  retryBtn.addEventListener('click', () => {
    URL.revokeObjectURL(imgUrl);
    navigate('label');
  });

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn-primary';
  confirmBtn.type = 'button';
  confirmBtn.textContent = 'Confirmar';
  confirmBtn.disabled = true;

  actions.append(retryBtn, confirmBtn);
  wrapper.append(title, preview, badge, fieldLabel, input, rawTextDetails, actions);
  container.appendChild(wrapper);

  let idSource: IdSource = 'manual';

  input.addEventListener('input', () => {
    idSource = 'manual';
    confirmBtn.disabled = input.value.trim().length === 0;
  });

  confirmBtn.addEventListener('click', async () => {
    const idSensor = sanitizeSensorId(input.value);
    if (!idSensor) return;
    URL.revokeObjectURL(imgUrl);
    await updateSession({ idSensor, idSource, dataRegistro: new Date().toISOString() });
    navigate('faces');
  });

  void identifySensor();

  async function identifySensor(): Promise<void> {
    try {
      const qrText = await decodeQrFromBlob(photo!.blob);
      if (qrText) {
        idSource = 'qr';
        badge.textContent = 'Lido via QR Code';
        badge.className = 'badge badge-success';
        input.value = sanitizeSensorId(qrText);
        confirmBtn.disabled = input.value.trim().length === 0;
        return;
      }

      badge.textContent = 'QR não encontrado, tentando OCR (pode levar alguns segundos)...';
      const { ocrBlob, suggestSensorIdFromText } = await import('../services/ocr');

      const rawText = await withTimeout(
        ocrBlob(photo!.blob, (p) => {
          const pct = Math.round(p.progress * 100);
          badge.textContent = `OCR: ${describeOcrStatus(p.status)} (${pct}%)`;
        }),
        OCR_TIMEOUT_MS,
      );

      const suggestion = suggestSensorIdFromText(rawText);
      idSource = 'ocr';
      badge.textContent = 'Sugestão via OCR — menos confiável, confira com atenção';
      badge.className = 'badge badge-warning';
      input.value = sanitizeSensorId(suggestion ?? '');
      input.placeholder = suggestion ? '' : 'Não foi possível sugerir um ID, digite manualmente';
      confirmBtn.disabled = input.value.trim().length === 0;

      if (rawText) {
        rawTextPre.textContent = rawText;
        rawTextDetails.hidden = false;
      }
    } catch {
      badge.textContent = 'Não foi possível identificar automaticamente. Digite o ID manualmente.';
      badge.className = 'badge badge-warning';
      input.placeholder = 'Digite o ID do sensor';
      input.focus();
    }
  }
}
