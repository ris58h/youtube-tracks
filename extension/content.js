let video = null
let tracks = null

const navListener = function () {
    hideControls()
    video = null
    tracks = null
}
window.addEventListener("popstate", navListener)
window.addEventListener("yt-navigate-start", navListener)
// old design
//TODO 'spfdone' fires with 'popstate' (double navListener call on history back)
window.addEventListener("spfdone", navListener)

let showTrackNumber = null
let useShortcuts = null
const prevGap = 3//TODO settings?

addChangeListener(function (settings) {
    showTrackNumber = settings["showTrackNumber"]
    useShortcuts = settings["useShortcuts"]
})

load(function (settings) {
    showTrackNumber = settings["showTrackNumber"]
    useShortcuts = settings["useShortcuts"]

    setInterval(function () {
        if (video == null && window.location.pathname == '/watch') {
            video = document.querySelector("video")
            if (tracks != null) {
                showControls()
            }
        }
    }, 1000)

    const tracklistSelectors = [
        "#content #description",
        "#content #description > *", // desing changed in august 2018
        "#content #comments #comment #content-text",

        // old design
        "#eow-description",
        ".comment-renderer-text-content",
    ]
    setInterval(function () {
        if (tracks == null && window.location.pathname == '/watch') {
            for (const tracklistSelector of tracklistSelectors) {
                const tracklist = document.querySelector(tracklistSelector)
                if (tracklist) {
                    const parsedTracks = parseTracks(tracklist)
                    if (parsedTracks != null && parsedTracks.length > 1) {
                        tracks = parsedTracks
                        break
                    }
                }
            }
            if (video != null && tracks != null) {
                showControls()
            }
        }
    }, 1000)

})

document.addEventListener("keyup", function (e) {
    if (useShortcuts) {
        if (e.key == 'p') {
            toPrevTrack()
        } else if (e.key == 'n') {
            toNextTrack()
        }
    }
})

function parseTracks(element) {
    if (!element.hasChildNodes()) {
        return null
    }
    const tracks = []
    const videoId = parseParams(window.location.href)['v']
    processLines(element, (line) => {
        let time = null
        for (const o of line) {
            if (o instanceof Element && o.tagName == 'A') {
                const params = parseParams(o.href)
                if (params['v'] == videoId && params['t']) {
                    time = parseTime(params['t'])
                }
            }
        }
        if (time != null) {
            let name = ""
            for (const o of line) {
                name += o instanceof Element ? o.textContent : o
            }
            name = name.replace(/[ \-[(]*\d\d?(:\d\d)+[ \-\])]*/, " ").trim()// cut out timing
            name = name.replace(/^\d\d?[.)] */, "")//cut out track number
            tracks.push({ time, name })
        }
    })
    tracks.sort((a, b) => a.time - b.time)
    return tracks
}

function processLines(parent, callback) {
    let line = []
    for (const node of parent.childNodes) {
        if (node.nodeType == Node.TEXT_NODE) {
            const text = node.textContent
            if (text.length > 0) {
                const startsWithEOL = text.charAt(0) == '\n'
                if (startsWithEOL && line.length > 0) {
                    callback(line)
                    line = []
                }
                const endsWithEOL = text.charAt(text.length - 1) == '\n'
                const textLines = text.split('\n').filter(l => l.length > 0)
                for (let i = 0; i < textLines.length; i++) {
                    const textLine = textLines[i]
                    line.push(textLine)
                    if (i < textLines.length - 1 || endsWithEOL) {
                        callback(line)
                        line = []
                    }
                }
            }
        } else if (node.nodeType == Node.ELEMENT_NODE) {
            if (node.tagName == "BR" && line.length > 0) {
                callback(line)
                line = []
            } else {
                line.push(node)
            }
        }
    }
    if (line.length > 0) {
        callback(line)
    }
}

const controlsClass = '_youtube-tracks_controls'
const controlsSelector = '.' + controlsClass

function showControls() {
    let controls = document.querySelector(controlsSelector)
    if (controls) {
        controls.style.visibility = "visible"
    } else {
        controls = createControls()
        const rightControls = document.querySelector('.ytp-right-controls')
        rightControls.parentNode.insertBefore(controls, rightControls)
    }
}

function createControls() {
    const controls = document.createElement('div')
    controls.classList.add(controlsClass)

    const prevTrackButton = document.createElement('button')
    prevTrackButton.classList.add('_youtube-tracks_controls__prev')
    prevTrackButton.classList.add('ytp-button')
    prevTrackButton.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
        <path fill="#fff" d="m 12,12 h 2 v 12 h -2 z m 3.5,6 8.5,6 0,-2 -6.5,-4 6.5,-4 V 12 z"></path>
    </svg>`
    prevTrackButton.addEventListener("click", toPrevTrack)
    addTooltip(prevTrackButton, getPrevTrackName)
    controls.appendChild(prevTrackButton)

    const trackLabel = document.createElement('div')
    trackLabel.classList.add('_youtube-tracks_controls__track-label')
    let currentTrackTimes
    const timeChangeListener = function () {
        const currentTime = video.currentTime
        if (currentTrackTimes
            && currentTime >= currentTrackTimes.from
            && currentTime < currentTrackTimes.to) {
                return
        }
        const i = getCurrentTrackIndex()
        let trackName
        if (i >= 0) {
            trackName = (showTrackNumber ? (i + 1) + '. ' : '') + tracks[i].name
            currentTrackTimes = {
                from: tracks[i].time,
                to: i < tracks.length -1 ? tracks[i + 1].time : video.duration
            }
        } else {
            trackName = ''
            if (i == -1) {
                currentTrackTimes = {
                    from: Number.MIN_VALUE,
                    to: tracks[0].time
                }
            } else {
                currentTrackTimes = {
                    from: video.duration,
                    to: Number.MAX_VALUE
                }
            }
        }
        trackLabel.textContent = trackName
    }
    video.addEventListener("timeupdate", timeChangeListener)
    controls.appendChild(trackLabel)

    const nextTrackButton = document.createElement('button')
    nextTrackButton.classList.add('_youtube-tracks_controls__next')
    nextTrackButton.classList.add('ytp-button')
    nextTrackButton.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
        <path fill="#fff" d="M 12,24 20.5,18 12,12 12,14 18.5,18 12,22 V 24 z M 22,12 v 12 h 2 V 12 h -2 z"></path>
    </svg>`
    nextTrackButton.addEventListener("click", toNextTrack)
    addTooltip(nextTrackButton, getNextTrackName)
    controls.appendChild(nextTrackButton)

    return controls
}

