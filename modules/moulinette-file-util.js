/**
 * Moulinette Core class
 * 
 * Provides functions for all other modules
 */

export class MoulinetteFileUtil {

  static REMOTE_BASE = "https://mttecloudstorage.blob.core.windows.net"
  
  /**
   * Detects which source to use (depending if server si Forge or local)
   */
  static getSource() {
    var source = "data";
    if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
      source = "forgevtt";
    }
    if(game.settings.get("moulinette-core", "s3Bucket").length > 0) {
      source = "s3"
    }
    
    return source;
  }
  
  static getOptions() {
    let options = {}
    const bucket = game.settings.get("moulinette-core", "s3Bucket")
    if(bucket.length > 0) {
      options.bucket = bucket
    }
    return options;
  }
  
  /**
   * Returns the base URL when available
   */
  static getBaseURL() {
    const bucket = game.settings.get("moulinette-core", "s3Bucket")
    if(bucket && bucket.length > 0) {
      const e = game.data.files.s3.endpoint;
      return `${e.protocol}//${bucket}.${e.host}/`
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
   * Creates folders recursively (much better than previous 
   */
  static async createFolderRecursive(path) {
    const source = MoulinetteFileUtil.getSource()
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
   * Checks if a file exists (based on its path)
   */
  static async fileExists(path) {
    try {
      const parentFolder = await FilePicker.browse(MoulinetteFileUtil.getSource(), path.substring(0, path.lastIndexOf('/')), MoulinetteFileUtil.getOptions());
      return parentFolder.files.includes(path)
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
    let base = await FilePicker.browse(source, folderPath, MoulinetteFileUtil.getOptions());
    const path = `${folderPath}/${name}`
    let exist = base.files.filter(f =>  decodeURIComponent(f) == path)
    if(exist.length > 0 && !overwrite) return {path: `${MoulinetteFileUtil.getBaseURL()}${folderPath}/${name}`};
    
    try {
      return await FilePicker.upload(source, folderPath, file, MoulinetteFileUtil.getOptions());
    } catch (e) {
      console.log(`MoulinetteFileUtil | Not able to upload file ${name}`)
      console.log(e)
    }
  }
  
  /**
   * Uploads a file into the right folder (improved version)
   */
  static async uploadFile(file, name, folderPath, overwrite = false) {
    const source = MoulinetteFileUtil.getSource()
    await MoulinetteFileUtil.createFolderRecursive(folderPath)
    
    // check if file already exist
    let base = await FilePicker.browse(source, folderPath, MoulinetteFileUtil.getOptions());
    let exist = base.files.filter(f => decodeURIComponent(f) == `${folderPath}/${name}`)
    if(exist.length > 0 && !overwrite) return { path: `${MoulinetteFileUtil.getBaseURL()}${folderPath}/${name}` };
    
    try {
      return await FilePicker.upload(source, folderPath, file, MoulinetteFileUtil.getOptions());
    } catch (e) {
      console.log(`MoulinetteFileUtil | Not able to upload file ${name}`)
      console.log(e)
    }
  }
  
  
  /**
   * Scans a folder for assets matching provided extension
   * (requires a 2-level folder structure => publishers-packs-files)
   */  
  static async scanAssets(sourcePath, extensions) {
    const debug = game.settings.get("moulinette-core", "debugScanAssets")
    const source = MoulinetteFileUtil.getSource()
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
      publishers.push({ publisher: decodeURIComponent(pub.split('/').pop()), packs: await MoulinetteFileUtil.scanAssetsInPublisherFolder(source, decodeURIComponent(pub), extensions, debug) })
    }
    return publishers
  }
  
  /**
   * Scans a source (core) for assets matching type
   */  
  static async scanSourceAssets(type, extensions) {
    const debug = game.settings.get("moulinette-core", "debugScanAssets")
    let publishers = []
    let publishersByName = {}
    for(const source of game.moulinette.sources) {
      if(source.type == type) {
        // check data
        if(!source.publisher || !source.pack || !source.path || !source.source) {
          console.warn(`Moulinette FileUtil | Invalid moulinette source!`, source)
          continue;
        } 
        const pack = { 
          name: source.pack, 
          path: source.path, 
          assets: await MoulinetteFileUtil.scanAssetsInPackFolder(source.source, source.path, extensions, debug),
          isLocal: true,
        }
        // support for Forge (assets have full URL)
        if(source.source == "forge-bazaar" && ForgeVTT.usingTheForge) {
          pack.path = ""
        }
        
        // check if publisher already exist
        if( source.publisher in publishersByName ) {
          publishersByName[source.publisher].packs.push(pack)
        } 
        // doesn't exist yet => create new publisher
        else {
          publishers.push({ publisher: source.publisher, packs: [pack] })
        }
      }
    }
    return publishers
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
      const packEntry = { name: decodeURIComponent(pack.split('/').pop()), path: pack, assets: await MoulinetteFileUtil.scanAssetsInPackFolder(source, decodeURIComponent(pack), extensions, debug) }
      
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
    let files = await MoulinetteFileUtil.scanFolder(source, packPath, extensions, debug)
    files = files.filter(f => f.indexOf("_thumb") < 0) // remove thumbnails
    if(debug) console.log(`Moulinette FileUtil | Pack: ${files.length} assets found.`)
    // special case for ForgeVTT => keep entire path
    if(source == "forge-bazaar" && ForgeVTT.usingTheForge) {
      return files.map( (path) => { return decodeURIComponent(path) } )
    } else {
      return files.map( (path) => { return decodeURIComponent(path).split(decodeURIComponent(packPath))[1].substr(1) } ) // remove front /
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
    const baseURL = MoulinetteFileUtil.getBaseURL()
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
   * Reads a given URL (json) and builds an asset index
   */
  static async buildAssetIndex(urlList, special = null) {
    let assets = []
    let assetsPacks = []
    
    const showShowCase = game.settings.get("moulinette-core", "showCaseContent")
    
    // build tiles' index 
    let idx = 0;
    for(let URL of urlList) {
      
      // try to load from cache when exists
      let data;
      if(game.moulinette.cache.hasData(URL)) {
        data = game.moulinette.cache.getData(URL);
      } 
      else { 
        // workaround for The Forge
        if(URL.endsWith("index.json")) {
          const fb = await FilePicker.browse(MoulinetteFileUtil.getSource(), URL).catch(function(e) {
            console.warn(`Moulinette FileUtil | No index ${URL} exists yet.`)
            return;
          });
          if(fb && fb.files.length == 1) {
            URL = fb.files[0] + (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge ? `?t=${Date.now()}` : "")
          } else {
            console.log(`Moulinette FileUtil | `, fb)
            continue
          }
        }
        // download index file from URL
        const response = await fetch(URL, {cache: "no-store"}).catch(function(e) {
          console.log(`Moulinette FileUtil | Cannot download tiles/asset list`, e)
          return;
        });
        if(!response || response.status != 200) {
          ui.notifications.warn(game.i18n.localize("mtte.errorBuildingAssetIndex"));
          console.warn(`Moulinette FileUtil | Couldn't load source ${URL}. Response : `, response)
          continue;
        }
        data = await response.json();
        game.moulinette.cache.setData(URL, data);
        data = duplicate(data)
      }
      
      try {
        for(const pub of data) {
          for(const pack of pub.packs) {
            // hide showcase content
            if(pack.showCase && !showShowCase) continue;
            // add pack
            assetsPacks.push({ 
              idx: idx, 
              publisher: pub.publisher, 
              pubWebsite: pub.website, 
              name: pack.name, 
              url: pack.url, 
              license: pack.license, 
              licenseUrl: pack.licenseUrl, 
              path: pack.path, 
              count: pack.assets.length, 
              isLocal: pack.isLocal,
              isRemote: pack.path.startsWith(MoulinetteFileUtil.REMOTE_BASE), 
              isShowCase: pack.showCase,
              deps: pack.deps, 
              sas: pack.sas
            })
            for(const asset of pack.assets) {
              // default (basic asset is only filepath)
              if (typeof asset === 'string' || asset instanceof String) {
                let type = pack.meta && pack.meta.type ? pack.meta.type : "img"
                if(asset.endsWith(".ogg") || asset.endsWith(".mp3") || asset.endsWith(".wav") || asset.endsWith(".m4a")) {
                  type = "snd"
                }
                assets.push({ pack: idx, filename: asset, type: type})
              }
              else {
                const path = asset['path']
                delete asset['path']
                assets.push({ pack: idx, filename: path, data: asset})
              }
            }
            idx++;
          }
        }
      } catch (e) {
        console.log(`Moulinette FileUtil | Error building index of ${URL}`, e)
      }
    }
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
  static async downloadAssetDependencies(asset, pack, type) {
    
    const path = MoulinetteFileUtil.getMoulinetteBasePath(type, pack.publisher, pack.name)
    
    // simple type => generate 1 dependency
    if( !asset.data ) {
      asset = { data: { deps: [ asset.filename ], eDeps: {} }, sas: asset.sas }
    }
    
    // download direct dependencies
    
    await MoulinetteFileUtil.downloadDependencies(asset.data.deps, pack.path, asset.sas, path)
    
    // download all external dependencies
    for (const [idx, deps] of Object.entries(asset.data.eDeps)) {
      const i = Number(idx)
      if( i >= 0 && i < pack.depsPath.length ) {
        const ePack = pack.depsPath[i]
        const ePath = MoulinetteFileUtil.getMoulinetteBasePath(type, ePack.publisher, ePack.name)
        await MoulinetteFileUtil.downloadDependencies(deps, ePack.path, asset.sas, ePath)
      } else {
        console.error("Moulinette FileUtil | Invalid external dependency " + i)
      }
    }
    
    // generate target paths
    // 0 => #DEP#
    // 1 => #DEP0# (external dep #1)
    // 2 => #DEP1# (external dep #2)
    // ...
    let targetPaths = []    
    targetPaths.push(MoulinetteFileUtil.getBaseURL() + path)
    for(const dep of pack.deps) {
      targetPaths.push(MoulinetteFileUtil.getBaseURL() + MoulinetteFileUtil.getMoulinetteBasePath(type, pack.publisher, dep))
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
  static async downloadDependencies(depList, packURL, sas, destPath) {
    // download direct dependencies
    for(const dep of depList) {
      const filepath = destPath + dep
      const folder = decodeURIComponent(filepath.substring(0, filepath.lastIndexOf('/')))
      const filename = decodeURIComponent(dep.split('/').pop())
      const srcURL = packURL + "/" + dep + sas
      
      if(!await MoulinetteFileUtil.fileExists(filepath)) {
        // create target folder
        await MoulinetteFileUtil.createFolderRecursive(folder)
        // download file
        let res = await fetch(srcURL).catch(function(e) {
          console.log(`Moulinette | Not able to fetch file`, e)
        });
        if(!res) return ui.notifications.error(game.i18n.localize("mtte.errorDownload"));
    
        const blob = await res.blob()
        await MoulinetteFileUtil.uploadFile(new File([blob], filename, { type: blob.type, lastModified: new Date() }), filename, folder, false)
      }
    }
  }
}
