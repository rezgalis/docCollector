(function () {
  if (window.__docCollectorExtracted) return;
  window.__docCollectorExtracted = true;

  const BLOCK_TAGS = new Set(['P','H1','H2','H3','H4','H5','H6','UL','OL','TABLE','PRE','BLOCKQUOTE']);

  function hasSlottedContent(node) {
    if (!node.children.length) return false;
    const hasBlock = [...node.querySelectorAll('*')].some(el => BLOCK_TAGS.has(el.tagName));
    const text = node.textContent.trim();
    return hasBlock && text.length > 50;
  }

  const NOISE_SELECTORS = [
    'nav', 'header', 'footer', 'aside',
    '.sidebar', '.nav', '.menu', '.footer', '.header', '.advertisement',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.cookie-banner', '.popup', '.modal'
  ].join(', ');

  function flattenShadowDOM(originalNode, clonedNode) {
    if (originalNode.shadowRoot && !hasSlottedContent(originalNode)) {
      const fragment = document.createDocumentFragment();
      for (const child of originalNode.shadowRoot.childNodes) {
        fragment.appendChild(child.cloneNode(true));
      }
      while (clonedNode.firstChild) {
        clonedNode.removeChild(clonedNode.firstChild);
      }
      clonedNode.appendChild(fragment);

      for (let i = 0; i < originalNode.shadowRoot.children.length; i++) {
        const origChild = originalNode.shadowRoot.children[i];
        const clonedChild = clonedNode.children[i];
        if (clonedChild) {
          flattenShadowDOM(origChild, clonedChild);
        }
      }
    }

    for (let i = 0; i < originalNode.children.length; i++) {
      const origChild = originalNode.children[i];
      const clonedChild = clonedNode.children[i];
      if (clonedChild) {
        flattenShadowDOM(origChild, clonedChild);
      }
    }
  }

  function stripNoise(doc) {
    doc.querySelectorAll(NOISE_SELECTORS).forEach(el => el.remove());
  }

  function fallbackExtract(doc) {
    const clone = doc.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());
    clone.querySelectorAll(NOISE_SELECTORS).forEach(el => el.remove());
    return clone.innerHTML.trim();
  }

  function extract() {
    const docClone = document.cloneNode(true);
    flattenShadowDOM(document.documentElement, docClone.documentElement);
    stripNoise(docClone);

    let title = document.title;
    let content;

    try {
      const reader = new Readability(docClone);
      const article = reader.parse();
      if (article && article.content) {
        title = article.title || title;
        content = article.content;
      } else {
        content = fallbackExtract(docClone);
      }
    } catch (e) {
      console.warn('docCollector: Readability failed, using fallback', e);
      content = fallbackExtract(docClone);
    }

    return {
      title: title,
      url: location.href,
      content: content,
      capturedAt: new Date().toISOString()
    };
  }

  const result = extract();
  window.__docCollectorExtracted = false;
  chrome.runtime.sendMessage({ type: 'EXTRACT_RESULT', data: result });
})();
