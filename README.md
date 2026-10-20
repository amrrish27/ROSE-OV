# ROSE-OV

ROSE-OV is a Windows desktop AI overlay with a local Gemini configuration. It is an independent implementation and does not use Cluely services, accounts, or paid functionality.

## Run

```powershell
npm install
npm start
```

Open the settings window from the control pill and add a Gemini API key. Select a supported Gemini model, then use the overlay to ask questions or attach the current display with **Screen**.

## Shortcuts

| Action | Default |
| --- | --- |
| Show or hide chat | `Ctrl+\\` |
| Capture screen | `Ctrl+Shift+\\` |
| Clear chat | `Ctrl+Shift+Backspace` |

All shortcuts are configurable in Settings.

## REA investigation record

REA was cloned under `rea/` and its Electron analysis was run against the installed `cluely-v2` application archive. The archive is an Electron app with a transparent, frameless, always-on-top control window and a second chat window. Static inspection verified a 163 × 50 centered control window, a 540px chat surface placed below it, `globalShortcut` usage, desktop screenshot capture through Electron `desktopCapturer`, and a separate settings/dashboard window. ROSE-OV uses the same general overlay workflow while implementing its own UI, storage, shortcut behavior, and Gemini request path.

## Packaging

The built NSIS installer is in `dist/ROSE-OV Setup 1.0.0.exe`.

## Current scope

Implemented: draggable always-on-top overlay, show/hide and screen shortcuts, compact control pill, expanding chat, screenshot attachment, streamed Gemini responses, model/API-key settings, system prompt, persistent local configuration, tray controls, and a Windows installer.

Not included: meeting transcription, cloud session history, account management, calendar integrations, or any feature requiring Cluely's paid/private backend.
