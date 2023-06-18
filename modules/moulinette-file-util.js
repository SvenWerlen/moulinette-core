/**
 * Moulinette Core class
 * 
 * Provides functions for all other modules
 */

export class MoulinetteFileUtil {

  static REMOTE_BASE = "https://mttecloudstorage.blob.core.windows.net"
  static REMOTE_BASE_S3 = "https://nyc3.digitaloceanspaces.com"
  static LOCAL_SOURCES = ["data", "public"]

  // maximum filesize for generating thumbnails
  static MAX_THUMB_FILESIZE = 10*1024*1024 // 10 MB

  // keep baseURL in cache
  static _s3BaseURL;
  
  /**
   * Detects which source to use (depending if server si Forge or local)
   */
  static getSource() {
    var source = "data";
    if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
      source = "forgevtt";
    }
    const bucket = game.settings.get("moulinette-core", "s3Bucket")
    if(bucket && bucket.length > 0 && bucket != "null") {
      source = "s3"
    }
    
    return source;
  }
  
  static getOptions() {
    let options = {}
    const bucket = game.settings.get("moulinette-core", "s3Bucket")
    if(bucket && bucket.length > 0 && bucket != "null") {
      options.bucket = bucket
    }
    return options;
  }
  
  /**
   * Returns the base URL when available
   */
  static async getBaseURL(source = null) {
    const bucket = game.settings.get("moulinette-core", "s3Bucket")
    if((!source || source == "s3") && bucket && bucket.length > 0 && bucket != "null") {
      // in memory?
      if(MoulinetteFileUtil._s3BaseURL) {
        return MoulinetteFileUtil._s3BaseURL
      }

      // DOESN'T WORK WITH V11 anymore
      //const e = game.data.files.s3.endpoint;
      //return `${e.protocol}//${bucket}.${e.host}/`
      let root = await FilePicker.browse(MoulinetteFileUtil.getSource(), "", MoulinetteFileUtil.getOptions());
      let baseURL = ""
      
      // Workaround - Moulinette requires 1 file to fetch base URL of S3 storage
      if(root.files.length == 0) {
        await FilePicker.upload("s3", "", new File(["Do NOT delete. Required by Moulinette"], "mtte.txt"), MoulinetteFileUtil.getOptions())
        root = await FilePicker.browse(MoulinetteFileUtil.getSource(), "", MoulinetteFileUtil.getOptions());
      }
      if(root.files.length > 0) {
        const file = root.files[0]
        baseURL = file.substr(0, file.lastIndexOf("/") + 1)
      }
      // keep in cache (avoid API call to S3)
      MoulinetteFileUtil._s3BaseURL = baseURL
      return baseURL
    } 

    // #40 : Non-host GMs can't use Moulinette for games hosted on The Forge
    // https://github.com/SvenWerlen/moulinette-core/issues/40
    if (typeof ForgeVTT !== "undefined" && ForgeVTT.usingTheForge) {
      if (!source || source == "forgevtt")  {
        const theForgeAssetsLibraryUserPath = ForgeVTT.ASSETS_LIBRARY_URL_PREFIX + (await ForgeAPI.getUserId() || "user");
        return theForgeAssetsLibraryUserPath ? theForgeAssetsLibraryUserPath + "/" : "";
      }
      else if(source == "forge-bazaar") {
        return ForgeVTT.ASSETS_LIBRARY_URL_PREFIX + "bazaar/assets/"
      }
    }

    return "";
  }
  
  /**
   * Generates clean path (without space or special character)
   */
  static generatePathFromName(name) {
    let cleanName = name.replace(/[^\w\s]/gi, '')
    return cleanName.replace(/ /g, "-").toLowerCase()
  }
  
  /**
   * Creates a new folder
   */
  static async createFolderIfMissing(parent, childPath) {
    // folder don't have to be created on S3 (automatically handled by S3 provider)
    if(MoulinetteFileUtil.getSource() == "s3") return

    const parentFolder = await FilePicker.browse(MoulinetteFileUtil.getSource(), parent, MoulinetteFileUtil.getOptions());
    if (!parentFolder.dirs.includes(childPath)) {
      try {
        await FilePicker.createDirectory(MoulinetteFileUtil.getSource(), childPath, MoulinetteFileUtil.getOptions());
      } catch(exc) {
        console.warn(`MoulinetteFileUtil was not able to create ${childPath}`, exc)
      }
    }
  }
  
  /**
   * Creates folders recursively (much better than previous)
   */
  static async createFolderRecursive(path) {
    const source = MoulinetteFileUtil.getSource()
    // folder don't have to be created on S3 (automatically handled by S3 provider)
    if(source == "s3") return
    
    const folders = path.split("/")
    let curFolder = ""
    for( const f of folders ) {
      const parentFolder = await FilePicker.browse(source, curFolder, MoulinetteFileUtil.getOptions());
      curFolder += (curFolder.length > 0 ? "/" : "" ) + f
      const dirs = parentFolder.dirs.map(d => decodeURIComponent(d))
      if (!dirs.includes(decodeURIComponent(curFolder))) {
        try {
          console.log(`MoulinetteFileUtil | Create folder ${curFolder}`)
          await FilePicker.createDirectory(source, curFolder, MoulinetteFileUtil.getOptions());
        } catch(exc) {
          console.warn(`MoulinetteFileUtil was not able to create ${curFolder}`, exc)
        }
      }
    }
  }

  /**
   * Re-encode URL but leaving the "/" untouched
   */
  static encodeURL(url) {
    const parts = url.split("/")
    const encodedParts = parts.map(p => encodeURIComponent(p))
    return encodedParts.join("/")
  }
  
  /**
   * Checks if a file exists (based on its path)
   */
  static async fileExists(path, toSource) {
    const source = toSource ? toSource : MoulinetteFileUtil.getSource()
    try {
      const basePath = await MoulinetteFileUtil.getBaseURL(source)
      let parentFolderPath = basePath && basePath.length > 0 && path.startsWith(basePath) ? path.substring(basePath.length) : path
      parentFolderPath = parentFolderPath.substring(0, parentFolderPath.lastIndexOf('/'))

      let parentFolder = null
      // optimization (LukeAbby's idea!)
      if(MoulinetteFileUtil.lastFolder == parentFolderPath) {
        parentFolder = MoulinetteFileUtil.lastFolderData
      } else {
        parentFolder = await FilePicker.browse(source, parentFolderPath, MoulinetteFileUtil.getOptions());
        MoulinetteFileUtil.lastFolder = parentFolderPath
        MoulinetteFileUtil.lastFolderData = parentFolder
      }
      const decodedPaths = parentFolder.files.map(f => decodeURIComponent(f))

      // ForgeVTT FilePicker returns files with path inclusive of basePath, which is the current user's asset library
      if (typeof ForgeVTT !== "undefined" && ForgeVTT.usingTheForge) {
        const theForgeAssetsLibraryUserPath = ForgeVTT.ASSETS_LIBRARY_URL_PREFIX + (await ForgeAPI.getUserId() || "user");
        path = (theForgeAssetsLibraryUserPath ? theForgeAssetsLibraryUserPath + "/" : "") + path;
      }
      // FilePicker returns files with path inclusive of basePath for S3
      else if(source == "s3") {
        path = basePath + path
      }
      return parentFolder.files.includes(path) || decodedPaths.includes(path);
    } catch(exc) {
      console.log(exc)
      return false
    }
  }
  
  
  /**
   * Uploads a file into the right folder
   */
  static async upload(file, name, folderSrc, folderPath, overwrite = false) {
    const source = MoulinetteFileUtil.getSource()
    MoulinetteFileUtil.createFolderIfMissing(folderSrc, folderPath)
    
    // check if file already exist
    const baseURL = await MoulinetteFileUtil.getBaseURL();
    let base = await FilePicker.browse(source, folderPath, MoulinetteFileUtil.getOptions());
    const path = `${folderPath}/${name}`
    let exist = base.files.filter(f =>  decodeURIComponent(f) == path)
    if(exist.length > 0 && !overwrite) return {path: `${baseURL}${folderPath}/${name}`};
    
    try {
      if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
        console.log("MoulinetteFileUtil | Uploading with The Forge")
        return await ForgeVTT_FilePicker.upload(source, folderPath, file, MoulinetteFileUtil.getOptions(), {notify: false});
      } else {
        return await FilePicker.upload(source, folderPath, file, MoulinetteFileUtil.getOptions(), {notify: false});
      }
    } catch (e) {
      console.log(`MoulinetteFileUtil | Not able to upload file ${name}`)
      console.log(e)
    }
  }
  
  /**
   * Uploads a file into the right folder (improved version)
   */
  static async uploadFile(file, name, folderPath, overwrite = false, toSource) {
    const source = toSource ? toSource : MoulinetteFileUtil.getSource()
    await MoulinetteFileUtil.createFolderRecursive(folderPath)
    
    // check if file already exist
    const baseURL = await MoulinetteFileUtil.getBaseURL();
    let base = await FilePicker.browse(source, folderPath, MoulinetteFileUtil.getOptions());
    let exist = base.files.filter(f => decodeURIComponent(f) == `${folderPath}/${name}`)
    if(exist.length > 0 && !overwrite) return { path: `${baseURL}${folderPath}/${name}` };
    
    try {
      if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
        console.log("MoulinetteFileUtil | Uploading with The Forge")
        return await ForgeVTT_FilePicker.upload(source, folderPath, file, MoulinetteFileUtil.getOptions(), {notify: false});
      } else {
        return await FilePicker.upload(source, folderPath, file, MoulinetteFileUtil.getOptions(), {notify: false});
      }
    } catch (e) {
      console.log(`MoulinetteFileUtil | Not able to upload file ${name}`)
      console.log(e)
    }
  }
  
  
  /**
   * Scans a folder for assets matching provided extension
   * (requires a 2-level folder structure => publishers-packs-files)
   */  
  static async scanAssets(sourcePath, extensions, source) {
    const debug = game.settings.get("moulinette-core", "debugScanAssets")
    if(!source) {
      source = MoulinetteFileUtil.getSource()
    }
    // first level = publishers
    let publishers = []
    if(debug) console.log(`Moulinette FileUtil | Root: scanning ${sourcePath} ...`)
    let dir1 = await FilePicker.browse(source, sourcePath, MoulinetteFileUtil.getOptions());
    if(debug) console.log(`Moulinette FileUtil | Root: ${dir1.dirs.length} subfolders found.`)
      
    // stop scanning if ignore.info file found
    if(dir1.files.find(f => f.endsWith("/ignore.info"))) {
      if(debug) console.log(`Moulinette FileUtil | File ignore.info found. Stop scanning.`)
      return publishers;
    }
      
    for(const pub of dir1.dirs) {
      if(debug) console.log(`Moulinette FileUtil | Root: processing publisher ${pub}...`)
      publishers.push({ 
        publisher: decodeURIComponent(pub.split('/').pop()), 
        packs: await MoulinetteFileUtil.scanAssetsInPublisherFolder(source, decodeURIComponent(pub), extensions, debug),
      })
    }
    return publishers
  }
  
  /**
   * Prepares all moulinette sources, based on user configuration
   * - All automatic sources (game.moulinette.sources) unless disabled by user
   * - All custom sources from user
   */
  static getMoulinetteSources() {
    // prepare sources
    const sources = []
    const settings = Array.isArray(game.settings.get("moulinette", "sources")) ? game.settings.get("moulinette", "sources") : []
    for(const s of settings) {
      if(!s.auto) sources.push({
          type: s.type,
          forceRefresh: s.forceRefresh,
          publisher: s.creator,
          pack: s.pack,
          filters: s.filters,
          source: s.source,
          path: s.path
        })
    }

    for(const s of game.moulinette.sources) {
      const setting = settings.find(sett => sett.auto && sett.source == s.source && sett.path == s.path && sett.type == s.type)
      if(!setting || setting.enabled) {
        sources.push({
          type: s.type,
          forceRefresh: setting ? setting.forceRefresh : s.forceRefresh,
          publisher: setting && setting.creator ? setting.creator : s.publisher,
          pack: setting && setting.pack ? setting.pack : s.pack,
          filters: s.filters,
          source: s.source,
          path: s.path
        })
      }
    }
    return sources
  }

  /**
   * Scans a source (core) for assets matching type
   */  
  static async updateSourceIndex(indexData, type, extensions) {
    const debug = game.settings.get("moulinette-core", "debugScanAssets")

    const sources = MoulinetteFileUtil.getMoulinetteSources()
    for(const source of sources) {
      const baseURL = await MoulinetteFileUtil.getBaseURL(source.source)
      if(source.type == type) {
        // check data
        if(!source.publisher || !source.pack || !source.path || !source.source) {
          console.warn(`Moulinette FileUtil | Invalid moulinette source!`, source)
          continue;
        } 

        const key = `${source.type}:${source.source}:${source.path}`
        
        // filter extensions
        const filteredExtensions = extensions.filter(e => !source.filters || source.filters.includes(e))
        console.info(`Moulinette FileUtil | Indexing ${source.path} using filters: ${filteredExtensions}`, source)

        // check if index already exists
        if(key in indexData && !source.forceRefresh) {
          console.warn(game.i18n.format("mtte.indexNoRefresh", {path: source.path}));
          continue;
        }
        
        // retrieve all assets in source path
        let creators = []

        // 1st level = creators, 2nd levl = packs
        if(source.publisher == "*") {
          creators = await MoulinetteFileUtil.scanAssets(source.path, filteredExtensions, source.source)
        } 
        // 1st level = packs
        else if(source.pack == "*") {
          creators = [{
            publisher: source.publisher,
            packs: await MoulinetteFileUtil.scanAssetsInPublisherFolder(source.source, source.path, filteredExtensions, debug)
            }]
        }
        // 1st level = assets
        else {
          const assets = await MoulinetteFileUtil.scanAssetsInPackFolder(source.source, source.path, filteredExtensions, debug)
          creators = [{
            publisher: source.publisher, 
            packs: [{ 
              name: source.pack, 
              source: source.source,
              path: baseURL + source.path, 
              assets: assets,
              isLocal: MoulinetteFileUtil.LOCAL_SOURCES.includes(source.source),
            }] 
          }]
        }

        // update index
        indexData[key] = creators
      }
    }
  }
  
  /**
   * Scans a folder for assets matching provided extension
   * (requires a 1-level folder structure => packs-files)
   */  
  static async scanAssetsInPublisherFolder(source, sourcePath, extensions, debug = false) {
    // first level = packs
    let packs = []
    if(debug) console.log(`Moulinette FileUtil | Publisher: scanning ${sourcePath} ...`)
    let dir = await FilePicker.browse(source, sourcePath, MoulinetteFileUtil.getOptions());
    if(debug) console.log(`Moulinette FileUtil | Publisher: ${dir.dirs.length} subfolders found.`)
    
    // stop scanning if ignore.info file found
    if(dir.files.find(f => f.endsWith("/ignore.info"))) {
      if(debug) console.log(`Moulinette FileUtil | File ignore.info found. Stop scanning.`)
      return packs;
    }
    
    for(const pack of dir.dirs) {
      if(debug) console.log(`Moulinette FileUtil | Publisher: processing pack ${pack}...`)
      const packEntry = { 
        name: decodeURIComponent(pack.split('/').pop()), 
        path: pack, 
        source: source,
        isLocal: MoulinetteFileUtil.LOCAL_SOURCES.includes(source),
        assets: await MoulinetteFileUtil.scanAssetsInPackFolder(source, decodeURIComponent(pack), extensions, debug) 
      }
      
      // check if folder has meta-information attached  
      let dir = await FilePicker.browse(source, decodeURIComponent(pack), MoulinetteFileUtil.getOptions());
      const info = dir.files.find(f => f.endsWith("/moulinette.json"))
      if(info) {
        if(debug) console.log(`Moulinette FileUtil | Analyzing ${info} file...`)
        const response = await fetch(info + "?ms=" + Date.now(), {cache: "no-store"}).catch(function(e) {
          console.log(`MoulinetteFileUtil | Cannot download tiles/asset list`, e)
          return;
        });
        if(response.status != 200) continue;
        let data = {}
        try {
          data = await response.json();
          packEntry.meta = data
          if(debug) console.log(`Moulinette FileUtil | PackEntry meta`, data)
        } catch(e) {
          console.warn(`${info} not processed.`, e);
        }
      }
    
      packs.push(packEntry)
    }
    return packs
  }
  
  /**
   * Scans a folder for assets matching provided extension
   * (files)
   */  
  static async scanAssetsInPackFolder(source, packPath, extensions, debug = false) {
    let files = []
    try {
      files = await MoulinetteFileUtil.scanFolder(source, packPath, extensions, debug)
    } catch(e) {
      console.error(`MoulinetteFileUtil | Not able to scan assets in ${packPath}`, e)
    }
    files = files.filter(f => f.indexOf("_thumb") < 0) // remove thumbnails
    if(debug) console.log(`Moulinette FileUtil | Pack: ${files.length} assets found.`)
    // special case for ForgeVTT => keep entire path
    if(typeof ForgeVTT !== "undefined" && ForgeVTT.usingTheForge && source != "public") {
      return files.map( (path) => { return decodeURIComponent(path) } )
    } else {
      return files.map( (path) => { return decodeURIComponent(path).split(decodeURIComponent(packPath))[1].substring(1) } ) // remove front /
    }
  }
  
  /**
   * Scans a folder for assets matching provided extension
   * (files)
   */  
  static async scanAssetsInCustomFolders(sourcePath, extensions) {
    if(sourcePath == ".") sourcePath = ""
    const debug = game.settings.get("moulinette-core", "debugScanAssets")
    let publishers = []
    const baseURL = await MoulinetteFileUtil.getBaseURL()
    const source = MoulinetteFileUtil.getSource()
    if(debug) console.log(`Moulinette FileUtil | Scanning custom folder ${sourcePath} for .mtte files...`)
    let cfgFiles = await MoulinetteFileUtil.scanFolder(source, sourcePath, ".mtte");
    for(const cfg of cfgFiles) {
      // read ".json" file 
      if(debug) console.log(`Moulinette FileUtil | Analyzing ${cfg} file...`)
      const response = await fetch(cfg + "?ms=" + Date.now(), {cache: "no-store"}).catch(function(e) {
        console.log(`MoulinetteFileUtil | Cannot download configuration file`, e)
        return;
      });
      if(response.status != 200) continue;
      let data = {}
      try {
        data = await response.json();
      } catch(e) {
        console.warn(`${cfg} not processed.`, e);
      }

      let folder = cfg.substring(0, cfg.lastIndexOf("/"));
      if(baseURL.length > 0 && folder.startsWith(baseURL)) {
        folder = folder.substring(baseURL.length)
      }
      // case #1 : folder is a publisher and subfolders represent packs for that publisher
      if(data.publisher && data.publisher.length >= 3 && !data.pack) {
        if(debug) console.log(`Moulinette FileUtil | Case #1. Publisher. Scanning subfolders as packs...`)
        let packs = await MoulinetteFileUtil.scanAssetsInPublisherFolder(source, folder, extensions, debug)
        // remove empty packs
        packs = packs.filter(p => p.assets.length > 0) 
        if(packs.length > 0) {
          const existingPublisher = publishers.find(p => p.publisher == data.publisher)
          if(existingPublisher) {
            existingPublisher.packs.push(...packs)
          } else {
            publishers.push({ publisher: data.publisher, packs: packs})
          }
        }
      }
      // case #2 : folder is a pack
      else if(data.publisher && data.publisher.length >= 3 && data.pack && data.pack.length >= 3) {
        if(debug) console.log(`Moulinette FileUtil | Case #2. Pack. Scanning files as assets...`)
        const pack = { name: data.pack, path: folder, assets: await MoulinetteFileUtil.scanAssetsInPackFolder(source, folder, extensions, debug) }
        if(pack.assets.length > 0) {
          const existingPublisher = publishers.find(p => p.publisher == data.publisher)
          if(existingPublisher) {
            existingPublisher.packs.push(pack)
          } else {
            publishers.push({ publisher: data.publisher, packs: [pack]})
          }
        }
      }
      // case #3 : invalid file or not enough information provided => consider all files
      else {
        if(debug) console.log(`Moulinette FileUtil | Case #3. Undefined. Scanning files as assets for unknown publisher and packs...`)
        const pack = { name: game.i18n.localize("mtte.unknown"), path: folder, assets: await MoulinetteFileUtil.scanAssetsInPackFolder(source, folder, extensions, debug) }
        if(pack.assets.length > 0) {
          const existingPublisher = publishers.find(p => p.publisher == game.i18n.localize("mtte.unknown"))
          if(existingPublisher) {
            existingPublisher.packs.push(pack)
          } else {
            publishers.push({ publisher: game.i18n.localize("mtte.unknown"), packs: [pack]})
          }
        }
      }
    }
    return publishers
  }
  
  /**
   * Returns the list of all files in folder (and its subfolders) matching filter
   */
  static async scanFolder(source, path, filter, debug = false) {
    let list = []
    if(debug) console.log(`Moulinette FileUtil | Assets: scanning ${path} ...`)
    const base = await FilePicker.browse(source, path, MoulinetteFileUtil.getOptions());
    
    // stop scanning if ignore.info file found
    if(base.files.find(f => f.endsWith("/ignore.info"))) {
      if(debug) console.log(`Moulinette FileUtil | File ignore.info found. Stop scanning.`)
      return list;
    }
    
    if(debug) console.log(`Moulinette FileUtil | Assets: ${base.files.length} assets found`)
    let baseFiles = filter ? base.files.filter(f => filter.includes(f.split(".").pop().toLowerCase())) : base.files
    if(debug) console.log(`Moulinette FileUtil | Assets: ${baseFiles.length} assets kepts after filtering`)
    list.push(...baseFiles)
    
    for(const d of base.dirs) {
      const subpath = decodeURIComponent(d)
      // workaround : folder must be a subfolder
      if( subpath.startsWith(path) ) {
        const files = await MoulinetteFileUtil.scanFolder(source, subpath, filter, debug)
        list.push(...files)
      } else if(debug) console.log(`Moulinette FileUtil | Assets: ignoring ${subpath} which is NOT a subfolder of ${path} as expected!`)
    }
    return list
  }
  
  /**
   * Check SAS expiration
   * Returns remaining time (in minutes)
   */
  static getSASExpiration(sas) {
    if(Array.isArray(sas) || !sas || sas.length == 0) return 24*60
    const timeAsString = decodeURIComponent(sas.substring(3, sas.indexOf('&')))
    const timeDiff = Date.parse(timeAsString) - Date.now()
    return Math.round(timeDiff/1000/60)
  }
  
  /**
   * Reads a given URL (json) and builds an asset index
   */
  static async buildAssetIndex(urlList, special = null) {
    let assets = []
    let assetsPacks = []
    
    const cloudEnabled = game.settings.get("moulinette-core", "enableMoulinetteCloud")
    const showShowCase = game.settings.get("moulinette-core", "showCaseContent")
    
    // build tiles' index 
    let idx = 0;
    for(let URL of urlList) {
      SceneNavigation.displayProgressBar({label: game.i18n.localize("mtte.indexingMoulinette"), pct: Math.round((idx / urlList.length)*100)});
      
      // try to load from cache when exists
      let data;
      if(game.moulinette.cache.hasData(URL)) {
        data = game.moulinette.cache.getData(URL);
      } 
      else { 
        if(!cloudEnabled && URL.startsWith(game.moulinette.applications.MoulinetteClient.SERVER_URL)) {
          console.log(`Moulinette FileUtil | Moulinette Cloud disabled `)
          continue
        }
        // download index file from URL
        const noCache = "?ms=" + new Date().getTime();
        const response = await fetch(URL + noCache, {cache: "no-store"}).catch(function(e) {
          console.log(`Moulinette FileUtil | Cannot download tiles/asset list`, e)
          return;
        });
        if(!response || response.status != 200) {
          // Stop notifying users about it. Brings confusion.
          // Only do it for server unavailability
          if(URL.indexOf("index-mtte.json") < 0) {
            ui.notifications.warn(game.i18n.localize("mtte.errorBuildingAssetIndex"));
            console.warn(`Moulinette FileUtil | Couldn't load source ${URL}. Response : `, response)
            console.warn(`Moulinette FileUtil | Moulinette servers might be down?`)
          } else {
            console.warn(`Moulinette FileUtil | Moulinette couldn't find local index. You might want to index your assets.`)
          }
          continue;
        }
        data = await response.json();
        game.moulinette.cache.setData(URL, data);
        data = duplicate(data)
      }
      
      // new index format consists of dict with multiple entries
      if(!(data instanceof Array)) {
        const newData = []
        const sources = MoulinetteFileUtil.getMoulinetteSources().map(s => `${s.type}:${s.source}:${s.path}`)
        for(const key of Object.keys(data)) {
          // only active sources (or global/default ones)
          if(["global", "default", "specific"].includes(key) || sources.includes(key) ) {
            newData.push(...data[key])
          }
        }
        data = newData
      }

      try {
        let minExpiration = 24*60 // smallest expiration time
        for(const pub of data) {
          // check sas token (sas are generated per publisher)
          if(pub.packs.length > 0) {
            const minutes = MoulinetteFileUtil.getSASExpiration(pub.packs[0].sas)
            minExpiration = Math.min(minExpiration, minutes)
            if(minutes < 0) {
              console.error(`Moulinette FileUtil | Your SAS token expired for ${pub.publisher}.`)
              continue;
            } else if(minutes < 30) {
              console.warn(`Moulinette FileUtil | Your SAS token is about to expire for ${pub.publisher}. Only ${minutes} minutes remaining.`)
            }
          }
          for(const pack of pub.packs) {
            // hide showcase content
            if(pack.showCase && !showShowCase) continue;
            // add pack
            const packData = {
              idx: idx,
              packId: pack.id,
              publisher: pub.publisher,
              pubWebsite: pub.website,
              name: pack.name,
              url: pack.url,
              license: pack.license,
              licenseUrl: pack.licenseUrl,
              path: pack.path,
              count: pack.assets.length,
              isLocal: pack.isLocal,
              source: pack.source,
              isRemote: pack.path.startsWith(MoulinetteFileUtil.REMOTE_BASE) || pack.path.startsWith(MoulinetteFileUtil.REMOTE_BASE_S3),
              isShowCase: pack.showCase,
              deps: pack.deps,
              sas: pack.sas
            }
            for(let i = 0; i<pack.assets.length; i++) {
              const asset = pack.assets[i]
              // SAS for individual asset
              const sas = Array.isArray(pack.sas) ? [pack.sas[2*i],pack.sas[2*i+1]] : null
              // default (basic asset is only filepath)
              if (typeof asset === 'string' || asset instanceof String) {
                let type = pack.meta && pack.meta.type ? pack.meta.type : "img"
                let aData = { pack: idx, filename: asset, type: type}
                if(sas) { aData['sas'] = sas[0]; aData['sasTh'] = sas[1] }
                const ext = asset.substr(asset.lastIndexOf('.') + 1)
                if(URL.indexOf("moulinette/scenes/custom") >= 0) {
                  aData.type = "scene"
                }
                else if(["ogg", "mp3", "wav", "m4a", "flac", "webm"].includes(ext)) {
                  // WebM could be tiles, too (video) - unless they are from "sounds"
                  if(ext == "webm" && !pack.path.startsWith("moulinette/sounds/custom")) {
                    assets.push(duplicate(aData)); packData.count++;
                  }
                  // WebM are considered sounds - unless they are from tiles or images or remote (creators don't use that format)
                  if(ext == "webm" && (packData.isRemote || pack.path.startsWith("moulinette/tiles/custom") || pack.path.startsWith("moulinette/images/custom"))) {
                    packData.count--;
                    continue;
                  }
                  aData.type = "snd"
                  aData.duration = pack.durations && pack.durations.length > i ? pack.durations[i] : 0
                }
                assets.push(aData)

              }
              // sounds from Moulinette Cloud
              else if(asset.type == "snd") {
                const aData = { pack: idx, filename: asset.path, type: asset.type, duration: asset.duration, loop: asset.loop, title: asset.title }
                if(sas) { aData['sas'] = sas[0]; aData['sasTh'] = sas[1] }
                assets.push(aData)
                // WebM could be tiles, too (video)
                if(pack.isLocal && !pack.path.startsWith("moulinette/sounds/custom") && asset.path.substr(asset.path.lastIndexOf('.') + 1) == "webm") {
                  const aData2 = { pack: idx, filename: asset, type: pack.meta && pack.meta.type ? pack.meta.type : "img"}
                  if(sas) { aData2['sas'] = sas[0]; aData2['sasTh'] = sas[1] }
                  assets.push(aData2)
                  packData.count++;
                }
              }
              // complex type (ex: scene)
              else {
                const path = asset['path']
                delete asset['path']
                const aData = { pack: idx, filename: path ? path : asset['name'], data: asset, type: asset.type}
                if(sas) { aData['sas'] = sas[0]; aData['sasTh'] = sas[1] }
                assets.push(aData)
              }
            }
            assetsPacks.push(packData)
            idx++;
          }
        }
        
        if(minExpiration <= 0) {
          ui.notifications.error(game.i18n.localize("mtte.errorSASTokenExpired"));
        } else if(minExpiration <= 30) {
          ui.notifications.warn(game.i18n.format("mtte.errorSASTokenAboutToExpire", {minutes: minExpiration}));
        }
      } catch (e) {
        console.log(`Moulinette FileUtil | Error building index of ${URL}`, e)
      }
    }
    
    SceneNavigation.displayProgressBar({label: game.i18n.localize("mtte.indexingMoulinette"), pct: 100});
    
    if(special) {
      for(const el of special) {
        el.idx = idx
        assetsPacks.push(el)
        idx++;
      }
    }
    
    // add dependencies
    for(const pack of assetsPacks) {
      pack.depsPath = []
      if(!pack.deps) continue
      for(const dep of pack.deps) {
        const depPack = assetsPacks.find( p => p.path.endsWith("/" + dep))
        pack.depsPath.push( depPack ? { publisher: depPack.publisher, name: depPack.name, path: depPack.path } : "" )
      }
    }
    
    return { assets: assets, packs: assetsPacks }
  }
  
  /**
   * Generates a folder structure based on the index
   */
  static foldersFromIndex(files, packs) {
    // sanity check
    if(files.length == 0) return {}
    
    let folders = {}
    let id = 0;

    // sort all files back into their folders
    for(const f of files) {
      id++;
      const idx = f.filename.lastIndexOf('/')
      const parent = idx < 0 ? "" : f.filename.substring(0, idx + 1)
      f.idx = id
      if(parent in folders) {
        folders[parent].push(f)
      } else {
        folders[parent] = [f]
      }
    }
    
    return folders;
  }

  /**
   * Generates a folder structure based on the index
   */
  static foldersFromIndexImproved(files, packs) {
    // sanity check
    if(files.length == 0) return {}

    let folders = {}
    let id = 0;

    // fetch all creators and packs
    const uniqCreators = files.reduce((list, f) => list.add(packs[f.pack].publisher), new Set())
    const uniqPacks = files.reduce((list, f) => list.add(f.pack), new Set())

    // sort all files back into their folders
    for(const f of files) {
      id++;
      //const baseFolder = packs[f.pack].path.substring(base.length)
      const creator = uniqCreators.size > 1? packs[f.pack].publisher : ""
      const pack = uniqPacks.size > 1? packs[f.pack].name : ""
      const filePath = f.filename.replace(/json\/[^/]+\//g, '')
      const idx = filePath.lastIndexOf('/')
      const path = idx < 0 ? "" : "/" + filePath.substring(0, idx)

      const breadcrumb = `${decodeURIComponent(creator)}##${decodeURIComponent(pack)}##${decodeURIComponent(path)}`
      f.idx = id
      if(folders.hasOwnProperty(breadcrumb)) {
        folders[breadcrumb].push(f)
      } else {
        folders[breadcrumb] = [f]
      }
    }

    return folders;
  }
  
  /**
   * Generates the base path for moulinette
   */
  static getMoulinetteBasePath(type, publisher, pack) {
    const publisherPath = MoulinetteFileUtil.generatePathFromName(publisher)
    const packPath = MoulinetteFileUtil.generatePathFromName(pack)
    return `moulinette/${type}/${publisherPath}/${packPath}/`
  }
  
  /**
   * Downloads all provided dependencies into specified folder
   * - asset : asset for which dependencies must be downloaded
   * - pack  : asset's pack
   * - type  : type of asset (generally cloud)
   */
  static async downloadAssetDependencies(asset, pack, type, force=false) {

    const path = MoulinetteFileUtil.getMoulinetteBasePath(type, pack.publisher, pack.name)
    
    // simple type => generate 1 dependency
    if( !asset.data || asset.type == "img" ) {
      asset = { data: { deps: [ asset.filename ], eDeps: {} }, sas: asset.sas }
    }
    
    // download direct dependencies
    await MoulinetteFileUtil.downloadDependencies(asset.data.deps, pack.path, asset.sas, path, force)
    
    // download all external dependencies
    if(asset.data.eDeps) {
      for (const [idx, deps] of Object.entries(asset.data.eDeps)) {
        const i = Number(idx)
        if( i >= 0 && i < pack.depsPath.length ) {
          const ePack = pack.depsPath[i]
          const ePath = MoulinetteFileUtil.getMoulinetteBasePath(type, ePack.publisher, ePack.name)
          await MoulinetteFileUtil.downloadDependencies(deps, ePack.path, asset.sas, ePath, force)
        } else {
          console.error("Moulinette FileUtil | Invalid external dependency " + i)
        }
      }
    }
    
    // generate target paths
    // 0 => #DEP#
    // 1 => #DEP0# (external dep #1)
    // 2 => #DEP1# (external dep #2)
    // ...
    let targetPaths = []    
    const baseURL = await MoulinetteFileUtil.getBaseURL();
    targetPaths.push(baseURL + path)
    for(const dep of pack.deps) {
      targetPaths.push(baseURL + MoulinetteFileUtil.getMoulinetteBasePath(type, pack.publisher, dep))
    }
    
    return targetPaths;
  }
  
  /**
   * Downloads all dependencies into specified folder
   * - depList  : list of depenencies to download (urls)
   * - packURL  : pack base URL
   * - sas      : Azure Blob SAS
   * - destPath : target destinatin (in FoundryVTT)
   */
  static async downloadDependencies(depList, packURL, sas, destPath, force=false) {
    let results = []
    // download direct dependencies
    for(const dep of depList) {
      const filepath = destPath + dep
      const folder = decodeURIComponent(filepath.substring(0, filepath.lastIndexOf('/')))
      const filename = decodeURIComponent(dep.split('/').pop())
      const srcURL = packURL + "/" + dep + sas
      
      if(force || !await MoulinetteFileUtil.fileExists(filepath)) {
        // create target folder
        await MoulinetteFileUtil.createFolderRecursive(folder)
        // download file
        let res = await fetch(srcURL).catch(function(e) {
          console.log(`Moulinette | Not able to fetch file`, e)
        });
        if(!res) return ui.notifications.error(game.i18n.localize("mtte.errorDownload"));
    
        const blob = await res.blob()
        results.push(await MoulinetteFileUtil.uploadFile(new File([blob], filename, { type: blob.type, lastModified: new Date() }), filename, folder, force))
      }
    }
    return results;
  }
  
  
  /**
   * Downloads available assets
   */
  static async getAvailableAssets(type) {
    let assets = {}
    const AVAILABLE_ASSETS = game.moulinette.applications.MoulinetteClient.SERVER_URL + (type == "tiles" ? "/static/available.json" : "/static/available-scenes.json")
    
    // try to load from cache when exists
    if(game.moulinette.cache.hasData(AVAILABLE_ASSETS)) {
      return game.moulinette.cache.getData(AVAILABLE_ASSETS);
    } 
    else { 
      const response = await fetch(AVAILABLE_ASSETS).catch(function(e) {
        console.warn(`MoulinetteClient | Cannot establish connection to server ${MoulinetteClient.SERVER_URL}`, e)
      });
      if(!response || response.status != 200) {
        return assets;
      }
      assets = await response.json()
      game.moulinette.cache.setData(AVAILABLE_ASSETS, assets);
      return assets
    }
  }
  
  /**
   * Search for available assets on Moulinette Cloud (count only)
   */
  static async getAvailableMatchesMoulinetteCloud(searchTerms, type, countOnly = true) {

    // check if user disabled that feature
    const cloudEnabled = game.settings.get("moulinette-core", "enableMoulinetteCloud")
    const cloudContent = game.settings.get("moulinette-core", "showCloudContent")
    if(!cloudEnabled || !cloudContent) return countOnly ? 0 : [];

    // check if that last search wasn't the same
    const key = `${searchTerms}#${type}`
    if(game.moulinette.cloud.lastSearch.key == key) {
      if(countOnly || game.moulinette.cloud.lastSearch.packs) {
        return game.moulinette.cloud.lastSearch
      }
    }

    // request Moulinette servers
    const url = game.moulinette.applications.MoulinetteClient.SERVER_URL + 
      `/api/marketplace/search?type=${type}&terms=${encodeURIComponent(searchTerms)}&list=${!countOnly}`
    const response = await fetch(url).catch(function(e) {
      console.warn(`MoulinetteClient | Cannot establish connection to server ${MoulinetteClient.SERVER_URL}`, e)
    });
    if(!response || response.status != 200) {
      return 0;
    }
    const results = await response.json()

    // keep last results to avoid calling the server multiple times for the same search (when applying filters for instance)
    game.moulinette.cloud.lastSearch = results
    game.moulinette.cloud.lastSearch.key = key
    return results
  }

  /**
   * Search for matching a asset
   */
  static async getAvailableMatches(searchTerms, type, ignorePacks = []) {
    const available = await MoulinetteFileUtil.getAvailableAssets(type)
    const list = []

    // check if user disabled that feature
    const cloudEnabled = game.settings.get("moulinette-core", "enableMoulinetteCloud")
    const cloudContent = game.settings.get("moulinette-core", "showCloudContent")
    if(!cloudEnabled || !cloudContent) return list;
    
    if(searchTerms.trim().length == 0) return list;
    
    searchTerms = searchTerms.split(" ")
    
    for (const [key, pub] of Object.entries(available)) {
      for (const pack of pub) {
        // ignore packs that user already has access
        if(ignorePacks.find( p => p.name == pack.name && p.publisher == key )) continue;
        
        const matches = pack.assets.filter( a => {
          for( const t of searchTerms ) {
            if( a.toLowerCase().indexOf(t.toLowerCase()) < 0 ) return false
          }
          return true;
        })
        if(matches.length > 0) {
          list.push({ creator: key, pack: pack.name, matches: matches })
        }
      }
    }
    return list
  }

  /**
   * This function converts Base 64 thumbs into binary (blob) data
   */
  static b64toBlob(b64Data) {
    const parts = b64Data.split(";base64,")
    const contentType = parts[0].split(":")[1];
    const sliceSize = 512;

    const byteCharacters = atob(parts[1]);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, {type: contentType});
    return blob;
  }

  /**
   * This function downloads a file into a specific folder
   */
  static async downloadFile(url, folder, filename) {
    // fix for ScenePacker
    folder = decodeURIComponent(folder)
    filename = decodeURIComponent(filename)

    // check if file already downloaded
    await MoulinetteFileUtil.createFolderRecursive(folder)
    const browse = await FilePicker.browse(MoulinetteFileUtil.getSource(), folder);
    const files = browse.files.map(f => decodeURIComponent(f))
    if(files.includes(`${folder}/${filename}`)) return true;

    try {
      let res = await fetch(url)
      if(!res || res.status != 200) { return false; }
      const blob = await res.blob()
      await MoulinetteFileUtil.uploadFile(new File([blob], filename, { type: blob.type, lastModified: new Date() }), filename, folder, false)
      return true
    } catch(e) {
      return false
    }
  }


  /**
   * This function attempts to upload a single file to Moulinette server
   */
  static async uploadToMoulinette(file, path, state, pack) {
    const user = await game.moulinette.applications.Moulinette.getUser()
    const client = new game.moulinette.applications.MoulinetteClient()

    // Create the form data to post
    const fd = new FormData();
    fd.set("file", file);
    fd.set("path", decodeURIComponent(path));
    fd.set("state", state);
    fd.set("pack", pack);

    try {
      const response = await fetch(game.moulinette.applications.MoulinetteClient.SERVER_URL + "/byoa/files/upload/" + user.id, {method: "POST", body: fd});
      if ( response.status != 200 ) {
        console.error("Moulinette FileUtil | File upload to Moulinette Cloud failed", response)
        return false;
      }
    } catch (e) {
      console.error("Moulinette FileUtil | File upload to Moulinette Cloud failed", e)
      return false
    }

    return true
  }

  /**
   * This function retrieves the longest common base from a list of paths
   * Ex: 
   *   "https://assets.forge-vtt.com/bazaar/systems/pf1/assets/fonts/rpgawesome-webfont.svg"
   *   "https://assets.forge-vtt.com/bazaar/systems/pf1/assets/icons/feats/simple-weapon-proficiency.jpg"
   * ==> "https://assets.forge-vtt.com/bazaar/systems/pf1/assets/"
   */
  static findLongestCommonBase(strList) {
    if(!strList || strList.length <= 1) {
      return ""
    }

    let common = null
    for(const str of strList) {
      if (typeof str === 'string' || str instanceof String) {
        if(common == null) {
          common = str
          continue;
        }
        let maxCommonChars = common.length
        for(var i = 0; i < common.length; i++) {
          if(i >= str.length || common[i] != str[i]) {
            maxCommonChars = i
            break
          }
        }
        common = common.substring(0, maxCommonChars)
      }
    }
    if(common == null) common = ""

    // only keep path up to folder (don't split path)
    const idx = common.lastIndexOf("/")
    return idx > 0 ? common.substring(0, idx) : ""
  }

  /**
   * Updates an Index by:
   *  - Retrieving existing index
   *  - Indexing [moulinetteFolder]/custom folder 
   *  - Indexing each source matching [assetType]. Only if not already existing
   *  - Updating provided index
   * 
   * Keys for assets (ex: images)
   *  - "global" : global path (always updated)
   *  - "moulinette/images/custom" : default path
   *  - "[source]:[path]" : sources
   */
  static async updateIndex(forgeModule, assetType, moulinetteFolder, extensions, scanGlobal = true) {
    const baseURL = await MoulinetteFileUtil.getBaseURL()
    const filename = "index-mtte.json"
    const URL = `${baseURL}${moulinetteFolder}/${filename}` 

    // download index file from URL
    let indexData = {}
    const noCache = "?ms=" + new Date().getTime();
    const response = await fetch(URL + noCache, {cache: "no-store"}).catch(function(e) {
      console.error(`Moulinette FileUtil | Exception while downloading index ${URL}`, e)
    });
    if(response && response.status == 200) {
      indexData = await response.json();
    }
    
    // Update global folder
    if(scanGlobal) {
      const customPath = game.settings.get("moulinette-core", "customPath")
      if(customPath) {
        indexData["global"] = await MoulinetteFileUtil.scanAssetsInCustomFolders(customPath, extensions)
      }
    }

    // Update default custom folder
    indexData["default"] = await MoulinetteFileUtil.scanAssets(moulinetteFolder, extensions)
    
    // Update sources
    await MoulinetteFileUtil.updateSourceIndex(indexData, assetType, extensions)

    // Update module-specific assets
    indexData["specific"] = await forgeModule.indexAssets()

    // Optimize content
    for(const key in indexData) {
      // Double-check
      if(!indexData[key]) continue;

      // Optimisation #1 : pack path
      for(const c of indexData[key]) {
        for(const p of c.packs) {
          // retrieve common base path
          const basePath = MoulinetteFileUtil.findLongestCommonBase(p.assets)
          if(basePath.length > 0) {
            // Works for The Forge or any other remote hosting
            p.path = basePath.startsWith("http") ? basePath : p.path + "/" + basePath
            p.assets = p.assets.map(a => a.substring(basePath.length + 1))
          }
        }
      }
  
      // Optimisation #2 : Add duration for sounds
      if(assetType == "sounds") {
        const audio = new Audio()
        audio.preload = "metadata"
        for(const c of indexData[key]) {
          for(const p of c.packs) {
            const durations = []
            for(const a of p.assets) {
              audio.src = a.match(/^https?:\/\//) ? a : `${p.path}/${MoulinetteFileUtil.encodeURL(a)}`
              const promise = new Promise( (resolve,reject)=>{
                audio.onloadedmetadata = function() {
                  resolve(audio.duration);
                }
                audio.onerror = function() {
                  console.warn(`Moulinette FileUtil | Audio file '${decodeURIComponent(audio.src)}' seems corrupted`)
                  resolve(0.0)
                }
              });
              const duration = await promise
              durations.push(Math.round(duration))
            }
            p.durations = durations
          }
        }
      }

      // Optimisation #3 : Generate thumbnail for scenes
      if(assetType == "scenes") {
        if(game.settings.get("moulinette-scenes", "generateThumbnails")) {
          for(const c of indexData[key]) {
            for(const p of c.packs) {
              const baseURL = await MoulinetteFileUtil.getBaseURL(p.source)
              for(const a of p.assets) {
                if (typeof a === 'string' || a instanceof String) {
                  if(a.indexOf("_thumb") > 0) continue;
                  let imgPath = p.path.length > 0 ? `${p.path}/${a}` : a
                  // remove s3/forge full URL from image path (for S3)
                  if(baseURL.length > 0 && imgPath.startsWith(baseURL)) {
                    imgPath = imgPath.substring(baseURL.length)
                  }
                  
                  const thumbPath = decodeURIComponent("moulinette/thumbs/" + imgPath.substring(0, imgPath.lastIndexOf(".")) + "_thumb.webp")
                  const thumbFilename = thumbPath.split("/").pop()
                  const thumbFolder = thumbPath.substring(0, thumbPath.lastIndexOf("/"))
                  try {
                    console.log(`Moulinette FileUtil | Creating thumbnail for ${imgPath}`)
                    // skip map if thumbnail already exists
                    if(await MoulinetteFileUtil.fileExists(`${thumbFolder}/${thumbFilename}`)) {
                      console.log(`Moulinette FileUtil | 👍 Thumbnail ${thumbFolder}/${thumbFilename} already exists. Skipping.`)
                      continue
                    }

                    const headData = await fetch(baseURL + imgPath, {method: 'HEAD'})
                    const fileSize = headData.headers.get("content-length")
                    if(fileSize > MoulinetteFileUtil.MAX_THUMB_FILESIZE) {
                      console.warn(`Moulinette FileUtil | ⚠ File too large (${fileSize}). Thumbnail generation skipped.`)
                      continue;
                    }
                    const thumb = await ImageHelper.createThumbnail(baseURL + imgPath, { width: 400, height: 400, center: true, format: "image/webp"})
                    // convert to file
                    const res = await fetch(thumb.thumb);
                    const buf = await res.arrayBuffer();
                    const thumbFile = new File([buf], thumbFilename, { type: "image/webp" })
                    await MoulinetteFileUtil.uploadFile(thumbFile, thumbFilename, thumbFolder, true)
                    console.log(`Moulinette FileUtil | Thumbnail ${thumbFilename} `)
                  } catch (error) {
                    console.warn(`Moulinette FileUtil | Failed to create thumbnail for ${imgPath}.`, error);
                  }
                }
              }
            }
          }
        } else {
          console.warn("Moulinette FileUtil | Thumbnails generation skipped!");
        }
      }
    }

    // Upload index file
    await MoulinetteFileUtil.uploadFile(new File([JSON.stringify(indexData)], filename, { type: "application/json", lastModified: new Date() }), filename, moulinetteFolder, true)
  }
}
