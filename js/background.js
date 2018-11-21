// Set up context menu at install time.
chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        "title": "Play/Pause Spotify",
        "contexts": ["all"],
        "id": "context" + "all"
    });
});

// Add click event
chrome.contextMenus.onClicked.addListener(function (/*info, tab*/) {
    handlePlayOrPauseClick(); // calls main.js method;
});