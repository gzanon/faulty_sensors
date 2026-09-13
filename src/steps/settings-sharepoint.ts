import { FACES } from '../types/sensor';
import {
  defaultFieldNames,
  loadSharePointConfig,
  saveSharePointConfig,
  type SharePointConfig,
} from '../services/sharePointConfig';
import type { Navigate } from './types';

function fieldRow(labelText: string, value: string): { wrapper: HTMLElement; input: HTMLInputElement } {
  const wrapper = document.createElement('div');
  const label = document.createElement('label');
  label.className = 'field-label';
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'text-input';
  input.value = value;
  wrapper.append(label, input);
  return { wrapper, input };
}

export function renderSharePointSettings(container: HTMLElement, navigate: Navigate): void {
  const existing = loadSharePointConfig();
  const fields = existing?.fields ?? defaultFieldNames();

  const wrapper = document.createElement('div');
  wrapper.className = 'screen screen-settings';

  const title = document.createElement('h2');
  title.textContent = 'Configurar link do SharePoint';

  const description = document.createElement('p');
  description.className = 'muted';
  description.textContent =
    'Preenchido uma vez só, guardado apenas neste celular (nunca é enviado para o código do app ou para o ' +
    'GitHub). Abra "+ Novo item" na sua lista do SharePoint e copie o endereço da página que abrir.';

  const urlRow = fieldRow('Endereço do formulário "Novo Item" (NewForm.aspx)', existing?.formUrl ?? '');
  urlRow.input.placeholder = 'https://suaempresa.sharepoint.com/sites/.../Lists/.../NewForm.aspx';

  const fieldsTitle = document.createElement('h3');
  fieldsTitle.textContent = 'Nomes internos das colunas';

  const fieldsHint = document.createElement('p');
  fieldsHint.className = 'muted';
  fieldsHint.textContent = 'Normalmente é o mesmo nome usado ao criar a coluna. Ajuste se o preenchimento não funcionar.';

  const idSensorRow = fieldRow('Coluna do ID do sensor', fields.idSensor);
  const dataRow = fieldRow('Coluna da data de registro', fields.dataRegistro);
  const caminhoRow = fieldRow('Coluna do caminho/pasta', fields.caminhoPasta);
  const obsRow = fieldRow('Coluna de observações', fields.observacoes);

  const faceRows = FACES.map((face) => ({
    face,
    ...fieldRow(`Coluna da foto: ${face}`, fields.fotoPorFace[face]),
  }));

  const actions = document.createElement('div');
  actions.className = 'actions';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-secondary';
  backBtn.type = 'button';
  backBtn.textContent = 'Voltar';
  backBtn.addEventListener('click', () => navigate('intro'));

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.type = 'button';
  saveBtn.textContent = 'Salvar';

  const status = document.createElement('p');
  status.className = 'status-text';

  saveBtn.addEventListener('click', () => {
    const config: SharePointConfig = {
      formUrl: urlRow.input.value.trim(),
      fields: {
        idSensor: idSensorRow.input.value.trim(),
        dataRegistro: dataRow.input.value.trim(),
        caminhoPasta: caminhoRow.input.value.trim(),
        observacoes: obsRow.input.value.trim(),
        fotoPorFace: Object.fromEntries(faceRows.map((r) => [r.face, r.input.value.trim()])) as Record<
          (typeof FACES)[number],
          string
        >,
      },
    };

    if (!config.formUrl) {
      status.textContent = 'Preencha o endereço do formulário antes de salvar.';
      status.className = 'status-text status-error';
      return;
    }

    saveSharePointConfig(config);
    status.textContent = 'Configuração salva neste celular.';
    status.className = 'status-text status-success';
  });

  actions.append(backBtn, saveBtn);
  wrapper.append(
    title,
    description,
    urlRow.wrapper,
    fieldsTitle,
    fieldsHint,
    idSensorRow.wrapper,
    dataRow.wrapper,
    caminhoRow.wrapper,
    obsRow.wrapper,
    ...faceRows.map((r) => r.wrapper),
    actions,
    status,
  );
  container.appendChild(wrapper);
}
