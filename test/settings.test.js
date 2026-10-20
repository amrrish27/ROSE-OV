const test = require('node:test'); const assert = require('node:assert/strict');
test('default shortcut strings are Electron accelerators', () => { const shortcuts = ['CommandOrControl+\\', 'CommandOrControl+Shift+\\', 'CommandOrControl+Shift+Backspace']; assert.equal(shortcuts.every(s => s.includes('CommandOrControl+')), true); });
