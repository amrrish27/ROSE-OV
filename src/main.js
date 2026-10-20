const { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, screen, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let controlWindow, chatWindow, settingsWindow, tray;
const defaults = {
  apiKey: '', model: 'gemini-2.5-flash', systemPrompt: 'You are ROSE, a concise and helpful desktop assistant. Answer directly using the screenshot and user request.',
  shortcuts: { toggle: 'CommandOrControl+\\', analyze: 'CommandOrControl+Shift+\\', clear: 'CommandOrControl+Shift+Backspace' },
  position: null
};
function settingsPath() { return path.join(app.getPath('userData'), 'settings.json'); }
function logPath() { return path.join(app.getPath('userData'), 'rose-ov.log'); }
function log(event, details = {}) { fs.appendFileSync(logPath(), `${new Date().toISOString()} ${event} ${JSON.stringify(details)}\n`); }
function readSettings() { try { return { ...defaults, ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')), shortcuts: { ...defaults.shortcuts, ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')).shortcuts } }; } catch { return structuredClone(defaults); } }
let settings = null;
function saveSettings(patch) { settings = { ...settings, ...patch, shortcuts: { ...settings.shortcuts, ...(patch.shortcuts || {}) } }; fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2)); registerShortcuts(); broadcast('settings-changed', publicSettings()); return publicSettings(); }
function publicSettings() { const { apiKey, ...safe } = settings; return { ...safe, hasApiKey: Boolean(apiKey) }; }
function preload() { return path.join(__dirname, 'preload.js'); }
function makeWindow(options) { const win = new BrowserWindow({ webPreferences: { preload: preload(), contextIsolation: true, nodeIntegration: false }, ...options }); win.setAlwaysOnTop(true, 'floating'); win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); return win; }
function controlBounds() { const area = screen.getPrimaryDisplay().workArea; return settings.position || { x: Math.round(area.x + area.width / 2 - 115), y: area.y + 24 }; }
function createControl() {
  const p = controlBounds();
  controlWindow = makeWindow({ width: 230, height: 56, x: p.x, y: p.y, frame: false, transparent: true, resizable: false, skipTaskbar: true, title: 'ROSE-OV control' });
  controlWindow.loadFile(path.join(__dirname, 'control.html'));
  controlWindow.on('move', positionChanged);
  controlWindow.on('closed', () => controlWindow = null);
}
function createChat() {
  const b = controlWindow.getBounds();
  chatWindow = makeWindow({ width: 560, height: 470, x: b.x - 165, y: b.y + b.height + 8, frame: false, transparent: true, resizable: false, skipTaskbar: true, show: false, title: 'ROSE-OV' });
  chatWindow.loadFile(path.join(__dirname, 'chat.html'));
  chatWindow.on('closed', () => chatWindow = null);
}
function positionChanged() { if (!controlWindow || !chatWindow) return; const b = controlWindow.getBounds(); chatWindow.setPosition(b.x - 165, b.y + b.height + 8); settings.position = { x: b.x, y: b.y }; fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2)); }
function createSettings() {
  if (settingsWindow) return settingsWindow.show();
  settingsWindow = new BrowserWindow({ width: 760, height: 650, minWidth: 640, minHeight: 540, title: 'ROSE-OV Settings', backgroundColor: '#100b18', webPreferences: { preload: preload(), contextIsolation: true } });
  settingsWindow.loadFile(path.join(__dirname, 'settings.html')); settingsWindow.on('closed', () => settingsWindow = null);
}
function broadcast(channel, value) { [controlWindow, chatWindow, settingsWindow].forEach(w => w && !w.isDestroyed() && w.webContents.send(channel, value)); }
function hideOverlay() { chatWindow?.hide(); controlWindow?.hide(); broadcast('chat-visible', false); }
function toggleChat() { if (!chatWindow) return; if (chatWindow.isVisible()) { chatWindow.hide(); broadcast('chat-visible', false); } else { controlWindow?.show(); positionChanged(); chatWindow.show(); chatWindow.focus(); broadcast('chat-visible', true); broadcast('focus-prompt'); } }
function registerShortcuts() { globalShortcut.unregisterAll(); const map = { toggle: toggleChat, analyze: () => { if (!chatWindow.isVisible()) toggleChat(); broadcast('analyze-screen'); }, clear: () => broadcast('clear-chat') }; for (const [name, action] of Object.entries(map)) globalShortcut.register(settings.shortcuts[name], action); }
function pause(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function captureScreen() {
  const target = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const wasControlVisible = controlWindow?.isVisible();
  const wasChatVisible = chatWindow?.isVisible();
  controlWindow?.hide(); chatWindow?.hide();
  await pause(250);
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.min(target.size.width, 1920), height: Math.min(target.size.height, 1080) } });
    const source = sources.find(s => s.display_id === String(target.id));
    if (!source || source.thumbnail.isEmpty()) throw new Error(`Unable to capture display ${target.id}.`);
    const png = source.thumbnail.toPNG();
    const metadata = { displayId: String(target.id), sourceId: source.id, width: source.thumbnail.getSize().width, height: source.thumbnail.getSize().height, bytes: png.length, sha256: crypto.createHash('sha256').update(png).digest('hex').slice(0, 16) };
    log('screen-captured', metadata);
    return { dataUrl: source.thumbnail.toDataURL(), metadata };
  } finally {
    if (wasControlVisible) controlWindow?.showInactive();
    if (wasChatVisible) { chatWindow?.show(); chatWindow?.focus(); }
  }
}
async function geminiStream({ prompt, screenshot }) {
  if (!settings.apiKey) throw new Error('Add a Gemini API key in Settings before sending a request.');
  const parts = [{ text: `${settings.systemPrompt}\n\nUser request: ${prompt}` }];
  if (screenshot) parts.push({ inline_data: { mime_type: 'image/png', data: screenshot.dataUrl.split(',')[1] } });
  log('gemini-request', { model: settings.model, includesScreenshot: Boolean(screenshot), screenshot: screenshot?.metadata || null, promptCharacters: prompt.length });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(settings.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.4, maxOutputTokens: 2048 } }) });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status}): ${await response.text()}`);
  const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '', all = '';
  while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop(); for (const line of lines) if (line.startsWith('data: ')) { try { const data = JSON.parse(line.slice(6)); const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''; if (text) { all += text; broadcast('stream-chunk', text); } } catch {} } }
  return all;
}
function initTray() {
  const iconPath = path.join(__dirname, 'assets', 'black-bulls-logo.png');
  const trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }) : nativeImage.createEmpty();
  tray = new Tray(trayIcon);
  tray.setToolTip('ROSE-OV');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show / hide overlay', click: toggleChat },
    { label: 'Settings', click: createSettings },
    { type: 'separator' },
    { label: 'Quit ROSE-OV', click: () => app.quit() }
  ]));
  tray.on('click', toggleChat);
}
app.whenReady().then(() => {
  settings = readSettings();
  createControl();
  createChat();
  initTray();
  registerShortcuts();
  toggleChat();
});
app.on('window-all-closed', e => e.preventDefault()); app.on('will-quit', () => globalShortcut.unregisterAll());
ipcMain.handle('settings:get', () => publicSettings()); ipcMain.handle('settings:save', (_, patch) => saveSettings(patch)); ipcMain.handle('overlay:toggle', toggleChat); ipcMain.handle('overlay:hide', hideOverlay); ipcMain.handle('overlay:settings', createSettings); ipcMain.handle('screen:capture', captureScreen); ipcMain.handle('gemini:ask', (_, data) => geminiStream(data)); ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url));
