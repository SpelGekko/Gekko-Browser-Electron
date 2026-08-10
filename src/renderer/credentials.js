// Save-password prompt bar logic

let pendingCredential = null;
let dismissTimer = null;

const AUTOHIDE_MS = 30000;

const getEls = () => ({
  prompt:  document.getElementById('save-password-prompt'),
  origin:  document.getElementById('save-pw-origin'),
  user:    document.getElementById('save-pw-user'),
  confirm: document.getElementById('save-pw-confirm'),
  dismiss: document.getElementById('save-pw-dismiss'),
  never:   document.getElementById('save-pw-never'),
  close:   document.getElementById('save-pw-close'),
});

const hidePrompt = () => {
  const { prompt } = getEls();
  if (prompt) prompt.classList.add('hidden');
  clearTimeout(dismissTimer);
  pendingCredential = null;
};

const showPrompt = ({ origin, username, password, isUpdate }) => {
  const { prompt, origin: originEl, user } = getEls();
  if (!prompt) return;

  pendingCredential = { origin, username, password };

  try {
    originEl.textContent = new URL(origin).hostname;
  } catch {
    originEl.textContent = origin;
  }
  user.textContent = username;

  const titleEl = prompt.querySelector('.save-pw-title');
  if (titleEl) titleEl.innerHTML = isUpdate
    ? `Update saved password for <strong>${originEl.textContent}</strong>?`
    : `Save password for <strong>${originEl.textContent}</strong>?`;

  prompt.classList.remove('hidden');

  clearTimeout(dismissTimer);
  dismissTimer = setTimeout(hidePrompt, AUTOHIDE_MS);
};

export const initCredentialsPrompt = () => {
  const { confirm, dismiss, never, close } = getEls();

  if (!confirm) return; // DOM not ready / elements missing

  confirm.addEventListener('click', async () => {
    if (!pendingCredential) return;
    const { origin, username, password } = pendingCredential;
    hidePrompt();
    try {
      await window.api.credentialsSave(origin, username, password);
    } catch (err) {
      console.error('Failed to save credential:', err);
    }
  });

  dismiss.addEventListener('click', hidePrompt);

  never.addEventListener('click', async () => {
    if (!pendingCredential) return;
    const { origin } = pendingCredential;
    hidePrompt();
    try {
      await window.api.credentialsAddNeverSave(origin);
    } catch (err) {
      console.error('Failed to add never-save:', err);
    }
  });

  close.addEventListener('click', hidePrompt);

  // Listen for the event from the main process (forwarded from webview-preload)
  if (window.api?.onShowSavePasswordPrompt) {
    window.api.onShowSavePasswordPrompt(showPrompt);
  }
};
