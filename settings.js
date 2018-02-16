function load(callback) {
    chrome.storage.sync.get("settings", function(result) {
        if (result && result.settings) {
            callback(result.settings);
        } else {
            callback({
                "showTrackNumber": false,
                "useShortcuts": true
            });
        }
    });
}

function save(settings) {
    chrome.storage.sync.set({
        "settings": settings
    });
}