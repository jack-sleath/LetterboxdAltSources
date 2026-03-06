/**
 * Letterboxd Alternative Sources — Options Page
 */

// ---------------------------------------------------------------------------
// URL generation (mirrors content.js logic)
// ---------------------------------------------------------------------------

function buildUrl(source, title, year) {
  let query = title;
  if (source.punctuationToSpaces) query = query.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (source.removePunctuation) query = query.replace(/[^\w\s]/g, '');
  if (source.addYear && year) query += ` ${year}`;

  if (source.encodeUrlParams) {
    query = encodeURIComponent(query);
    if (source.spacesToPlus) query = query.replace(/%20/g, '+');
  } else if (source.spacesToPlus) {
    query = query.replace(/\s+/g, '+');
  }

  return source.baseUrl + query;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadSources() {
  return new Promise((resolve) =>
    chrome.storage.local.get('sources', ({ sources }) => resolve(sources || []))
  );
}

function saveSources(sources) {
  return new Promise((resolve) => chrome.storage.local.set({ sources }, resolve));
}

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const sourceList = document.getElementById('source-list');
const emptyMessage = document.getElementById('empty-message');
const btnAdd = document.getElementById('btn-add');
const wizardSection = document.getElementById('wizard-section');
const wizardTitle = document.getElementById('wizard-title');
const wizardForm = document.getElementById('wizard-form');
const editIdInput = document.getElementById('edit-id');
const fieldName = document.getElementById('field-name');
const fieldBaseUrl = document.getElementById('field-base-url');
const fieldIconUrl = document.getElementById('field-icon-url');
const optEncode = document.getElementById('opt-encode');
const optSpacesToPlus = document.getElementById('opt-spaces-to-plus');
const optAddYear = document.getElementById('opt-add-year');
const optRemovePunct = document.getElementById('opt-remove-punct');
const optPunctToSpaces = document.getElementById('opt-punct-to-spaces');
const previewUrl = document.getElementById('preview-url');
const previewTitle = document.getElementById('preview-title');
const previewYear = document.getElementById('preview-year');
const btnCancel = document.getElementById('btn-cancel');
const wizardError = document.getElementById('wizard-error');

// ---------------------------------------------------------------------------
// Source list rendering
// ---------------------------------------------------------------------------

function renderSources(sources) {
  sourceList.innerHTML = '';

  if (sources.length === 0) {
    emptyMessage.hidden = false;
    return;
  }

  emptyMessage.hidden = true;

  for (const source of sources) {
    const li = document.createElement('li');
    li.className = 'source-item';
    li.dataset.id = source.id;

    const left = document.createElement('div');
    left.className = 'source-item-left';

    if (source.iconUrl) {
      const img = document.createElement('img');
      img.src = source.iconUrl;
      img.alt = '';
      img.className = 'source-icon';
      img.onerror = () => img.remove();
      left.appendChild(img);
    }

    const info = document.createElement('div');
    info.className = 'source-info';

    const name = document.createElement('span');
    name.className = 'source-name';
    name.textContent = source.name;

    const url = document.createElement('span');
    url.className = 'source-url';
    url.textContent = source.baseUrl;

    const badges = document.createElement('span');
    badges.className = 'source-badges';
    if (source.encodeUrlParams) badges.appendChild(makeBadge('encode'));
    if (source.spacesToPlus) badges.appendChild(makeBadge('spaces→+'));
    if (source.addYear) badges.appendChild(makeBadge('+ year'));

    info.appendChild(name);
    info.appendChild(url);
    info.appendChild(badges);
    left.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'source-actions';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn btn-ghost btn-small';
    btnEdit.textContent = 'Edit';
    btnEdit.addEventListener('click', () => openEdit(source));

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn btn-danger btn-small';
    btnDelete.textContent = 'Delete';
    btnDelete.addEventListener('click', () => deleteSource(source.id));

    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);

    li.appendChild(left);
    li.appendChild(actions);
    sourceList.appendChild(li);
  }
}

function makeBadge(text) {
  const b = document.createElement('span');
  b.className = 'badge';
  b.textContent = text;
  return b;
}

// ---------------------------------------------------------------------------
// Wizard open/close
// ---------------------------------------------------------------------------

function openAdd() {
  wizardTitle.textContent = 'Add Source';
  document.getElementById('btn-save').textContent = 'Add Source';
  wizardForm.reset();
  editIdInput.value = '';
  hideError();
  wizardSection.hidden = false;
  wizardSection.scrollIntoView({ behavior: 'smooth' });
  fieldName.focus();
  updatePreview();
}

