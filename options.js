function saveOptions(e) {
  e.preventDefault();
  save({
    "showTrackNumber": document.querySelector("#showTrackNumber").checked,
    "useShortcuts": document.querySelector("#useShortcuts").checked
  });
}

function restoreOptions() {
  load(function (settings) {
    document.querySelector("#showTrackNumber").checked = settings["showTrackNumber"];
    document.querySelector("#useShortcuts").checked = settings["useShortcuts"];
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
