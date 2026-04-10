initThemeHandling();

const clippingsList = document.getElementById('clippings-list');
const clippingsEmpty = document.getElementById('clippings-empty');
const clippingsSearch = document.getElementById('clippings-search');
const clearClippingsBtn = document.getElementById('clear-clippings-btn');

let clippings = [];

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function copyTextToClipboard(text) {
  if (!text) {
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    return;
  }

  fallbackCopy(text);
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'readonly');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch (error) {
    console.error('Copy failed:', error);
  }
  textarea.remove();
}

function navigateToClip(url) {
  if (!url) {
    return;
  }

  if (window.navigationAPI && typeof window.navigationAPI.navigate === 'function') {
    window.navigationAPI.navigate(url);
    return;
  }

  if (window.parent && typeof window.parent.postMessage === 'function') {
    window.parent.postMessage({ type: 'navigate', url }, '*');
    return;
  }

  window.location.href = url;
}

function renderClippings(items) {
  clippingsList.innerHTML = '';

  if (!items || items.length === 0) {
    clippingsEmpty.classList.remove('hidden');
    clippingsList.classList.add('hidden');
    return;
  }

  clippingsEmpty.classList.add('hidden');
  clippingsList.classList.remove('hidden');

  const fragment = document.createDocumentFragment();

  items.forEach((clip) => {
    const item = document.createElement('li');
    item.className = 'clipping-item';
    item.dataset.id = clip.id;

    const text = document.createElement('div');
    text.className = 'clipping-text';
    text.textContent = clip.text;

    const meta = document.createElement('div');
    meta.className = 'clipping-meta';

    const source = document.createElement('div');
    source.className = 'clipping-source';

    const title = document.createElement('div');
    title.className = 'clipping-title';
    title.textContent = clip.title || clip.url || 'Untitled Source';

    const url = document.createElement('div');
    url.className = 'clipping-url';
    url.textContent = clip.url || 'No source URL';

    source.appendChild(title);
    source.appendChild(url);

    const metaRight = document.createElement('div');
    metaRight.className = 'clipping-actions-row';

    const copyButton = document.createElement('button');
    copyButton.className = 'clipping-button';
    copyButton.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
    copyButton.addEventListener('click', () => copyTextToClipboard(clip.text));

    const openButton = document.createElement('button');
    openButton.className = 'clipping-button';
    openButton.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Open';
    openButton.disabled = !clip.url;
    openButton.addEventListener('click', () => navigateToClip(clip.url));

    const removeButton = document.createElement('button');
    removeButton.className = 'clipping-button';
    removeButton.innerHTML = '<i class="fa-solid fa-trash-can"></i> Remove';
    removeButton.addEventListener('click', () => {
      if (window.api && typeof window.api.removeClipping === 'function') {
        window.api.removeClipping(clip.id);
      }
    });

    metaRight.appendChild(copyButton);
    metaRight.appendChild(openButton);
    metaRight.appendChild(removeButton);

    const date = document.createElement('div');
    date.textContent = formatDate(clip.createdAt);

    meta.appendChild(source);
    meta.appendChild(date);

    item.appendChild(text);
    item.appendChild(meta);
    item.appendChild(metaRight);

    fragment.appendChild(item);
  });

  clippingsList.appendChild(fragment);
}

function applySearchFilter() {
  const query = clippingsSearch.value.trim().toLowerCase();
  if (!query) {
    renderClippings(clippings);
    return;
  }

  const filtered = clippings.filter((clip) => {
    const text = clip.text.toLowerCase();
    const title = (clip.title || '').toLowerCase();
    const url = (clip.url || '').toLowerCase();
    return text.includes(query) || title.includes(query) || url.includes(query);
  });

  renderClippings(filtered);
}

function loadClippings() {
  if (window.api && typeof window.api.getClippings === 'function') {
    clippings = window.api.getClippings() || [];
  } else if (window.parent?.api?.getClippings) {
    clippings = window.parent.api.getClippings() || [];
  }

  renderClippings(clippings);
}

if (clippingsSearch) {
  clippingsSearch.addEventListener('input', applySearchFilter);
}

if (clearClippingsBtn) {
  clearClippingsBtn.addEventListener('click', () => {
    if (window.api && typeof window.api.clearClippings === 'function') {
      window.api.clearClippings();
    }
  });
}

if (window.api && typeof window.api.onClippingsUpdated === 'function') {
  window.api.onClippingsUpdated((updated) => {
    clippings = Array.isArray(updated) ? updated : [];
    applySearchFilter();
  });
}

loadClippings();
