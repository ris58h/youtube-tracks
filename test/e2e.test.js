const puppeteer = require('puppeteer');
const except = require("chai").expect;
const parseUrl = require("url").parse;

describe("e2e", () => {
    let browser;

    before(async () => {
        browser = await puppeteer.launch({
            headless: false, // Chrome Headless doesn't support extensions. https://github.com/GoogleChrome/puppeteer/issues/659
            args: [
                '--no-sandbox',
                '--disable-extensions-except=' + process.cwd(),
                '--load-extension=' + process.cwd(),
                '--mute-audio'
            ]
        });
    });

    describe('navigation', () => {
        let page;
        let duration = 853;

        before(async () => {
            page = await createPage("https://www.youtube.com/watch?v=Cqy6OiYRFus");

            await page.waitFor(3000);
            await waitThenScroll(page, "#comments");
            await page.waitFor(3000);
            await page.evaluate(() => window.scrollTo(0, 0));
            
            await page.waitFor(2000);
            const skipAdButton = await page.$(".videoAdUiSkipButton");
            if (skipAdButton !== null) {
                await page.click(".videoAdUiSkipButton");
                await page.waitFor(1000);
            }
        });

        it('next track', async () => {
            await setCurrentTime(page, 0);
            await testNextTrack(page, 29);
            await testNextTrack(page, 323);
            await testNextTrack(page, 538);
            await testNextTrack(page, 811);
            await testNextTrack(page, duration);
        });

        it('prev track', async () => {
            await setCurrentTime(page, duration);
            await testPrevTrack(page, 811);
            await testPrevTrack(page, 538);
            await testPrevTrack(page, 323);
            await testPrevTrack(page, 29);
            await testPrevTrack(page, 0);
        });

        after(async () => {
            await page.close();
        });
    });

    after(() => {
        browser.close();
    });

    async function createPage(url) {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (isImageUrl(request.url()) || isFontUrl(request.url())) {
                request.abort();
            } else {
                request.continue();
            }
        });
        await page.goto(url);
        return page;
    }

    function isImageUrl(url) {
        const pathname = parseUrl(url).pathname;
        if (!pathname) {
            return false;
        }
        return pathname.endsWith(".png")
            || pathname.endsWith(".jpg")
            || pathname.endsWith(".jpeg")
            || pathname.endsWith(".gif")
            || pathname.endsWith(".svg");
    }

    function isFontUrl(url) {
        const pathname = parseUrl(url).pathname;
        if (!pathname) {
            return false;
        }
        return pathname.endsWith(".woff")
            || pathname.endsWith(".woff2");
    }

    async function prevTrack(page) {
        await page.keyboard.press('KeyP');
    }

    async function nextTrack(page) {
        await page.keyboard.press('KeyN');
    }

    function scrollIntoView(element) {
        element.scrollIntoView();
    }

    async function waitThenScroll(page, selector) {
        await page.waitForSelector(selector);
        await page.$eval(selector, scrollIntoView);
    }

    async function getCurrentTime(page) {
        return await page.$eval('video', v => v.currentTime);
    }

    async function setCurrentTime(page, time) {
        await page.$eval('video', (v, t) => v.currentTime = t, time);
    }

    async function testNextTrack(page, expectedTime) {
        await nextTrack(page);
        const currentTime = await getCurrentTime(page);
        except(currentTime).to.be.closeTo(expectedTime, 1);
    }

    async function testPrevTrack(page, expectedTime) {
        await prevTrack(page);
        const currentTime = await getCurrentTime(page);
        except(currentTime).to.be.closeTo(expectedTime, 1);
    }
});
