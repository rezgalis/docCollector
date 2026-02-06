chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

const RESTRICTED_PREFIXES = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'chrome-search://'];
const EXTRACTION_TIMEOUT = 5000;

let extractionTimer = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ type: 'PONG' });
    return true;
  }

  if (message.type === 'ADD_PAGE') {
    extractFromActiveTab();
    return false;
  }

  if (message.type === 'EXTRACT_RESULT') {
    clearTimeout(extractionTimer);
    extractionTimer = null;

    if (!message.data || !message.data.content || message.data.content.trim().length === 0) {
      chrome.runtime.sendMessage({
        type: 'EXTRACTION_ERROR',
        error: 'No content found on this page'
      });
      return false;
    }

    chrome.runtime.sendMessage({
      type: 'CONTENT_EXTRACTED',
      data: message.data
    });
    return false;
  }
});

async function extractFromActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      chrome.runtime.sendMessage({
        type: 'EXTRACTION_ERROR',
        error: 'No active tab found'
      });
      return;
    }

    const isRestricted = RESTRICTED_PREFIXES.some(prefix => tab.url.startsWith(prefix));
    if (isRestricted) {
      chrome.runtime.sendMessage({
        type: 'EXTRACTION_ERROR',
        error: "Can't access browser pages"
      });
      return;
    }

    extractionTimer = setTimeout(() => {
      extractionTimer = null;
      chrome.runtime.sendMessage({
        type: 'EXTRACTION_ERROR',
        error: 'Page took too long to process'
      });
    }, EXTRACTION_TIMEOUT);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/lib/Readability.js', 'src/content/extractor.js']
    });
  } catch (err) {
    clearTimeout(extractionTimer);
    extractionTimer = null;
    chrome.runtime.sendMessage({
      type: 'EXTRACTION_ERROR',
      error: "Couldn't extract content from this page"
    });
  }
}

console.log('Service worker ready');
