const fs = require('fs-extra')

{(async function() {
    await fs.remove("./dist")
    const version = (await fs.readJson("./manifest.json")).version
    const dest = "./dist/youtube-tracks-" + version
    async function copyToDest(src) {
        await fs.copy("./" + src, dest + "/" + src)
    }

    await fs.ensureDir(dest)
    await copyToDest("icons")
    await copyToDest("content.js")
    await copyToDest("manifest.json")
    await copyToDest("options.html")
    await copyToDest("options.js")
    await copyToDest("content.css")
    await copyToDest("settings.js")
})()}
