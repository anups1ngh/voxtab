document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    extensionEnabled: document.getElementById('extensionEnabled'),
    hoverWidgetEnabled: document.getElementById('hoverWidgetEnabled'),
    voiceSelect: document.getElementById('voiceSelect'),
    speechRate: document.getElementById('speechRate'),
    rateLabel: document.getElementById('rateLabel'),
    openOptions: document.getElementById('openOptions')
  };

  const populateVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    elements.voiceSelect.innerHTML = '<option value="">System Default</option>';
    
    voices.sort((a, b) => a.lang.localeCompare(b.lang)).forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.name;
      const isLocal = voice.localService ? "(Local)" : "(Cloud)";
      option.textContent = `${voice.name} [${voice.lang}] ${isLocal}`;
      elements.voiceSelect.appendChild(option);
    });

    chrome.storage.sync.get(['preferredVoice'], (res) => {
      if (res.preferredVoice) elements.voiceSelect.value = res.preferredVoice;
    });
  };

  populateVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  const data = await chrome.storage.sync.get([
    'extensionEnabled', 
    'hoverWidgetEnabled', 
    'preferredVoice', 
    'speechRate'
  ]);
  
  elements.extensionEnabled.checked = data.extensionEnabled !== false;
  elements.hoverWidgetEnabled.checked = data.hoverWidgetEnabled !== false;
  if (data.preferredVoice) elements.voiceSelect.value = data.preferredVoice;
  elements.speechRate.value = data.speechRate || 1.0;
  elements.rateLabel.textContent = `Reading Speed: ${elements.speechRate.value}x`;

  elements.extensionEnabled.addEventListener('change', (e) => chrome.storage.sync.set({ extensionEnabled: e.target.checked }));
  elements.hoverWidgetEnabled.addEventListener('change', (e) => chrome.storage.sync.set({ hoverWidgetEnabled: e.target.checked }));
  elements.voiceSelect.addEventListener('change', (e) => chrome.storage.sync.set({ preferredVoice: e.target.value }));
  
  elements.speechRate.addEventListener('input', (e) => {
    elements.rateLabel.textContent = `Reading Speed: ${e.target.value}x`;
    chrome.storage.sync.set({ speechRate: parseFloat(e.target.value) });
  });

  elements.openOptions.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});