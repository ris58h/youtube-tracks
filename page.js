// TODO: youtube navigation problem

(function () { //WARNING Do not remove!
var player = document.getElementById("movie_player");
if (player) {
    const tracks = [];
    
    const toPrevTrack = () => {
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
    
    const toNextTrack = () => {
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

    const rightControls = player.querySelector('.ytp-right-controls');
    const wrapper = document.createElement('div');
    wrapper.style.display = 'inline-flex';
    rightControls.parentNode.insertBefore(wrapper, rightControls);
    
    const prevTrackButton = document.createElement('button');
    prevTrackButton.classList.add('ytp-button');
    //TODO button icon
    prevTrackButton.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
        <path id="youtube-tracks-speeddown" fill="#fff" fill-rule="evenodd" d="m 28,11 0,14 0,0 0,-14 z m -18,2 16,0 0,10 -16,0 0,-10 z"></path>
    </svg>`;
    prevTrackButton.addEventListener("click", toPrevTrack); 
    wrapper.appendChild(prevTrackButton);

    const trackLabel = document.createElement('div');
    trackLabel.style.display = 'inline-block';
    trackLabel.style.textAlign = 'center';
    trackLabel.innerHTML = player.getVideoData ? player.getVideoData().title : document.querySelector('h1').innerHTML;
    setInterval(function () {
        const currentTime = player.getCurrentTime();
        for (let i = tracks.length -1; i >= 0; i--) {
            const track = tracks[i];
            if (currentTime >= track.time) {
                trackLabel.innerHTML = track.name;
                break;
            }
        }
    }, 1000) 
    wrapper.appendChild(trackLabel);
    
    const nextTrackButton = document.createElement('button');
    nextTrackButton.classList.add('ytp-button');
    //TODO button icon
    nextTrackButton.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
        <path id="youtube-tracks-speedup" fill="#fff" fill-rule="evenodd" d="m 28,11 0,14 0,0 0,-14 z m -18,2 16,0 0,10 -16,0 0,-10 z"></path>
    </svg>`;
    nextTrackButton.addEventListener("click", toNextTrack); 
    wrapper.appendChild(nextTrackButton);

    document.addEventListener("keyup", function(e) {
        if (e.key == 'p') {
            toPrevTrack();
        } else if (e.key == 'n') {
            toNextTrack();
        }
    });

    const processDescription = description => {
        //TODO parse munites and hours
        const parseTime = (t) => {
            if (t.endsWith('s')) {
                return parseInt(t.substring(0, t.length - 1));
            }
            return null;
        };

        const processLines = (parent, callback) => {
            let line = [];
            for (node of parent.childNodes) {
                if (node.nodeType == Node.TEXT_NODE) {
                    const textLines = node.textContent.split('\n');
                    for (let i = 0; i < textLines.length; i++) {
                        const textLine = textLines[i];
                        if (textLine.length > 0) {
                            line.push(textLine);
                            callback(line);
                            line = [];
                        } else if (line.length > 0) {
                            callback(line);
                            line = [];
                        }
                    }
                    if (line.length > 0) {
                        callback(line);
                        line = [];
                    }
                } else if (node.nodeType == Node.ELEMENT_NODE) {
                    line.push(node);
                }
            }
            if (line.length > 0) {
                callback(line);
            }
        }

        const videoId = parseParams(window.location.href)['v'];
        processLines(description, (line) => {
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
                //TODO better name extraction
                let name = "";
                for (o of line) {
                    name += o instanceof Element ? o.textContent : o;
                }
                tracks.push({time, name});
            }
        });
        tracks.sort((a, b) => a.time - b.time);
    }

    const descriptionId = 'description';
    const description = document.querySelector('#' + descriptionId);
    if (description) {
        processDescription(description);
    } else {
        const observerCallback = function(mutations, observer) {
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                var addedNodes = mutation.addedNodes;
                for (var j = 0; j < addedNodes.length; j++) {
                    var addedNode = addedNodes[j];
                    if (addedNode.id === 'description') {
                        processDescription(addedNode);
                        observer.disconnect();
                        return;
                    } else {
                        if (addedNode.querySelector) {
                            const description = addedNode.querySelector('#' + descriptionId);
                            if (description) {
                                processDescription(description);
                                observer.disconnect();
                                return;
                            }
                        }
                    }
                }
            }
        };
        const observer = new MutationObserver(observerCallback);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
}

//TODO multiple params with same name
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
}());