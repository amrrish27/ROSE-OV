# ROSE-OV

ROSE-OV is a lightweight Windows desktop AI overlay powered by Google Gemini. It floats seamlessly over your workspace with real-time screen-reading capabilities and streaming contextual responses.

---

## 📥 Download

You can download the ready-to-run Windows installer directly from GitHub Releases:

👉 **[Download Latest Release (ROSE-OV Setup 1.0.0.exe)](https://github.com/amrrish27/ROSE-OV/releases/latest)**

### Quick Setup:
1. Download and run **`ROSE-OV Setup 1.0.0.exe`**.
2. Open ROSE-OV, click the **⚙ (Gear)** settings icon.
3. Paste your [Google Gemini API Key](https://aistudio.google.com/app/apikey) and click **Save settings**.
4. You're ready! Press `Ctrl+\` anytime to toggle the assistant.

---

## ✨ Features

- **🖥️ Screen Context (`⟳ Auto` & `◉ Screen`)**: Automatically captures and attaches your active screen context when sending questions, or manually pin a screenshot preview.
- **⚡ Real-time Streaming**: Powered by Gemini 2.5 Flash / 2.0 Flash with live markdown stream answers.
- **🪟 Floating Overlay**: Transparent, draggable, always-on-top pill and chat interface that stays accessible while you work.
- **🔔 Windows Tray & Shortcuts**: Control visibility from your system tray or with quick global keyboard shortcuts.

---

## ⌨️ Shortcuts

| Action | Default Shortcut |
| --- | --- |
| Show / hide overlay | `Ctrl+\` |
| Capture screen & analyze | `Ctrl+Shift+\` |
| Clear chat | `Ctrl+Shift+Backspace` |

*All shortcuts can be customized from the Settings panel.*

---

## 🛠️ Run from Source (For Developers)

```powershell
# Clone the repository
git clone https://github.com/amrrish27/ROSE-OV.git
cd ROSE-OV

# Install dependencies
npm install

# Start development overlay
npm start
```

### Build Installer
```powershell
npm run package
```
The compiled installer will be generated in `dist/ROSE-OV Setup 1.0.0.exe`.

---

## 🔒 Privacy

- Your Gemini API key is stored locally on your machine in application data.
- Screenshots are captured locally and only sent to Google Gemini when you request an analysis.
