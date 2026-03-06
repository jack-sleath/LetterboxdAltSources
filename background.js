// Background service worker — initialises default storage on first install.

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ sources: [] });
  }
});
