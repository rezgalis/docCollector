const SEPARATOR = '\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n';

function createTurndownService() {
  return new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
}

function formatDateExport(isoString) {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function pageToMarkdown(page, turndown) {
  const header = [
    `Title: ${page.title}`,
    `Source: ${page.url}`,
    `Captured: ${formatDateExport(page.capturedAt)}`,
    '',
  ].join('\n');

  const content = turndown.turndown(page.content);
  return header + content;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSingleMarkdown(pages) {
  const turndown = createTurndownService();
  const sections = pages.map(page => pageToMarkdown(page, turndown));
  const combined = sections.join(SEPARATOR);
  const blob = new Blob([combined], { type: 'text/markdown' });
  downloadBlob(blob, `docCollector-${getDateString()}.md`);
}

async function exportSeparateMarkdown(pages) {
  const turndown = createTurndownService();
  const zip = new JSZip();

  pages.forEach((page, index) => {
    const num = String(index + 1).padStart(2, '0');
    const slug = slugify(page.title);
    const filename = `${num}-${slug}.md`;
    const content = pageToMarkdown(page, turndown);
    zip.file(filename, content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `docCollector-${getDateString()}.zip`);
}
