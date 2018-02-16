let video = null;
let tracks = null;

const navListener = function(e) {
    hideControls();
    video = null;
    tracks = null;
}
window.addEventListener("popstate", navListener)
window.addEventListener("yt-navigate-start", navListener);

let showTrackNumber = null;
let useShortcuts = null;

addChangeListener(function (settings) {
    showTrackNumber = settings["showTrackNumber"];
    useShortcuts = settings["useShortcuts"];
})

load(function (settings) {
    showTrackNumber = settings["showTrackNumber"];
    useShortcuts = settings["useShortcuts"];

    setInterval(function () {
        if (video == null && window.location.pathname == '/watch') {
            video = document.querySelector("video");
            if (tracks != null) {
                showControls();
            }
        }
    }, 1000);
    
    setInterval(function () {
        if (tracks == null && window.location.pathname == '/watch') {
            const description = document.querySelector("#content #description");
            if (description) {
                const parsedTracks = parseTracks(description);
                if (parsedTracks != null && parsedTracks.length > 1) {
                    tracks = parsedTracks;
                }
            }
            if (tracks == null) {
                const commentText = document.querySelector("#content #comments #comment #content-text");
                if (commentText) {
                    const parsedTracks = parseTracks(commentText);
                    if (parsedTracks != null && parsedTracks.length > 1) {
                        tracks = parsedTracks;
                    }
                }
            }
            if (video != null && tracks != null) {
                showControls();
            }
        }
    }, 1000);

});

document.addEventListener("keyup", function(e) {
    if (useShortcuts) {
        if (e.key == 'p') {
            toPrevTrack();
        } else if (e.key == 'n') {
            toNextTrack();
        }
    }
});

function parseTracks(element) {
    if (!element.hasChildNodes()) {
        return null;
    }
    const tracks = [];
    const videoId = parseParams(window.location.href)['v'];
    let lineNumber = 0;
    processLines(element, (line) => {
        lineNumber++;
        let time = null;
        for (o of line) {
            if (o instanceof Element && o.tagName == 'A') {
                const params = parseParams(o.href);
                if (params['v'] == videoId && params['t']) {
                    time = parseTime(params['t']);
                }
            }
        }
        if (time != null) {
            let name = "";
            for (o of line) {
                name += o instanceof Element ? o.textContent : o;
            }
            name = name.replace(/[ \-\[\(]*\d\d?(:\d\d)+[ \-\]\)]*/, " ").trim();// cut out timing
            name = name.replace(/^\d\d?[.\)] */, "");//cut out track number
            tracks.push({time, name});
        }
    });
    tracks.sort((a, b) => a.time - b.time);
    return tracks;        
}

function processLines(parent, callback) {
    let line = [];
    for (node of parent.childNodes) {
        if (node.nodeType == Node.TEXT_NODE) {
            const text = node.textContent;
            if (text.length > 0) {
                const startsWithEOL = text.charAt(0) == '\n';
                if (startsWithEOL && line.length > 0) {
                    callback(line);
                    line = [];
                }
                const endsWithEOL = text.charAt(text.length - 1) == '\n';
                const textLines = text.split('\n').filter(l => l.length > 0);
                for (let i = 0; i < textLines.length; i++) {
                    const textLine = textLines[i];
                    line.push(textLine);
                    if (i < textLines.length - 1 || endsWithEOL) {
                        callback(line);
                        line = [];
                    }
                }
            }
        } else if (node.nodeType == Node.ELEMENT_NODE) {
            line.push(node);
        }
    }
    if (line.length > 0) {
        callback(line);
    }
}

const controlsClass = '_youtube-tracks_controls';
const controlsSelector = '.' + controlsClass;

function showControls() {
    const trackControls = document.querySelector(controlsSelector);
    if (trackControls) {
        trackControls.style.visibility = "visible";
        return;
    }

    const controls = createControls();
    const rightControls = document.querySelector('.ytp-right-controls');
    rightControls.parentNode.insertBefore(controls, rightControls);
}

function createControls() {
    const controls = document.createElement('div');
    controls.classList.add(controlsClass);
    
    const prevTrackButton = document.createElement('button');
    prevTrackButton.classList.add('ytp-button');
    prevTrackButton.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
        <path id="youtube-tracks-speeddown" fill="#fff" d="m 12,12 h 2 v 12 h -2 z m 3.5,6 8.5,6 0,-2 -6.5,-4 6.5,-4 V 12 z"></path>
    </svg>`;
    prevTrackButton.addEventListener("click", toPrevTrack); 
    controls.appendChild(prevTrackButton);

    const trackLabel = document.createElement('div');
    trackLabel.classList.add('_youtube-tracks_controls__track-label')
    setInterval(function () {
        if (video == null || tracks == null) {
            if (trackLabel.textContent != '') {
                trackLabel.textContent = '';
            }
            return;
        }
        const currentTime = video.currentTime;
        for (let i = tracks.length -1; i >= 0; i--) {
            const track = tracks[i];
            if (currentTime >= track.time) {
                let trackName = track.name;
                if (showTrackNumber) {
                    trackName = (i + 1) + '. ' + trackName;
                }
                if (trackLabel.textContent != trackName) {
                    trackLabel.textContent = trackName;
                }
                return;
            }
        }
        if (trackLabel.textContent != '') {
            trackLabel.textContent = '';
        }
    }, 1000);
    controls.appendChild(trackLabel);
    
    const nextTrackButton = document.createElement('button');
    nextTrackButton.classList.add('ytp-button');
    nextTrackButton.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
        <path id="youtube-tracks-speedup" fill="#fff" d="M 12,24 20.5,18 12,12 12,14 18.5,18 12,22 V 24 z M 22,12 v 12 h 2 V 12 h -2 z"></path>
    </svg>`;
    nextTrackButton.addEventListener("click", toNextTrack); 
    controls.appendChild(nextTrackButton);

    return controls;
}

function hideControls() {
    const trackControls = document.querySelector(controlsSelector);
    if (trackControls) {
        trackControls.style.visibility = "hidden";
    }
}

function toPrevTrack() {
    if (video == null || tracks == null) {
        return;
    }
    const currentTime = video.currentTime;
    let seekTime = 0;
    for (let i = 0; i < tracks.length; i++) {
        const prevGap = 2;
        if (currentTime < tracks[i].time + prevGap) {
            if (i == 0) {
                seekTime = 0;
            } else {
                seekTime = tracks[i - 1].time;
            }
            break;
        }
    }
    video.currentTime = seekTime;
}

function toNextTrack() {
    if (video == null || tracks == null) {
        return;
    }
    const currentTime = video.currentTime;
    let seekTime = video.duration;
    for (const track of tracks) {
        if (currentTime < track.time) {
            seekTime = track.time;
            break;
        }
    }
    video.currentTime = seekTime;
}

function parseParams(href) {
    var paramstr = href.split('?')[1];
    var paramsarr = paramstr.split('&');
    var params = {};
    for (const kv of paramsarr) {
        var tmparr = kv.split('=');
        params[tmparr[0]] = tmparr[1];
    }
    return params;
}

//TODO parse munites and hours
function parseTime(t) {
    if (t.endsWith('s')) {
        return parseInt(t.substring(0, t.length - 1));
    }
    return null;
};