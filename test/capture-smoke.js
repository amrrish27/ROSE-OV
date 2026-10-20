const { app, desktopCapturer, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

app.whenReady().then(async () => {
  try {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.min(display.size.width, 1920), height: Math.min(display.size.height, 1080) } });
    const source = sources.find(item => item.display_id === String(display.id));
    if (!source || source.thumbnail.isEmpty()) throw new Error(`No usable capture source for display ${display.id}`);
    const png = source.thumbnail.toPNG();
    fs.writeFileSync(path.join(process.cwd(), 'test-current-screen.png'), png);
    console.log(JSON.stringify({ displayId: String(display.id), sourceId: source.id, size: source.thumbnail.getSize(), bytes: png.length, sha256: crypto.createHash('sha256').update(png).digest('hex').slice(0, 16) }));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
