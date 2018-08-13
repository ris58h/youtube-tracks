function saveOptions() {
    save({
        "showTrackNumber": document.querySelector("#showTrackNumber").checked,
        "useShortcuts": document.querySelector("#useShortcuts").checked
    })
}

function restoreOptions() {
    load(function (settings) {
        document.querySelector("#showTrackNumber").checked = settings["showTrackNumber"]
        document.querySelector("#useShortcuts").checked = settings["useShortcuts"]
    })
}

document.addEventListener("DOMContentLoaded", function () {
    restoreOptions()
    document.querySelector("#showTrackNumber").addEventListener('change', saveOptions)
    document.querySelector("#useShortcuts").addEventListener('change', saveOptions)
})
