const addPageBtn = document.getElementById('add-page-btn');
const collectionList = document.getElementById('collection-list');
const emptyState = document.getElementById('empty-state');
const collectionCount = document.getElementById('collection-count');
const limitMessage = document.getElementById('limit-message');
const exportBtn = document.getElementById('export-btn');
const clearBtn = document.getElementById('clear-btn');
const previewModal = document.getElementById('preview-modal');

document.getElementById('open-options').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

let collection = [];
let settings = { maxPages: 20, clearAfterExport: true };
let expandedId = null;
let isAddingPage = false;

async function getSettings() {
  const defaults = { maxPages: 20, clearAfterExport: true };
  return await chrome.storage.sync.get(defaults);
}

function addPage(pageData) {
  if (collection.length >= settings.maxPages) {
    showToast('Collection full. Export to continue.', 'warning');
    return;
  }
  if (collection.some(p => p.url === pageData.url)) {
    showToast('Page already collected', 'warning');
    return;
  }
  collection.push({ ...pageData, id: crypto.randomUUID() });
  renderCollection();
  showToast(`Added: ${pageData.title}`, 'success');
}

function removePage(id) {
  if (expandedId === id) expandedId = null;
  collection = collection.filter(p => p.id !== id);
  renderCollection();
}

function clearCollection() {
  collection = [];
  expandedId = null;
  renderCollection();
}

function togglePreview(id) {
  expandedId = expandedId === id ? null : id;
  renderCollection();
}

