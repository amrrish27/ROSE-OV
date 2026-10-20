const r = window.rose, q = s => document.querySelector(s);

// --- State ---
let screenshot = null;   // manually-pinned screenshot (from capture button)
let autoScreen = false;  // toggle: auto-capture fresh screenshot on every send
let pending = '';        // accumulates the current streaming response

// --- Helpers ---
function add(role, text = '') {
  const a = document.createElement('article');
  a.className = role;
  a.textContent = text;
  q('#messages').append(a);
  q('#messages').scrollTop = q('#messages').scrollHeight;
  return a;
}

function setAutoScreen(on) {
  autoScreen = on;
  const btn = q('#auto-screen');
  btn.classList.toggle('active', on);
  btn.title = on ? 'Auto screen context ON (click to disable)' : 'Auto-capture screen on each send (click to enable)';
}

function clearPinned() {
  screenshot = null;
  q('#screen').classList.remove('visible');
}

// --- Manual capture ---
async function capture() {
  try {
    screenshot = await r.invoke('screen:capture');
    q('#preview').src = screenshot.dataUrl;
    q('#screen').classList.add('visible');
  } catch (e) {
    add('error', e.message);
  }
}

// --- Send / ask ---
async function ask() {
  const prompt = q('#prompt').value.trim();
  if (!prompt) return;

  q('#prompt').value = '';
  add('user', prompt);
  const out = add('assistant', '');
  pending = '';                      // reset stream buffer for fresh response
  q('#send').disabled = true;

  let shotToSend = screenshot;       // start with any pinned screenshot

  try {
    // Auto-capture a fresh screenshot on every send if toggle is on
    if (autoScreen) {
      try {
        shotToSend = await r.invoke('screen:capture');
      } catch (e) {
        add('error', 'Auto-capture failed: ' + e.message);
      }
    }

    await r.invoke('gemini:ask', { prompt, screenshot: shotToSend || null });

    if (!pending) out.textContent = 'No text was returned.';
  } catch (e) {
    out.className = 'error';
    out.textContent = e.message;
  } finally {
    q('#send').disabled = false;
    clearPinned();                   // always clear pinned after send
  }
}

// --- Wire up UI ---
q('#send').onclick = ask;

// Manual capture button — pins a screenshot for the next send
q('#capture').onclick = capture;

// Remove pinned screenshot
q('#remove').onclick = clearPinned;

// Auto-screen toggle button
q('#auto-screen').onclick = () => setAutoScreen(!autoScreen);

// Close overlay
q('#close').onclick = () => r.invoke('overlay:toggle');

// Enter to send
q('#prompt').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
});

// --- IPC events ---
r.on('stream-chunk', chunk => {
  pending += chunk;
  const a = q('#messages article:last-child');
  if (a) a.textContent = pending;
  q('#messages').scrollTop = q('#messages').scrollHeight;
});

// Shortcut: Ctrl+Shift+\ → capture and immediately ask (if prompt has text)
r.on('analyze-screen', async () => {
  await capture();
  if (q('#prompt').value.trim()) ask();
});

r.on('clear-chat', () => {
  q('#messages').innerHTML = '';
  clearPinned();
  pending = '';
});

r.on('focus-prompt', () => q('#prompt').focus());
