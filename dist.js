const fs = require('fs-extra')

{(async function() {
    await fs.remove("./dist")
    const version = (await fs.readJson("./extension/manifest.json")).version
    const dest = "./dist/youtube-tracks-" + version
    await fs.ensureDir(dest)
    await fs.copy("./extension", dest)
})()}
