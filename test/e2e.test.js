const puppeteer = require('puppeteer')
const except = require("chai").expect
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

            await waitThenScroll(page, "#main #comments #sections")
            await page.waitFor("ytd-comment-thread-renderer")
            await page.evaluate(() => window.scrollTo(0, 0))
            await page.waitFor("._youtube-tracks_controls")
            const skipAdButton = await page.$(".videoAdUiSkipButton")
            if (skipAdButton !== null) {
                await page.click(".videoAdUiSkipButton")
            }
        })

        it('next track', async () => {
            await setCurrentTime(page, 0)
            for (const track of tracks) {
                await testNextTrack(page, track.time, track.name)
            }
            await testNextTrack(page, videoDuration, "гол Гачиновича (1:3)")
        })

        it('prev track', async () => {
            await setCurrentTime(page, videoDuration)
            for (const track of tracks.slice().reverse()) {
                await testPrevTrack(page, track.time, track.name)
            }
            await testPrevTrack(page, 0, "")
        })

        it('track label', async () => {
            await testTrackLabel(page, 0, "")
            for (const track of tracks) {
                await testTrackLabel(page, track.time, track.name)
            }
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

    async function testNextTrack(page, expectedTime, expectedLabel) {
        await nextTrack(page)
        const currentTime = await getCurrentTime(page)
        except(currentTime).to.be.closeTo(expectedTime, 1)
        const label = await getCurrentTrackLabel(page)
        except(label).to.equal(expectedLabel)
    }

    async function testPrevTrack(page, expectedTime, expectedLabel) {
        await prevTrack(page)
        const currentTime = await getCurrentTime(page)
        except(currentTime).to.be.closeTo(expectedTime, 1)
        const label = await getCurrentTrackLabel(page)
        except(label).to.equal(expectedLabel)
    }

    async function testTrackLabel(page, time, expectedLabel) {
        await setCurrentTime(page, time)
        await page.waitFor(1000)//It should be the same as label change frequency.
        const label = await getCurrentTrackLabel(page)
        except(label).to.equal(expectedLabel)
    }
})
