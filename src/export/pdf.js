function htmlToPlainText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

function formatDatePdf(isoString) {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getDateStringPdf() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function slugifyPdf(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function downloadBlobPdf(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function renderPageToPdf(doc, page, margin, contentWidth, pageHeight) {
  let y = margin;

  doc.setFontSize(10);
  doc.setTextColor(100);
  const sourceLines = doc.splitTextToSize(`Source: ${page.url}`, contentWidth);
  doc.text(sourceLines, margin, y);
  y += sourceLines.length * 12 + 2;
  doc.text(`Captured: ${formatDatePdf(page.capturedAt)}`, margin, y);
  y += 20;

  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(page.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 22 + 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30);
  const plainText = htmlToPlainText(page.content);
  const lines = doc.splitTextToSize(plainText, contentWidth);

  lines.forEach(line => {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 14;
  });

  return y;
}

function addPageNumbers(doc) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
  }
}

function exportSinglePdf(pages) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;

  pages.forEach((page, index) => {
    if (index > 0) doc.addPage();
    renderPageToPdf(doc, page, margin, contentWidth, pageHeight);
  });

  addPageNumbers(doc);
  doc.save(`docCollector-${getDateStringPdf()}.pdf`);
}

async function exportSeparatePdf(pages) {
  const { jsPDF } = window.jspdf;
  const zip = new JSZip();

  pages.forEach((page, index) => {
    const doc = new jsPDF();
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;

    renderPageToPdf(doc, page, margin, contentWidth, pageHeight);
    addPageNumbers(doc);

    const num = String(index + 1).padStart(2, '0');
    const slug = slugifyPdf(page.title);
    const pdfBlob = doc.output('arraybuffer');
    zip.file(`${num}-${slug}.pdf`, pdfBlob);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlobPdf(blob, `docCollector-${getDateStringPdf()}.zip`);
}
