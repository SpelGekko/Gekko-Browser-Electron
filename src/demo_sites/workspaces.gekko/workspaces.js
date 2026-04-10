initThemeHandling();

const workspacesList = document.getElementById('workspaces-list');
const workspacesEmpty = document.getElementById('workspaces-empty');
const workspacesSearch = document.getElementById('workspaces-search');
const clearWorkspacesBtn = document.getElementById('clear-workspaces-btn');

let workspaces = [];

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

function renderWorkspaces(items) {
  workspacesList.innerHTML = '';

  if (!items || items.length === 0) {
    workspacesEmpty.classList.remove('hidden');
    workspacesList.classList.add('hidden');
    return;
  }

  workspacesEmpty.classList.add('hidden');
  workspacesList.classList.remove('hidden');

  const fragment = document.createDocumentFragment();

  items.forEach((workspace) => {
    const item = document.createElement('li');
    item.className = 'workspace-item';
    item.dataset.id = workspace.id;

    const header = document.createElement('div');
    header.className = 'workspace-header';

    const title = document.createElement('div');
    title.className = 'workspace-title';
    title.textContent = workspace.name || 'Untitled Workspace';

    const meta = document.createElement('div');
    meta.className = 'workspace-meta';
    const tabCount = Array.isArray(workspace.tabs) ? workspace.tabs.length : 0;
    meta.textContent = `${tabCount} tabs - ${formatDate(workspace.updatedAt || workspace.createdAt)}`;

    header.appendChild(title);
    header.appendChild(meta);

    const preview = document.createElement('div');
    preview.className = 'workspace-preview';
    const previewTabs = Array.isArray(workspace.tabs) ? workspace.tabs.slice(0, 3) : [];
    if (previewTabs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'workspace-tab';
      empty.textContent = 'No tabs saved.';
      preview.appendChild(empty);
    } else {
      previewTabs.forEach((tab) => {
        const tabRow = document.createElement('div');
        tabRow.className = 'workspace-tab';
        tabRow.textContent = tab.title || tab.url;
        preview.appendChild(tabRow);
      });
    }

    const actions = document.createElement('div');
    actions.className = 'workspace-actions';

    const openButton = document.createElement('button');
    openButton.className = 'workspace-button';
    openButton.innerHTML = '<i class="fa-solid fa-folder-open"></i> Open';
    openButton.disabled = tabCount === 0;
    openButton.addEventListener('click', () => {
      if (window.api && typeof window.api.openWorkspace === 'function') {
        window.api.openWorkspace(workspace.id);
      }

      if (window.parent && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({
          type: 'open-workspace',
          workspace
        }, '*');
      }
    });

    const removeButton = document.createElement('button');
    removeButton.className = 'workspace-button';
    removeButton.innerHTML = '<i class="fa-solid fa-trash-can"></i> Remove';
    removeButton.addEventListener('click', () => {
      if (window.api && typeof window.api.removeWorkspace === 'function') {
        window.api.removeWorkspace(workspace.id);
      }
    });

    actions.appendChild(openButton);
    actions.appendChild(removeButton);

    item.appendChild(header);
    item.appendChild(preview);
    item.appendChild(actions);

    fragment.appendChild(item);
  });

  workspacesList.appendChild(fragment);
}

function applySearchFilter() {
  const query = workspacesSearch.value.trim().toLowerCase();
  if (!query) {
    renderWorkspaces(workspaces);
    return;
  }

  const filtered = workspaces.filter((workspace) => {
    const name = (workspace.name || '').toLowerCase();
    const tabs = Array.isArray(workspace.tabs) ? workspace.tabs : [];
    const tabMatch = tabs.some((tab) => {
      const title = (tab.title || '').toLowerCase();
      const url = (tab.url || '').toLowerCase();
      return title.includes(query) || url.includes(query);
    });

    return name.includes(query) || tabMatch;
  });

  renderWorkspaces(filtered);
}

function loadWorkspaces() {
  if (window.api && typeof window.api.getWorkspaces === 'function') {
    workspaces = window.api.getWorkspaces() || [];
  } else if (window.parent?.api?.getWorkspaces) {
    workspaces = window.parent.api.getWorkspaces() || [];
  }

  renderWorkspaces(workspaces);
}

if (workspacesSearch) {
  workspacesSearch.addEventListener('input', applySearchFilter);
}

if (clearWorkspacesBtn) {
  clearWorkspacesBtn.addEventListener('click', () => {
    if (window.api && typeof window.api.clearWorkspaces === 'function') {
      window.api.clearWorkspaces();
    }
  });
}

if (window.api && typeof window.api.onWorkspacesUpdated === 'function') {
  window.api.onWorkspacesUpdated((updated) => {
    workspaces = Array.isArray(updated) ? updated : [];
    applySearchFilter();
  });
}

loadWorkspaces();
