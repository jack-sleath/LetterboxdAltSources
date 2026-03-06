// Background service worker — initialises default storage on first install and
// opens the options page on request from the content script.

// Seeded on first install so the extension does something out of the box, and
// so there's a worked example to copy when adding your own sources.
const DEFAULT_SOURCES = [
  {
    id: 'default-youtube',
    name: 'YouTube',
    baseUrl: 'https://www.youtube.com/results?search_query=',
    iconUrl: 'https://www.youtube.com/favicon.ico',
    extraText: 'full movie',
    encodeUrlParams: false,
    spacesToPlus: true,
    addYear: true,
    removePunctuation: false,
    punctuationToSpaces: false,
  },
];

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ sources: DEFAULT_SOURCES });
  }
});

// Content scripts can't open the options page themselves, so the "Add sources →"
// link in the empty state asks us to do it.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'open_options') {
    chrome.runtime.openOptionsPage();
  }
});