function getPlainText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function showModal(page) {
  previewModal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-meta">
          <span class="modal-date">Captured: ${formatDate(page.capturedAt)}</span>
          <span class="modal-url">${page.url}</span>
        </div>
        <h2 class="modal-title">${page.title}</h2>
        <button class="modal-close">\u00d7</button>
      </div>
      <div class="modal-body">
        <div class="rendered-content">${page.content}</div>
      </div>
    </div>`;
  previewModal.hidden = false;

  previewModal.querySelector('.modal-close').addEventListener('click', closeModal);
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) closeModal();
  });
}

function closeModal() {
  previewModal.hidden = true;
  previewModal.innerHTML = '';
}

function renderCollection() {
  const count = collection.length;
  const max = settings.maxPages;

  collectionCount.textContent = `Collected (${count} of ${max}):`;

  emptyState.hidden = count > 0;
  collectionList.hidden = count === 0;
  limitMessage.hidden = count < max;

  addPageBtn.disabled = count >= max;
  exportBtn.disabled = count === 0;
  clearBtn.disabled = count === 0;

  document.querySelectorAll('.export-option input[type="radio"]').forEach(radio => {
    radio.disabled = count === 0;
  });

  collectionList.innerHTML = '';
  collection.forEach((page, index) => {
    const isExpanded = expandedId === page.id;

    const item = document.createElement('div');
    item.className = 'collection-item';
    item.draggable = true;
    item.dataset.id = page.id;
    item.dataset.index = index;

    const header = document.createElement('div');
    header.className = 'item-header';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.textContent = '\u2630';

    const expandIcon = document.createElement('span');
    expandIcon.className = 'expand-icon';
    expandIcon.textContent = isExpanded ? '\u25bc' : '\u25b6';

    const title = document.createElement('span');
    title.className = 'item-title';
    title.textContent = page.title;
    title.title = page.title;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'item-remove';
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removePage(page.id);
    });

    header.appendChild(dragHandle);
    header.appendChild(expandIcon);
    header.appendChild(title);
    header.appendChild(removeBtn);

    header.addEventListener('click', (e) => {
      if (e.target.closest('.drag-handle')) return;
      if (e.target.closest('.item-remove')) return;
      togglePreview(page.id);
    });

    item.appendChild(header);

    if (isExpanded) {
      const preview = document.createElement('div');
      preview.className = 'item-preview expanded';

      const previewText = document.createElement('p');
      previewText.className = 'preview-text';
      const plain = getPlainText(page.content);
      previewText.textContent = plain.length > 300 ? plain.substring(0, 300) + '...' : plain;

      const fullBtn = document.createElement('button');
      fullBtn.className = 'full-preview-btn';
      fullBtn.textContent = 'Full Preview';
      fullBtn.addEventListener('click', () => showModal(page));

      preview.appendChild(previewText);
      preview.appendChild(fullBtn);
      item.appendChild(preview);
    }

    collectionList.appendChild(item);
  });
}

function getDragAfterElement(container, y) {
  const items = [...container.querySelectorAll('.collection-item:not(.dragging)')];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

collectionList.addEventListener('dragstart', (e) => {
  const item = e.target.closest('.collection-item');
  if (!item) return;
  e.dataTransfer.setData('text/plain', item.dataset.id);
  item.classList.add('dragging');
});

collectionList.addEventListener('dragend', (e) => {
  const item = e.target.closest('.collection-item');
  if (item) item.classList.remove('dragging');
});

collectionList.addEventListener('dragover', (e) => {
  e.preventDefault();
  const afterElement = getDragAfterElement(collectionList, e.clientY);
  const dragging = document.querySelector('.dragging');
  if (!dragging) return;
  if (afterElement) {
    collectionList.insertBefore(dragging, afterElement);
  } else {
    collectionList.appendChild(dragging);
  }
});

collectionList.addEventListener('drop', (e) => {
  e.preventDefault();
  const items = [...collectionList.querySelectorAll('.collection-item')];
  const newOrder = items.map(el => el.dataset.id);
  const reordered = newOrder.map(id => collection.find(p => p.id === id));
  collection = reordered;
});

addPageBtn.addEventListener('click', () => {
  if (isAddingPage) return;
  isAddingPage = true;
  addPageBtn.disabled = true;
  addPageBtn.textContent = 'Adding...';
  chrome.runtime.sendMessage({ type: 'ADD_PAGE' });
});

clearBtn.addEventListener('click', () => {
  if (collection.length === 0) return;
  const confirmed = confirm(`Clear ${collection.length} page${collection.length > 1 ? 's' : ''}?`);
  if (confirmed) {
    clearCollection();
    showToast('Collection cleared', 'success');
  }
});

exportBtn.addEventListener('click', async () => {
  if (collection.length === 0) return;

  settings = await getSettings();
  const format = document.querySelector('input[name="format"]:checked').value;
  const output = document.querySelector('input[name="output"]:checked').value;
  const count = collection.length;

  exportBtn.disabled = true;
  exportBtn.textContent = 'Exporting...';

  try {
    if (format === 'markdown' && output === 'single') {
      exportSingleMarkdown(collection);
    } else if (format === 'markdown' && output === 'separate') {
      await exportSeparateMarkdown(collection);
    } else if (format === 'pdf' && output === 'single') {
      exportSinglePdf(collection);
    } else if (format === 'pdf' && output === 'separate') {
      await exportSeparatePdf(collection);
    }

    showToast(`Exported ${count} pages`, 'success');

    if (settings.clearAfterExport) {
      clearCollection();
    }
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  } finally {
    exportBtn.textContent = 'Export';
    exportBtn.disabled = collection.length === 0;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !previewModal.hidden) {
    closeModal();
  }
});

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'CONTENT_EXTRACTED' && message.data) {
    settings = await getSettings();
    addPage(message.data);
    isAddingPage = false;
    addPageBtn.textContent = '+ Add Current Page';
    if (collection.length < settings.maxPages) {
      addPageBtn.disabled = false;
    }
  }

  if (message.type === 'EXTRACTION_ERROR') {
    showToast(message.error, 'error');
    isAddingPage = false;
    addPageBtn.textContent = '+ Add Current Page';
    addPageBtn.disabled = collection.length >= settings.maxPages;
  }
});

function showToast(text, type) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = text;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

async function init() {
  settings = await getSettings();
  const response = await chrome.runtime.sendMessage({ type: 'PING' });
  console.log('Service worker connection:', response);
  addPageBtn.disabled = false;
  renderCollection();
}

init();
