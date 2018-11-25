// Set up context menu at install time.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    title: 'Play/Pause Spotify',
    contexts: ['all'],
    id: 'context' + 'all',
  });
});

// Add click event
chrome.contextMenus.onClicked.addListener((/* info, tab */) => {
  handlePlayOrPauseClick(); // calls main.js method;
});
