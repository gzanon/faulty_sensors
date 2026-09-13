import { decodeQrFromBlob } from '../services/qrDecode';
import { sanitizeSensorId } from '../services/fileNaming';
import { resizeBlob } from '../services/imageResize';
import { withTimeout } from '../utils/withTimeout';
import type { Navigate } from './types';

const OCR_TIMEOUT_MS = 25_000;

export function renderOcrTest(container: HTMLElement, navigate: Navigate): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-ocr-test';

  const title = document.createElement('h2');
  title.textContent = 'Teste de QR / OCR';

  const description = document.createElement('p');
  description.className = 'muted';
  description.textContent =
    'Escolha ou tire uma foto da etiqueta para ver exatamente o que o QR e o OCR conseguem ler nela, ' +
    'sem passar pelo fluxo completo de cadastro.';

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.className = 'camera-file-input';

  const preview = document.createElement('img');
  preview.className = 'label-preview';
  preview.hidden = true;

  const resultsBox = document.createElement('div');
  resultsBox.className = 'card';
  resultsBox.hidden = true;

  const qrResult = document.createElement('p');
  const ocrTiming = document.createElement('p');
  ocrTiming.className = 'muted';
  const ocrSuggestion = document.createElement('p');
  const ocrRawLabel = document.createElement('p');
  ocrRawLabel.className = 'field-label';
  ocrRawLabel.textContent = 'Texto bruto do OCR:';
  const ocrRawPre = document.createElement('pre');
  ocrRawPre.className = 'ocr-test-raw';

  resultsBox.append(qrResult, ocrTiming, ocrSuggestion, ocrRawLabel, ocrRawPre);

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-secondary';
  backBtn.type = 'button';
  backBtn.textContent = 'Voltar ao início';
  backBtn.addEventListener('click', () => navigate('intro'));

  wrapper.append(title, description, input, preview, resultsBox, backBtn);
  container.appendChild(wrapper);

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    const blob = await resizeBlob(file);
    const url = URL.createObjectURL(blob);
    preview.src = url;
    preview.hidden = false;

    resultsBox.hidden = false;
    qrResult.textContent = 'Lendo QR code...';
    qrResult.className = '';
    ocrTiming.textContent = '';
    ocrSuggestion.textContent = '';
    ocrRawPre.textContent = '';

    const qrStart = performance.now();
    const qrText = await decodeQrFromBlob(blob);
    const qrMs = Math.round(performance.now() - qrStart);

    if (qrText) {
      qrResult.textContent = `QR encontrado (${qrMs}ms): "${qrText}" → ID sugerido: ${sanitizeSensorId(qrText)}`;
      qrResult.className = 'badge badge-success';
    } else {
      qrResult.textContent = `QR não encontrado (${qrMs}ms). Rodando OCR...`;
      qrResult.className = 'badge badge-warning';
    }

    const { ocrBlob, suggestSensorIdFromText } = await import('../services/ocr');
    const ocrStart = performance.now();
    try {
      const rawText = await withTimeout(
        ocrBlob(blob, (p) => {
          const pct = Math.round(p.progress * 100);
          ocrTiming.textContent = `OCR rodando... ${pct}% (${Math.round(performance.now() - ocrStart)}ms)`;
        }),
        OCR_TIMEOUT_MS,
        'Tempo esgotado (25s) esperando o OCR responder',
      );
      const ocrMs = Math.round(performance.now() - ocrStart);

      ocrTiming.textContent = `OCR concluído em ${ocrMs}ms.`;
      const suggestion = suggestSensorIdFromText(rawText);
      ocrSuggestion.textContent = suggestion
        ? `ID sugerido pelo OCR: ${sanitizeSensorId(suggestion)}`
        : 'OCR não conseguiu sugerir um ID a partir do texto lido.';
      ocrRawPre.textContent = rawText || '(nenhum texto reconhecido)';
    } catch (err) {
      const ocrMs = Math.round(performance.now() - ocrStart);
      ocrTiming.textContent = `OCR falhou após ${ocrMs}ms.`;
      ocrTiming.className = 'status-text status-error';
      ocrRawPre.textContent = `Erro: ${err instanceof Error ? err.message : String(err)}`;
    }
  });
}
