<div align="center">
  <img src="icons/icon128.png" alt="VoxTab Premium TTS Logo" width="128">
  
  # VoxTab Premium TTS
  
  **A premium, unobtrusive Text-to-Speech (TTS) voice agent for Chromium browsers.**
  
  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
  [![Privacy: 100% Local](https://img.shields.io/badge/Privacy-100%25%20Local-success.svg)](#privacy--security)
</div>

---

## 📖 Overview

VoxTab is a lightweight, zero-latency text-to-speech extension built for multitasking. Instead of clunky popups, VoxTab features a **two-stage smart UI**. Highlight any text to summon the floating voice agent, then drop it into a persistent, screen-locked media dock so you can pause, resume, or stop the audio while you scroll, read, or browse other tabs.

## ✨ Features

- **Smart Media Dock:** Anchors to the bottom of your screen during playback so controls are always accessible.
- **Synchronized Highlighting:** Dynamically highlights the exact sentence currently being read in the DOM.
- **Shadow DOM Encapsulation:** The UI is completely isolated. Host websites cannot break, hide, or restyle the VoxTab widget.
- **Anti-Timeout Engine:** Bypasses Chrome’s notorious 15-second Web Speech API memory leak bug by intelligently chunking text at sentence boundaries and utilizing background keep-alive intervals.
- **Fully Customizable:** Adjust reading speed, voice pitch, and preferred voice engine (Defaults to *Google UK English Female*).
- **Context Menu Integration:** Right-click any highlighted text to send it directly to the engine without using the hover widget.

## 🚀 Installation (Developer Mode)

To install this extension locally for testing or development:

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle the **Developer mode** switch in the top-right corner to **ON**.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the root `voxtab` directory.
6. *Tip: Pin the extension to your toolbar by clicking the puzzle icon in Chrome!*

## 🏗️ Architecture

Built strictly on **Manifest V3** guidelines for maximum performance and minimal memory footprint.

| Component | Responsibility | Technology |
| :--- | :--- | :--- |
| **Service Worker** | Orchestrates installation states and context menus. | `background.js` |
| **Content Script** | Manages the Web Speech API, DOM selection, and Shadow root. | Vanilla JS / DOM API |
| **Popup UI** | Fast-access toggle menu with modern iOS-style inputs. | HTML / CSS / JS |
| **Storage Layer** | Synchronizes real-time state changes across all tabs. | `chrome.storage.sync` |

## 🔒 Privacy & Security

VoxTab is built with a strict **local-first** architecture. 
- **No data collection:** We do not track, store, or log the text you highlight.
- **No external servers:** All voice synthesis is handled entirely by your browser's native Web Speech API.
- **Minimal Permissions:** Only requests what it absolutely needs to function (`activeTab`, `storage`, `contextMenus`).

## 🛠️ Contribution

Pull requests are welcome! If you find a bug or want to suggest an improvement (like adding premium third-party API voices such as ElevenLabs or OpenAI), feel free to open an issue.

## 📄 License

This project is licensed under the MIT License.