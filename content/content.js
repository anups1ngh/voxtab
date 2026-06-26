class VoxTabEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.selectedText = "";
    
    // Strict internal state overrides
    this.isPaused = false;
    this.isEngineRunning = false; 
    
    this.textQueue = [];
    this.currentChunkIndex = 0;
    this.keepAliveInterval = null;

    // UI & DOM Elements
    this.uiContainer = null;
    this.shadowRoot = null;
    this.activeHighlightNodes = [];

    // Fallback defaults
    this.config = {
      extensionEnabled: true,
      hoverWidgetEnabled: true,
      preferredVoice: 'Google UK English Female',
      speechRate: 1.0,
      speechPitch: 1.0,
      highlightText: true
    };

    this.init();
  }

  async init() {
    const data = await chrome.storage.sync.get([
      'extensionEnabled', 'hoverWidgetEnabled', 'preferredVoice', 
      'speechRate', 'speechPitch', 'highlightText'
    ]);
    
    this.config = { ...this.config, ...data };

    if (!this.config.extensionEnabled) return;

    this.synth.getVoices();
    this.createShadowDOM();
    this.setupListeners();
  }

  setupListeners() {
    let timeout;
    document.addEventListener('mouseup', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => this.handleTextSelection(), 250);
    });
    
    document.addEventListener('mousedown', (e) => {
      if (this.uiContainer && e.composedPath && !e.composedPath().includes(this.uiContainer)) {
        // Only hide if the engine is NOT currently active
        if (!this.isEngineRunning) this.hideController();
      }
    });

    chrome.storage.onChanged.addListener((changes) => {
      for (let [key, { newValue }] of Object.entries(changes)) {
        this.config[key] = newValue !== undefined ? newValue : this.config[key];
      }
      if (changes.extensionEnabled && changes.extensionEnabled.newValue === false) {
        this.stopSpeech();
      }
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "read_selected_text" && message.text) {
        this.selectedText = message.text;
        // Skip the hover menu and instantly trigger the persistent media dock
        this.processAndStartSpeech(message.text);
      }
    });
  }

  createShadowDOM() {
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'voxtab-premium-hud';
    this.uiContainer.style.zIndex = '2147483647'; 
    this.uiContainer.style.pointerEvents = 'none'; 
    
    this.shadowRoot = this.uiContainer.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      .hud-panel {
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(8px);
        color: #f8fafc;
        font-family: system-ui, -apple-system, sans-serif;
        padding: 8px 16px;
        border-radius: 30px;
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        display: flex;
        gap: 12px;
        align-items: center;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        visibility: hidden;
      }
      .hud-panel.visible {
        opacity: 1;
        transform: translateY(0);
        visibility: visible;
      }

      /* Fixed Media Dock Mode */
      .hud-panel.docked {
        padding: 12px 20px;
        border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.8);
        border: 1px solid rgba(99, 102, 241, 0.4);
      }

      .hud-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        padding: 6px 12px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .hud-btn:hover { color: #f8fafc; background: rgba(255,255,255,0.1); }
      .hud-btn.primary { background: #6366f1; color: white; }
      .hud-btn.primary:hover { background: #4f46e5; transform: scale(1.05); }
      
      /* Glowing Audio Agent Icon */
      .agent-icon {
        display: none;
        width: 28px;
        height: 28px;
        background: #6366f1;
        border-radius: 50%;
        align-items: center;
        justify-content: center;
        margin-right: 4px;
      }
      .hud-panel.docked .agent-icon {
        display: flex;
        animation: pulse 2s infinite;
      }
      .hud-panel.docked .agent-icon.paused {
        animation: none;
        background: #475569;
      }
      
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.6); }
        70% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
        100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
      }
    `;

    const panel = document.createElement('div');
    panel.className = 'hud-panel';
    
    // Injecting SVG for the Voice Agent Icon
    panel.innerHTML = `
      <div class="agent-icon" id="vt-agent">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
      </div>
      <button class="hud-btn primary" id="vt-play-pause">Listen</button>
      <button class="hud-btn" id="vt-stop">Stop</button>
    `;

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(panel);
    document.body.appendChild(this.uiContainer);

    this.shadowRoot.querySelector('#vt-play-pause').addEventListener('click', () => this.togglePlayback());
    this.shadowRoot.querySelector('#vt-stop').addEventListener('click', () => this.stopSpeech());
  }

  handleTextSelection() {
    if (!this.config.hoverWidgetEnabled || this.isEngineRunning) return;

    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0) {
      this.selectedText = text;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      this.showHoverController(rect.left + window.scrollX, rect.top + window.scrollY - 60);
    } else {
      this.hideController();
    }
  }

  // --- Display Modes ---

  // Mode 1: Floats over the text you selected
  showHoverController(x, y) {
    const panel = this.shadowRoot.querySelector('.hud-panel');
    panel.classList.remove('docked');
    
    this.uiContainer.style.position = 'absolute';
    this.uiContainer.style.left = `${Math.max(10, x)}px`;
    this.uiContainer.style.top = `${Math.max(10, y)}px`;
    this.uiContainer.style.right = 'auto';
    this.uiContainer.style.bottom = 'auto';
    
    panel.classList.add('visible');
  }

  // Mode 2: Locks to the bottom right of your screen while playing
  dockController() {
    const panel = this.shadowRoot.querySelector('.hud-panel');
    
    this.uiContainer.style.position = 'fixed';
    this.uiContainer.style.bottom = '30px';
    this.uiContainer.style.right = '30px';
    this.uiContainer.style.top = 'auto';
    this.uiContainer.style.left = 'auto';
    
    panel.classList.add('docked');
    panel.classList.add('visible');
  }

  hideController() {
    const panel = this.shadowRoot.querySelector('.hud-panel');
    if (panel) panel.classList.remove('visible');
  }

  // --- Core Audio Engine ---

  processAndStartSpeech(rawText) {
    this.stopSpeech();
    
    const chunks = rawText.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [rawText];
    this.textQueue = chunks.map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
    this.currentChunkIndex = 0;
    
    this.isEngineRunning = true;
    this.isPaused = false;

    if (this.textQueue.length > 0) {
      this.dockController(); // Instantly switch to docked agent mode
      this.playCurrentChunk();
      this.startKeepAlive();
    }
  }

  playCurrentChunk() {
    if (this.currentChunkIndex >= this.textQueue.length) {
      this.stopSpeech();
      return;
    }

    const textToSpeak = this.textQueue[this.currentChunkIndex];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    utterance.rate = this.config.speechRate || 1.0;
    utterance.pitch = this.config.speechPitch || 1.0;
    
    // const voices = this.synth.getVoices();
    // const selectedVoice = voices.find(v => v.name === this.config.preferredVoice);
    // if (selectedVoice) utterance.voice = selectedVoice;

    // Find the voice selection block inside playCurrentChunk()
    const voices = this.synth.getVoices();
    
    // 1. Try to find the exact voice from settings
    let selectedVoice = voices.find(v => v.name === this.config.preferredVoice);
    
    // 2. Hard-coded Failsafe: If settings failed, explicitly hunt for the UK Female Voice
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.name === 'Google UK English Female');
    }
    
    // 3. Apply it if found (otherwise the browser uses its own native default)
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    if (this.config.highlightText) {
      this.applyVisualHighlight(textToSpeak);
    }

    this.updateUIState("Pause", true);

    utterance.onend = () => {
      if (!this.isPaused && this.isEngineRunning) {
        this.currentChunkIndex++;
        this.playCurrentChunk();
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        this.stopSpeech();
      }
    };

    this.synth.speak(utterance);
  }

  togglePlayback() {
    if (this.isEngineRunning) {
      if (this.isPaused) {
        this.synth.resume();
        this.isPaused = false;
        this.updateUIState("Pause", true);
      } else {
        this.synth.pause();
        this.isPaused = true;
        this.updateUIState("Resume", false);
      }
    } else {
      this.processAndStartSpeech(this.selectedText);
    }
  }

  stopSpeech() {
    this.isEngineRunning = false;
    this.isPaused = false;
    
    this.synth.cancel();
    this.stopKeepAlive();
    this.clearVisualHighlight();
    
    this.textQueue = [];
    this.currentChunkIndex = 0;
    
    this.updateUIState("Listen", false);
    this.hideController();
  }

  updateUIState(buttonText, isPlaying) {
    const btn = this.shadowRoot.querySelector('#vt-play-pause');
    const agentIcon = this.shadowRoot.querySelector('#vt-agent');
    
    if (btn) btn.textContent = buttonText;
    
    if (agentIcon) {
      if (isPlaying) {
        agentIcon.classList.remove('paused');
      } else {
        agentIcon.classList.add('paused');
      }
    }
  }

  startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.isEngineRunning && !this.isPaused) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 14000); 
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  applyVisualHighlight(text) {
    this.clearVisualHighlight();
    if (!window.find) return; 

    const selection = window.getSelection();
    const originalRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (window.find(text, false, false, true, false, true, false)) {
      const activeRange = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.className = 'voxtab-active-highlight';
      try {
        activeRange.surroundContents(span);
        this.activeHighlightNodes.push(span);
      } catch (e) {}
    }

    if (originalRange) {
      selection.removeAllRanges();
      selection.addRange(originalRange);
    }
  }

  clearVisualHighlight() {
    this.activeHighlightNodes.forEach(node => {
      const parent = node.parentNode;
      if (parent) {
        while (node.firstChild) {
          parent.insertBefore(node.firstChild, node);
        }
        parent.removeChild(node);
      }
    });
    this.activeHighlightNodes = [];
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new VoxTabEngine());
} else {
  new VoxTabEngine();
}