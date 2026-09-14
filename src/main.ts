import './style.css';
import { restoreDraftIfAny } from './state/appState';
import { renderIntro } from './steps/step0-intro';
import { renderManualId } from './steps/step1b-manual-id';
import { renderLabelCapture } from './steps/step1-label';
import { renderConfirmId } from './steps/step2-confirm-id';
import { renderCaptureFaces } from './steps/step3-capture-faces';
import { renderReview } from './steps/step4-review';
import { renderNotes } from './steps/step4b-notes';
import { renderShare } from './steps/step5-share';
import { renderQueue } from './steps/step6-queue';
import type { Navigate, Step } from './steps/types';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Elemento #app não encontrado');

const navigate: Navigate = (step: Step) => {
  app.innerHTML = '';
  switch (step) {
    case 'intro':
      void renderIntro(app, navigate);
      break;
    case 'manualId':
      renderManualId(app, navigate);
      break;
    case 'label':
      renderLabelCapture(app, navigate);
      break;
    case 'confirm':
      renderConfirmId(app, navigate);
      break;
    case 'faces':
      renderCaptureFaces(app, navigate);
      break;
    case 'review':
      renderReview(app, navigate);
      break;
    case 'notes':
      renderNotes(app, navigate);
      break;
    case 'share':
      renderShare(app, navigate);
      break;
    case 'queue':
      void renderQueue(app, navigate);
      break;
  }
};

async function bootstrap(): Promise<void> {
  await restoreDraftIfAny();
  navigate('intro');
}

void bootstrap();
