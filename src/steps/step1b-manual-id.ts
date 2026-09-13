import { sanitizeSensorId } from '../services/fileNaming';
import { updateSession } from '../state/appState';
import type { Navigate } from './types';

export function renderManualId(container: HTMLElement, navigate: Navigate): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-manual-id';

  const title = document.createElement('h2');
  title.textContent = 'Cadastro sem fotos';

  const description = document.createElement('p');
  description.className = 'muted';
  description.textContent =
    'Use quando o sensor estiver extraviado e não for possível fotografá-lo. Digite o ID do sensor manualmente.';

  const fieldLabel = document.createElement('label');
  fieldLabel.className = 'field-label';
  fieldLabel.textContent = 'ID do sensor';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'text-input';
  input.placeholder = 'Digite o ID do sensor';

  const actions = document.createElement('div');
  actions.className = 'actions';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-secondary';
  backBtn.type = 'button';
  backBtn.textContent = 'Voltar';
  backBtn.addEventListener('click', () => navigate('intro'));

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn-primary';
  confirmBtn.type = 'button';
  confirmBtn.textContent = 'Confirmar';
  confirmBtn.disabled = true;

  input.addEventListener('input', () => {
    confirmBtn.disabled = input.value.trim().length === 0;
  });

  confirmBtn.addEventListener('click', async () => {
    const idSensor = sanitizeSensorId(input.value);
    if (!idSensor) return;
    await updateSession({
      idSensor,
      idSource: 'manual',
      dataRegistro: new Date().toISOString(),
      withPhotos: false,
    });
    navigate('notes');
  });

  actions.append(backBtn, confirmBtn);
  wrapper.append(title, description, fieldLabel, input, actions);
  container.appendChild(wrapper);

  input.focus();
}