function openEdit(source) {
  wizardTitle.textContent = 'Edit Source';
  document.getElementById('btn-save').textContent = 'Save Changes';
  editIdInput.value = source.id;
  fieldName.value = source.name;
  fieldBaseUrl.value = source.baseUrl;
  fieldIconUrl.value = source.iconUrl || '';
  optEncode.checked = source.encodeUrlParams;
  optSpacesToPlus.checked = source.spacesToPlus;
  optAddYear.checked = source.addYear;
  optRemovePunct.checked = source.removePunctuation;
  optPunctToSpaces.checked = source.punctuationToSpaces;
  hideError();
  wizardSection.hidden = false;
  wizardSection.scrollIntoView({ behavior: 'smooth' });
  fieldName.focus();
  updatePreview();
}

function closeWizard() {
  wizardSection.hidden = true;
  wizardForm.reset();
  hideError();
}

function showError(msg) {
  wizardError.textContent = msg;
  wizardError.hidden = false;
}

function hideError() {
  wizardError.hidden = true;
  wizardError.textContent = '';
}

// ---------------------------------------------------------------------------
// Live preview
// ---------------------------------------------------------------------------

function getFormSource() {
  return {
    baseUrl: fieldBaseUrl.value.trim(),
    encodeUrlParams: optEncode.checked,
    spacesToPlus: optSpacesToPlus.checked,
    addYear: optAddYear.checked,
    removePunctuation: optRemovePunct.checked,
    punctuationToSpaces: optPunctToSpaces.checked,
  };
}

function updatePreview() {
  const source = getFormSource();
  const title = previewTitle.value || 'The Godfather';
  const year = previewYear.value || '1972';

  if (!source.baseUrl) {
    previewUrl.textContent = '—';
    previewUrl.href = '#';
    return;
  }

  const url = buildUrl(source, title, year);
  previewUrl.textContent = url;
  previewUrl.href = url;
}

[fieldBaseUrl, optEncode, optSpacesToPlus, optAddYear, previewTitle, previewYear]
  .forEach((el) => el.addEventListener('input', updatePreview));
[optEncode, optSpacesToPlus, optAddYear, optRemovePunct, optPunctToSpaces]
  .forEach((el) => el.addEventListener('change', updatePreview));

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

async function deleteSource(id) {
  if (!confirm('Delete this source?')) return;
  const sources = await loadSources();
  await saveSources(sources.filter((s) => s.id !== id));
  renderSources(await loadSources());
}

wizardForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const name = fieldName.value.trim();
  const baseUrl = fieldBaseUrl.value.trim();

  if (!name) return showError('Display name is required.');
  if (!baseUrl) return showError('Base URL is required.');

  // Basic URL sanity check
  try {
    new URL(baseUrl);
  } catch {
    return showError('Base URL does not appear to be a valid URL.');
  }

  const sources = await loadSources();
  const id = editIdInput.value || generateId();

  const entry = {
    id,
    name,
    baseUrl,
    iconUrl: fieldIconUrl.value.trim(),
    encodeUrlParams: optEncode.checked,
    spacesToPlus: optSpacesToPlus.checked,
    addYear: optAddYear.checked,
    removePunctuation: optRemovePunct.checked,
    punctuationToSpaces: optPunctToSpaces.checked,
  };

  const existingIndex = sources.findIndex((s) => s.id === id);
  if (existingIndex >= 0) {
    sources[existingIndex] = entry;
  } else {
    sources.push(entry);
  }

  await saveSources(sources);
  closeWizard();
  renderSources(await loadSources());
});

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

function exportSources(sources) {
  const json = JSON.stringify({ sources }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'letterboxd-alt-sources.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importSources(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    let parsed;
    try {
      parsed = JSON.parse(e.target.result);
    } catch {
      return alert('Invalid JSON file.');
    }

    if (!Array.isArray(parsed?.sources)) {
      return alert('JSON must have a "sources" array at the top level.');
    }

    const incoming = parsed.sources.filter(
      (s) => s && typeof s.name === 'string' && typeof s.baseUrl === 'string'
    ).map((s) => ({ ...s, id: s.id || generateId() }));

    if (incoming.length === 0) {
      return alert('No valid sources found in the file.');
    }

    const existing = await loadSources();
    const existingIds = new Set(existing.map((s) => s.id));
    const merged = [
      ...existing,
      ...incoming.filter((s) => !existingIds.has(s.id)),
    ];

    await saveSources(merged);
    renderSources(await loadSources());
    alert(`Imported ${incoming.length} source(s).`);
  };
  reader.readAsText(file);
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

btnAdd.addEventListener('click', openAdd);
btnCancel.addEventListener('click', closeWizard);

document.getElementById('btn-export').addEventListener('click', async () => {
  exportSources(await loadSources());
});

const importFileInput = document.getElementById('import-file-input');
document.getElementById('btn-import').addEventListener('click', () => {
  importFileInput.value = '';
  importFileInput.click();
});
importFileInput.addEventListener('change', () => {
  if (importFileInput.files[0]) importSources(importFileInput.files[0]);
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

loadSources().then(renderSources);