function hideControls() {
    const trackControls = document.querySelector(controlsSelector)
    if (trackControls) {
        trackControls.style.visibility = "hidden"
    }
}

function getCurrentTrackIndex() {
    const currentTime = video.currentTime
    if (currentTime == video.duration) {
        return -tracks.length - 1
    }
    for (let i = tracks.length - 1; i >= 0; i--) {
        if (currentTime >= tracks[i].time) {
            return i
        }
    }
    return -1
}

function toPrevTrack() {
    if (video == null || tracks == null) {
        return
    }
    const currentTime = video.currentTime
    let seekTime = 0
    for (let i = tracks.length - 1; i >= 0; i--) {
        if (currentTime > tracks[i].time + prevGap) {
            seekTime = tracks[i].time
            break
        }
    }
    video.currentTime = seekTime
}

function toNextTrack() {
    if (video == null || tracks == null) {
        return
    }
    const currentTime = video.currentTime
    const hack = 0.1 // Without this hack YouTube player starts video with the beginning.
    let seekTime = video.duration - hack
    for (const track of tracks) {
        if (currentTime < track.time) {
            seekTime = track.time
            break
        }
    }
    video.currentTime = seekTime
}

function getPrevTrackName() {
    if (video == null || tracks == null) {
        return null
    }
    const currentTime = video.currentTime
    for (let i = tracks.length - 1; i >= 0; i--) {
        const diff = currentTime - tracks[i].time
        if (diff >= 0) {
            if (diff < prevGap) {
                return i > 0 ? tracks[i - 1].name : null
            } else {
                return "Re: " + tracks[i].name//TODO better name?
            }
        }
    }
    return null
}

function getNextTrackName() {
    if (video == null || tracks == null) {
        return
    }
    const currentTime = video.currentTime
    for (const track of tracks) {
        if (currentTime < track.time) {
            return track.name
        }
    }
    return null
}

function addTooltip(target, textFunction) {
    target.addEventListener("mouseover", function () {
        const text = textFunction()
        if (text) {
            showTooltip(target, text)
        }
    })
    target.addEventListener("mouseout", hideTooltip)
    target.addEventListener("click", function () {
        const text = textFunction()
        if (text) {
            updateTooltip(text)
        } else {
            hideTooltip()
        }
    })
}

//Seems like YouTube's tooltip is created lazily, so we have to use our own tooltip.
const tooltipClass = '_youtube-tracks_tooltip'
const tooltipSelector = '.' + tooltipClass

function showTooltip(target, text) {
    let tooltip = document.querySelector(tooltipSelector)
    if (!tooltip) {
        tooltip = createTooltip()
        const parent = document.querySelector(".ytp-chrome-bottom")
        parent.appendChild(tooltip)
    }
    const parentLeft = document.querySelector(".ytp-chrome-bottom").getBoundingClientRect().left
    const targetLeft = target.getBoundingClientRect().left
    const left = targetLeft - parentLeft
    tooltip.style.left = left + "px"
    tooltip.querySelector("._youtube-tracks_tooltip-text").textContent = text
    tooltip.style.visibility = "visible"
}

function createTooltip() {
    const tooltip = document.createElement('div')
    tooltip.classList.add(tooltipClass)

    const textWrapper = document.createElement("div")
    textWrapper.classList.add("_youtube-tracks_tooltip-text-wrapper")
    tooltip.appendChild(textWrapper)

    const text = document.createElement("div")
    text.classList.add("_youtube-tracks_tooltip-text")
    textWrapper.appendChild(text)

    return tooltip
}

function hideTooltip() {
    const tooltip = document.querySelector(tooltipSelector)
    if (tooltip) {
        tooltip.style.visibility = "hidden"
    }
}

function updateTooltip(text) {
    const tooltip = document.querySelector(tooltipSelector)
    if (tooltip) {
        tooltip.querySelector("._youtube-tracks_tooltip-text").textContent = text
    }
}

function parseParams(href) {
    const noHash = href.split('#')[0]
    const paramString = noHash.split('?')[1]
    const params = {}
    if (paramString) {
        const paramsArray = paramString.split('&')
        for (const kv of paramsArray) {
            const tmparr = kv.split('=')
            params[tmparr[0]] = tmparr[1]
        }
    }
    return params
}

//TODO parse munites and hours
function parseTime(t) {
    if (t.endsWith('s')) {
        return parseInt(t.substring(0, t.length - 1))
    }
    return null
}
