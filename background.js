chrome.runtime.onInstalled.addListener(() => {
  // Set default configurations on first install
  chrome.storage.sync.get(['extensionEnabled'], (res) => {
    if (res.extensionEnabled === undefined) {
      chrome.storage.sync.set({
        extensionEnabled: true,
        hoverWidgetEnabled: true,
        preferredVoice: 'Google UK English Female',
        speechRate: 1.0,
        speechPitch: 1.0,
        highlightText: true
      });
    }
  });

  // Create right-click context menu
  chrome.contextMenus.create({
    id: "voxtab-read-selection",
    title: "Speak Selected Text",
    contexts: ["selection"]
  });
});

// Listen for context menu clicks and send payload to the active tab
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "voxtab-read-selection" && tab.id) {
    chrome.tabs.sendMessage(tab.id, { 
      action: "read_selected_text", 
      text: info.selectionText 
    }).catch((err) => console.log("Tab not ready to receive message:", err));
  }
});