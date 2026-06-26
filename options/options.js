document.addEventListener('DOMContentLoaded', async () => {
  const pitchInput = document.getElementById('speechPitch');
  const highlightInput = document.getElementById('highlightText');

  const data = await chrome.storage.sync.get(['speechPitch', 'highlightText']);
  pitchInput.value = data.speechPitch !== undefined ? data.speechPitch : 1.0;
  highlightInput.checked = data.highlightText !== undefined ? data.highlightText : true;

  pitchInput.addEventListener('input', (e) => {
    chrome.storage.sync.set({ speechPitch: parseFloat(e.target.value) });
  });
  
  highlightInput.addEventListener('change', (e) => {
    chrome.storage.sync.set({ highlightText: e.target.checked });
  });
});