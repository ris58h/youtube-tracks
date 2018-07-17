const puppeteer = require('puppeteer')
const expect = require("chai").expect
const parseUrl = require("url").parse

describe("e2e", () => {
    let browser

    before(async () => {
        browser = await puppeteer.launch({
            headless: false, // Chrome Headless doesn't support extensions. https://github.com/GoogleChrome/puppeteer/issues/659
            args: [
                '--no-sandbox',
                '--disable-extensions-except=' + process.cwd(),
                '--load-extension=' + process.cwd(),
                '--mute-audio'
            ]
        })
    })

    describe('navigation', () => {
        let page
        const videoDuration = 853
        const tracks = [
            { time: 29, name: "гол Ребича (0:1)" },
            { time: 323, name: "гол Левандовского (1:1)" },
            { time: 538, name: "гол Ребича (1:2)" },
            { time: 811, name: "гол Гачиновича (1:3)" },
        ]

        before(async () => {
            page = await createPage("https://www.youtube.com/watch?v=Cqy6OiYRFus")

            const ad = await page.$(".videoAdUi")
            await waitThenScroll(page, "#main #comments #sections")
            await page.waitFor("ytd-comment-thread-renderer")
            await page.evaluate(() => window.scrollTo(0, 0))
            await page.waitFor("._youtube-tracks_controls")
            if (ad) {
                await page.waitFor(".videoAdUiSkipButton", { visible: true })
                await page.click(".videoAdUiSkipButton")
            }
        })

        it('next track', async () => {
            await setCurrentTime(page, 0)
            for (const track of tracks) {
                await testNextTrack(page, track.time, track.name)
            }
            await testNextTrack(page, videoDuration, "")
        })

        it('prev track', async () => {
            await setCurrentTime(page, videoDuration)
            for (const track of tracks.slice().reverse()) {
                await testPrevTrack(page, track.time, track.name)
            }
            await testPrevTrack(page, 0, "")
        })

        it('should change track label on seek', async () => {
            await testTrackLabel(page, 0, "")
            for (const track of tracks) {
                await testTrackLabel(page, track.time, track.name)
            }
        })

        it('should change track label when track changes', async () => {
            await setCurrentTime(page, tracks[0].time - 1)
            await page.waitFor(2000)
            const label = await getCurrentTrackLabel(page)
            expect(label).to.equal(tracks[0].name)
        })

        it('should show looltip', async() => {
            await testTooltip(page, 0, null, tracks[0].name)
            for (const [i, track] of tracks.entries()) {
                const prevTrackName = i == 0 ? null : tracks[i - 1].name
                const nextTrackName = i < tracks.length - 1 ? tracks[i + 1].name : null
                await testTooltip(page, track.time, prevTrackName, nextTrackName)
            }
            await testTooltip(page, videoDuration, "Re: " + tracks[tracks.length - 1].name, null)
        })

        after(async () => {
            await page.close()
        })
    })

    after(() => {
        browser.close()
    })

    async function createPage(url) {
        const page = await browser.newPage()
        await page.setRequestInterception(true)
        page.on('request', request => {
            if (isImageUrl(request.url()) || isFontUrl(request.url())) {
                request.abort()
            } else {
                request.continue()
            }
        })
        await page.goto(url)
        return page
    }

    function isImageUrl(url) {
        const pathname = parseUrl(url).pathname
        if (!pathname) {
            return false
        }
        return pathname.endsWith(".png")
            || pathname.endsWith(".jpg")
            || pathname.endsWith(".jpeg")
            || pathname.endsWith(".gif")
            || pathname.endsWith(".svg")
    }

    function isFontUrl(url) {
        const pathname = parseUrl(url).pathname
        if (!pathname) {
            return false
        }
        return pathname.endsWith(".woff")
            || pathname.endsWith(".woff2")
    }

    async function prevTrack(page) {
        await page.keyboard.press('KeyP')
    }

    async function nextTrack(page) {
        await page.keyboard.press('KeyN')
    }

    function scrollIntoView(element) {
        element.scrollIntoView()
    }

    async function waitThenScroll(page, selector) {
        await page.waitForSelector(selector)
        await page.$eval(selector, scrollIntoView)
    }

    async function getCurrentTime(page) {
        return await page.$eval('video', v => v.currentTime)
    }

    async function setCurrentTime(page, time) {
        await page.$eval('video', (v, t) => v.currentTime = t, time)
    }

    async function getCurrentTrackLabel(page) {
        return await page.$eval("._youtube-tracks_controls__track-label", e => e.textContent)
    }

    async function getCurrentTooltip(page) {
        const tooltip = await page.$("._youtube-tracks_tooltip")
        if (tooltip != null) {
            const visible = await page.evaluate(e => e.style.visibility == "visible", tooltip)
            if (visible) {
                return await page.$eval("._youtube-tracks_tooltip-text", e => e.textContent)
            }
        }
        return null
    }

    async function testNextTrack(page, expectedTime, expectedLabel) {
        await nextTrack(page)
        const currentTime = await getCurrentTime(page)
        expect(currentTime).to.be.closeTo(expectedTime, 1)
        await waitHack(page)
        const label = await getCurrentTrackLabel(page)
        expect(label).to.equal(expectedLabel)
    }

    async function testPrevTrack(page, expectedTime, expectedLabel) {
        await prevTrack(page)
        const currentTime = await getCurrentTime(page)
        expect(currentTime).to.be.closeTo(expectedTime, 1)
        await waitHack(page)
        const label = await getCurrentTrackLabel(page)
        expect(label).to.equal(expectedLabel)
    }

    async function testTrackLabel(page, time, expectedLabel) {
        await setCurrentTime(page, time)
        await waitHack(page)
        const label = await getCurrentTrackLabel(page)
        expect(label).to.equal(expectedLabel)
    }

    // It seems like it takes time to change label after 'seeked'/'timechange' event occures.
    // So we have to wait some time.
    async function waitHack(page) {
        await page.waitFor(700)
    }

    async function testTooltip(page, time, expectedPrevTooltip, expectedNextTooltip) {
        await setCurrentTime(page, time)
        await ttt("._youtube-tracks_controls__prev", expectedPrevTooltip)
        await ttt("._youtube-tracks_controls__next", expectedNextTooltip)

        async function ttt(selector, expectedTooltip) {
            await page.hover(selector)
            const tooltip = await getCurrentTooltip(page)
            expect(tooltip).to.equal(expectedTooltip)
        }
    }
})
