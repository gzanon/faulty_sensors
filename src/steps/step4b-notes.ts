import { getSession, updateSession } from '../state/appState';
import type { Navigate } from './types';

export function renderNotes(container: HTMLElement, navigate: Navigate): void {
  const session = getSession();

  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-notes';

  const title = document.createElement('h2');
  title.textContent = 'Observações (opcional)';

  const description = document.createElement('p');
  description.className = 'muted';
  description.textContent =
    'Adicione qualquer comentário sobre o defeito ou o estado do sensor. Esse texto também é salvo na lista do SharePoint.';

  const textarea = document.createElement('textarea');
  textarea.className = 'notes-textarea';
  textarea.rows = 6;
  textarea.placeholder = 'Ex: sensor com corrosão no conector, carcaça trincada...';
  textarea.value = session.observacoes;

  const actions = document.createElement('div');
  actions.className = 'actions';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-secondary';
  backBtn.type = 'button';
  backBtn.textContent = 'Voltar';
  backBtn.addEventListener('click', () => navigate('review'));

  const continueBtn = document.createElement('button');
  continueBtn.className = 'btn btn-primary btn-large';
  continueBtn.type = 'button';
  continueBtn.textContent = 'Continuar';
  continueBtn.addEventListener('click', async () => {
    await updateSession({ observacoes: textarea.value.trim() });
    navigate('share');
  });

  actions.append(backBtn, continueBtn);
  wrapper.append(title, description, textarea, actions);
  container.appendChild(wrapper);
}
