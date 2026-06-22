document.addEventListener('DOMContentLoaded', async () => {
  const api = window.api;
  const searchInput = document.getElementById('pw-search');
  const listEl = document.getElementById('pw-list');
  const emptyEl = document.getElementById('pw-empty');

  // Modal elements
  const backdrop = document.getElementById('pw-modal-backdrop');
  const modalOrigin = document.getElementById('modal-origin');
  const modalUsername = document.getElementById('modal-username');
  const modalPassword = document.getElementById('modal-password');
  const modalTogglePw = document.getElementById('modal-toggle-pw');
  const modalSave = document.getElementById('pw-modal-save');
  const modalCancel = document.getElementById('pw-modal-cancel');
  const modalClose = document.getElementById('pw-modal-close');

  let allCredentials = [];
  let editingId = null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getFavicon = (origin) => {
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(origin).hostname}&sz=32`;
    } catch {
      return '';
    }
  };

  const displayOrigin = (origin) => {
    try { return new URL(origin).hostname; } catch { return origin; }
  };

  const timeAgo = (ts) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const render = (credentials) => {
    listEl.innerHTML = '';
    if (!credentials.length) {
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    credentials.forEach((cred) => {
      const item = document.createElement('div');
      item.className = 'pw-item';
      item.dataset.id = cred.id;

      const favicon = getFavicon(cred.origin);
      item.innerHTML = `
        <div class="pw-item-icon">
          ${favicon
            ? `<img src="${favicon}" alt="" class="pw-favicon" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <div class="pw-favicon-fallback" style="${favicon ? 'display:none' : ''}">
            <i class="fa-solid fa-globe"></i>
          </div>
        </div>
        <div class="pw-item-info">
          <div class="pw-item-origin">${displayOrigin(cred.origin)}</div>
          <div class="pw-item-username">${escapeHtml(cred.username)}</div>
          <div class="pw-item-meta">Updated ${timeAgo(cred.updatedAt)}</div>
        </div>
        <div class="pw-item-actions">
          <button class="pw-action-btn" data-action="copy-user" title="Copy username">
            <i class="fa-solid fa-user"></i>
          </button>
          <button class="pw-action-btn" data-action="copy-pw" title="Copy password">
            <i class="fa-solid fa-copy"></i>
          </button>
          <button class="pw-action-btn" data-action="edit" title="Edit">
            <i class="fa-solid fa-pencil"></i>
          </button>
          <button class="pw-action-btn pw-action-delete" data-action="delete" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;
      listEl.appendChild(item);
    });
  };

  const escapeHtml = (str) =>
    String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // ── Data ───────────────────────────────────────────────────────────────────

  const loadAndRender = async () => {
    try {
      allCredentials = await api.credentialsGetAll();
      applyFilter(searchInput.value);
    } catch (err) {
      console.error('Failed to load credentials:', err);
    }
  };

  const applyFilter = (query) => {
    const q = query.toLowerCase();
    const filtered = q
      ? allCredentials.filter(c => c.origin.toLowerCase().includes(q) || c.username.toLowerCase().includes(q))
      : allCredentials;
    render(filtered);
  };

  // ── Events ─────────────────────────────────────────────────────────────────

  searchInput.addEventListener('input', () => applyFilter(searchInput.value));

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const item = btn.closest('.pw-item');
    const id = item?.dataset.id;
    if (!id) return;
    const action = btn.dataset.action;

    if (action === 'copy-user') {
      const cred = allCredentials.find(c => c.id === id);
      if (cred) {
        await navigator.clipboard.writeText(cred.username);
        showToast('Username copied');
      }
    } else if (action === 'copy-pw') {
      try {
        const cred = await api.credentialsGetDecrypted(id);
        if (cred) {
          await navigator.clipboard.writeText(cred.password);
          showToast('Password copied');
        }
      } catch (err) {
        console.error('Copy password failed:', err);
      }
    } else if (action === 'edit') {
      openEditModal(id);
    } else if (action === 'delete') {
      if (confirm('Delete this saved password?')) {
        await api.credentialsDelete(id);
        await loadAndRender();
      }
    }
  });

  // Modal
  const openEditModal = async (id) => {
    editingId = id;
    const cred = allCredentials.find(c => c.id === id);
    if (!cred) return;
    try {
      const decrypted = await api.credentialsGetDecrypted(id);
      modalOrigin.value = cred.origin;
      modalUsername.value = cred.username;
      modalPassword.value = decrypted?.password || '';
      modalPassword.type = 'password';
      modalTogglePw.querySelector('i').className = 'fa-solid fa-eye';
      backdrop.classList.remove('hidden');
      modalUsername.focus();
    } catch (err) {
      console.error('Failed to open edit modal:', err);
    }
  };

  const closeModal = () => {
    backdrop.classList.add('hidden');
    editingId = null;
  };

  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

  modalTogglePw.addEventListener('click', () => {
    const isHidden = modalPassword.type === 'password';
    modalPassword.type = isHidden ? 'text' : 'password';
    modalTogglePw.querySelector('i').className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  });

  modalSave.addEventListener('click', async () => {
    if (!editingId) return;
    const username = modalUsername.value.trim();
    const password = modalPassword.value;
    if (!username || !password) return;
    try {
      await api.credentialsUpdate(editingId, { username, password });
      closeModal();
      await loadAndRender();
      showToast('Password updated');
    } catch (err) {
      console.error('Failed to update credential:', err);
    }
  });

  // Toast
  const showToast = (msg) => {
    const toast = document.createElement('div');
    toast.className = 'pw-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('pw-toast-visible'));
    setTimeout(() => {
      toast.classList.remove('pw-toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  };

  // Initial load
  loadAndRender();
});
