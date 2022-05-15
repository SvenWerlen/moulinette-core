/*************************
 * Moulinette Help Indexing
 *************************/
export class MoulinetteHelpIndexing extends FormApplication {
  
  constructor(path, type) {
    super()
    this.path = path
    this.type = type
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-index",
      classes: ["mtte", "help"],
      title: game.i18n.localize("mtte.moulinetteHelpIndexing"),
      template: "modules/moulinette-core/templates/help-indexing.hbs",
      width: 700,
      height: 800,
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    const FILEUTIL = game.moulinette.applications.MoulinetteFileUtil
    const SOURCES = { data: "User Data (local)", s3: "S3 Storage", forgevtt: "My Assets Library (The Forge)" }

    // check #1 : folder has sub folders
    const browse = await FilePicker.browse(FILEUTIL.getSource(), this.path, FILEUTIL.getOptions());
    let creators = []
    // check #2 : check each creator (has sub folders)
    for(const creatorPath of browse.dirs) {
      const browse = await FilePicker.browse(FILEUTIL.getSource(), creatorPath, FILEUTIL.getOptions());
      const packs = browse.dirs.map(p => decodeURIComponent(p.split('/').pop()))
      creators.push({ name: decodeURIComponent(creatorPath.split('/').pop()), packs: packs.join("\n").replaceAll("\"", "'"), ok: packs.length > 0, count: packs.length})
    }

    // custom check #1 : has .mtte file
    const customPath = game.settings.get("moulinette-core", "customPath")
    let customOK = false
    let customFolders = []
    if(customPath && customPath.length > 0 && customPath != "null") {
      customOK = true
      let cfgFiles = await FILEUTIL.scanFolder(FILEUTIL.getSource(), customPath, ".mtte");
      // at least 1 config file?
      if(cfgFiles.length > 0) {
        for(const cfg of cfgFiles) {
          const folder = cfg.substring(0, cfg.lastIndexOf("/"));
          // read ".json" file
          const response = await fetch(cfg + "?ms=" + Date.now(), {cache: "no-store"}).catch(function(e) {
            return;
          });
          if(response.status != 200) {
            customFolders.push({ path: folder, configFile: cfg.split("/").pop(),ok: false, msg: "File cannot be read" })
            continue
          }
          let data = {}
          try {
            data = await response.json();
          } catch(e) {
            customFolders.push({ path: folder, configFile: cfg.split("/").pop(), ok: false, msg: "Not a valid JSON file" })
            continue
          }
          // case #1 : folder is a creator
          if(data.publisher && data.publisher.length >= 3 && !data.pack) {
            customFolders.push({ path: folder, configFile: cfg.split("/").pop(), ok: true, msg: `Folder represents the creator '${data.publisher}' (requires subfolders)` })
          } else if(data.publisher && data.publisher.length >= 3 && data.pack && data.pack.length >= 3) {
            customFolders.push({ path: folder, configFile: cfg.split("/").pop(), ok: true, msg: `Folder represents the creator '${data.publisher}' and pack '${data.pack}'` })
          } else {
            customFolders.push({ path: folder, configFile: cfg.split("/").pop(), ok: false, msg: "Config file is invalid. Make sure to specify 'publisher' and 'pack' correctly" })
          }
        }
      }
    }

    // other sources
    const sources = FILEUTIL.getMoulinetteSources().filter(s => s.type == this.type)

    return {
      type: this.type,
      ok: creators.length > 0,
      defPath: this.path,
      source: SOURCES[FILEUTIL.getSource()],
      creators: creators,
      custom: customOK,
      customOK: customFolders.length > 0,
      customPath: customPath,
      customFolders: customFolders,
      others: sources.length > 0 ? sources : null
    }
  }


  activateListeners(html) {
    super.activateListeners(html);
    this.html = html

    html.find(".refresh").click(ev => {
      this.render(true)
      ui.notifications.info("Help refreshed!")
    })
    html.find("h1").click(ev => {
      event.preventDefault();
      const source = event.currentTarget
      $(source).next('.section').toggle();
    })
  }

}

