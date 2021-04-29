/**
 * Moulinette Core class
 * 
 * Provides functions for all other modules
 */

export class MoulinetteFileUtil {

  static BASE_URL = ""
  
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
   * Downloads a file into the right folder
   */
  static async upload(file, name, folderSrc, folderPath, overwrite = false) {
    const source = MoulinetteFileUtil.getSource()
    MoulinetteFileUtil.createFolderIfMissing(folderSrc, folderPath)
    
    // check if file already exist
    let base = await FilePicker.browse(source, folderPath, MoulinetteFileUtil.getOptions());
    let exist = base.files.filter(f => f == `${folderPath}/${name}`)
    if(exist.length > 0 && !overwrite) return {path: `${MoulinetteFileUtil.getBaseURL()}${folderPath}/${name}`};
    
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
    // first level = publishers
    let publishers = []
    let dir1 = await FilePicker.browse(MoulinetteFileUtil.getSource(), sourcePath, MoulinetteFileUtil.getOptions());
    for(const pub of dir1.dirs) {
      publishers.push({ publisher: decodeURI(pub.split('/').pop()), packs: await MoulinetteFileUtil.scanAssetsInPublisherFolder(decodeURI(pub), extensions) })
    }
    return publishers
  }
  
  /**
   * Scans a folder for assets matching provided extension
   * (requires a 1-level folder structure => packs-files)
   */  
  static async scanAssetsInPublisherFolder(sourcePath, extensions) {
    let packs = []
    // first level = packs
    let dir = await FilePicker.browse(MoulinetteFileUtil.getSource(), sourcePath, MoulinetteFileUtil.getOptions());
    for(const pack of dir.dirs) {
      packs.push({ name: decodeURI(pack.split('/').pop()), path: pack, assets: await MoulinetteFileUtil.scanAssetsInPackFolder(decodeURI(pack), extensions) })
    }
    return packs
  }
  
  /**
   * Scans a folder for assets matching provided extension
   * (files)
   */  
  static async scanAssetsInPackFolder(packPath, extensions) {
    const files = await MoulinetteFileUtil.scanFolder(packPath, extensions)
    return files.map( (path) => { return decodeURI(path).split(decodeURI(packPath))[1].substr(1) } ) // remove front /
  }
  
  /**
   * Scans a folder for assets matching provided extension
   * (files)
   */  
  static async scanAssetsInCustomFolders(sourcePath, extensions) {
    let publishers = []
    let cfgFiles = await MoulinetteFileUtil.scanFolder(sourcePath, ".mtte");
    for(const cfg of cfgFiles) {
      // read ".json" file 
      const response = await fetch(cfg + "?ms=" + Date.now(), {cache: "no-store"}).catch(function(e) {
        console.log(`MoulinetteFileUtil | Cannot download tiles/asset list`, e)
        return;
      });
      if(response.status != 200) return;
      let data = {}
      try {
        data = await response.json();
      } catch(e) {
        console.warn(`${cfg} not processed.`, e);
      }
      const folder = cfg.substring(0, cfg.lastIndexOf("/") + 1);
      // case #1 : folder is a publisher and subfolders represent packs for that publisher
      if(data.publisher && data.publisher.length >= 3 && !data.pack) {
        let packs = await MoulinetteFileUtil.scanAssetsInPublisherFolder(folder, extensions)
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
        const pack = { name: data.pack, path: folder, assets: await MoulinetteFileUtil.scanAssetsInPackFolder(folder, extensions) }
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
        const pack = { name: game.i18n.localize("mtte.unknown"), path: folder, assets: await MoulinetteFileUtil.scanAssetsInPackFolder(folder, extensions) }
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
  static async scanFolder(path, filter) {
    let list = []
    const base = await FilePicker.browse(MoulinetteFileUtil.getSource(), path, MoulinetteFileUtil.getOptions());
    let baseFiles = filter ? base.files.filter(f => filter.includes(f.split(".").pop().toLowerCase())) : base.files
    list.push(...baseFiles)
    for(const d of base.dirs) {
      const files = await MoulinetteFileUtil.scanFolder(d, filter)
      list.push(...files)
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
    for(const URL of urlList) {
      const response = await fetch(URL, {cache: "no-store"}).catch(function(e) {
        console.log(`MoulinetteFileUtil | Cannot download tiles/asset list`, e)
        return;
      });
      if(response.status != 200) continue;
      const data = await response.json();
      for(const pub of data) {
        for(const pack of pub.packs) {
          // hide showcase content
          if(pack.showCase && !showShowCase) continue;
          // add pack
          assetsPacks.push({ idx: idx, publisher: pub.publisher, pubWebsite: pub.website, name: pack.name, url: pack.url, license: pack.license, licenseUrl: pack.licenseUrl, path: pack.path, count: pack.assets.length, isRemote: URL.startsWith('https://boisdechet.org'), isShowCase: pack.showCase })
          for(const asset of pack.assets) {
            assets.push({ pack: idx, filename: asset})
          }
          idx++;
        }
      }
    }
    if(special) {
      for(const el of special) {
        el.idx = idx
        assetsPacks.push(el)
        idx++;
      }
    }
    return { assets: assets, packs: assetsPacks }
  }
  
}
