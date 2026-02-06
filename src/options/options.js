const DEFAULTS = {
  maxPages: 20,
  clearAfterExport: true
};

const form = document.getElementById('settings-form');
const maxPagesInput = document.getElementById('max-pages');
const clearAfterExportInput = document.getElementById('clear-after-export');
const saveMessage = document.getElementById('save-message');

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  maxPagesInput.value = settings.maxPages;
  clearAfterExportInput.checked = settings.clearAfterExport;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const maxPages = parseInt(maxPagesInput.value, 10);

  if (isNaN(maxPages) || maxPages < 1 || maxPages > 100) {
    alert('Max pages must be between 1 and 100');
    return;
  }

  const settings = {
    maxPages,
    clearAfterExport: clearAfterExportInput.checked
  };

  await chrome.storage.sync.set(settings);

  saveMessage.hidden = false;
  setTimeout(() => {
    saveMessage.hidden = true;
  }, 2000);
});

loadSettings();
