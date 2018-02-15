(function () {
    let player = null;
    let tracks = null;

    const navListener = function(e) {
        hideControls();
        player = null;
        tracks = null;
    }
    window.addEventListener("popstate", navListener)
    window.addEventListener("yt-navigate-start", navListener);

    setInterval(function () {
        if (player == null && window.location.pathname == '/watch') {
            player = document.querySelector("#movie_player");
            if (tracks != null && tracks.length > 0) {
                showControls();
            }
        }
    }, 1000);

    setInterval(function () {
        if (tracks == null && window.location.pathname == '/watch') {
            const description = document.querySelector("#content #description");
            if (description) {
                const parsedTracks = parseTracks(description);
                if (parsedTracks != null && parsedTracks.length > 0) {
                    tracks = parsedTracks;
                }
            }
            if (tracks == null) {
                const commentText = document.querySelector("#content #comments #comment #content-text");
                if (commentText) {
                    const parsedTracks = parseTracks(commentText);
                    if (parsedTracks != null && parsedTracks.length > 0) {
                        tracks = parsedTracks;
                    }
                }
            }
            if (player != null && tracks != null && tracks.length > 0) {
                showControls();
            }
        }
    }, 1000);
    
    document.addEventListener("keyup", function(e) {
        if (e.key == 'p') {
            toPrevTrack();
        } else if (e.key == 'n') {
            toNextTrack();
        }
    });

    function parseTracks(element) {
        if (!element.hasChildNodes()) {
            return null;
        }
        const tracks = [];
        const videoId = parseParams(window.location.href)['v'];
        processLines(element, (line) => {
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
                name = name.replace(/[ \-\[\(]*\d\d?(:\d\d)+[ \-\]\)]*/, " ").trim();
                name = name.replace(/^\d\d?[.\)] */, "")
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
        const trackControls = player.querySelector(controlsSelector);
        if (trackControls) {
            trackControls.style.visibility = "visible";
            return;
        }

        const controls = createControls();
        const rightControls = player.querySelector('.ytp-right-controls');
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
            if (player == null || tracks == null || tracks.length == 0) {
                if (trackLabel.textContent != '') {
                    trackLabel.textContent = '';
                }
                return;
            }
            const currentTime = player.getCurrentTime();
            for (let i = tracks.length -1; i >= 0; i--) {
                const track = tracks[i];
                if (currentTime >= track.time) {
                    if (trackLabel.textContent != track.name) {
                        trackLabel.textContent = track.name;
                    }
                    return;
                }
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
        if (player == null) {
            return;
        }
        const trackControls = player.querySelector(controlsSelector);
        if (trackControls) {
            trackControls.style.visibility = "hidden";
        }
    }

    function toPrevTrack() {
        if (player == null || tracks == null || tracks.length == 0) {
            return;
        }
        const currentTime = player.getCurrentTime();
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
        player.seekTo(seekTime, true);
    }
    
    function toNextTrack() {
        if (player == null || tracks == null || tracks.length == 0) {
            return;
        }
        const currentTime = player.getCurrentTime();
        let seekTime = player.getDuration();
        for (const track of tracks) {
            if (currentTime < track.time) {
                seekTime = track.time;
                break;
            }
        }
        player.seekTo(seekTime, true);
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
}());