/**
 * Moulinette Obsidian
 * 
 * Utility functions to sync/export/import from/to Obsidian MD
 */

export class MoulinetteObsidian {

  /**
   * Returns the folder path from the asset
   */
  static getFolderPath(folder) {
    if(!folder) return ""
    const path = folder.name + "/"
    return folder.folder ? MoulinetteObsidian.getFolderPath(folder.folder) + path : path
  }

  /**
   * Retrieves and returns template as string 
   */
  static async getTemplate(templateName) {
    const response = await fetch(`modules/moulinette-core/obsidian/templates/${templateName}.md`)
    if(response.ok) {
      return response.text()
    } else {
      console.error("Moulinette Obsidian | Cannot retrieve template", response)
      return ""
    }
  }

  /**
   * Uploads the content (string) as markdown file
   */
  static async uploadMarkdown(content, filename, folder) {
    const mdFile = new File([content], filename, {type: 'text/plain', lastModified: new Date()});
    await game.moulinette.applications.MoulinetteFileUtil.uploadFile(mdFile, filename, folder, true)
  }

  /**
   * Uploads the content (string) as markdown file
   */
  static async uploadBinary(fvttPath, filename, folder, overwrite = true) {
    try {
      const response = await fetch(fvttPath, { method: 'GET', headers: { 'Content-Type': 'application/octet-stream' }})
      const blob = await response.blob()
      const binFile = new File([blob], filename, { type: blob.type, lastModified: new Date() });
      await game.moulinette.applications.MoulinetteFileUtil.uploadFile(binFile, filename, folder, overwrite)
    } catch(error) {
      console.error("Moulinette Obsidian | Couldn't retrieve file from path : ", fvttPath)
      console.error(error)
    }
  }

  /**
   * Generates a Markdown text listing all elements
   * 
   * @param {object} elementList dict object with key = folder, value = Markdown row
   * @param {string} tableTemplate markdown template for that table
   * @returns 
   */
  static generateList(elementList, tableTemplate) {
    let allElements = ""
    let currentElements = ""
    let currentFolder = ""
    Object.keys(elementList).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach((k) => {
      const folder = k.substring(0, k.lastIndexOf("/"))
      if(folder != currentFolder) {
        if(currentElements.length > 0) {
          allElements += tableTemplate.replace("LIST", currentElements)
        }
        allElements += `\n\n### ${folder} \n\n`
        currentElements = ""
        currentFolder = folder
      }
      currentElements += elementList[k]
    })
    allElements += tableTemplate.replace("LIST", currentElements)
    return allElements
  }

  /**
   * Retrieves the object's value based on the path
   * 
   * @param {object} object FVTT instance
   * @param {string} path path to value
   */
  static getValue(object, path) {
    // count
    if(path.startsWith("#")) {
      const value = foundry.utils.getProperty(object, path.substring(1))
      return "" + (value ? value.size : 0)
    } else {
      const value = foundry.utils.getProperty(object, path)
      return value ? "" + value : ""
    }
    
  }

  /**
   * Download all dependencies found in HTML content
   * Support <img> tags
   * 
   * @param {string} htmlContent HTML content to scan (and replace)
   * @param {string} folder folder where to store dependencies
   * @param {string} vaultLocalPath vault local path
   * @returns 
   */
  static async downloadDependencies(htmlContent, folder) {
    const imgRefs = [...htmlContent.matchAll(/<img [^>]*src=[\\]?"([^"]+)[\\]?"/g)]
    for(const ref of imgRefs) {
      if(ref[1].toLowerCase().startsWith("http")) continue
      const filename = ref[1].split("/").pop()
      const relFolder = ref[1].slice(0, -(filename.length+1))
      await MoulinetteObsidian.uploadBinary(ref[1], filename, folder + "/_Deps/" + relFolder, false)
      htmlContent = htmlContent.replace('"' + ref[1], `"_Deps/${relFolder}/${filename}`)
    }
    return htmlContent
  }

  static replaceReferences(htmlContent) {
    // looking for references like @UUID[Scene.VqzwFaG1Zvm5YsWc]{Dragon's Keep Basement Floor}
    const refs = [...htmlContent.matchAll(/@UUID\[([^\]]+)\]\{([^\}]+)\}/g)]
    for(const ref of refs) {
      htmlContent = htmlContent.replace(ref[0], `<code title="${ref[1]}">${ref[2]}</code>`)
    }
    // looking for references like [[/r 3d6[psychic]]]{3d6 Psychic Damage}
    const macros = [...htmlContent.matchAll(/\[\[(\/r[^­\}]+)\{([^}]+)\}/g)]
    for(const ref of macros) {
      htmlContent = htmlContent.replace(ref[0], `⚅ <code title="${ref[1].slice(0,-2)}">${ref[2]}</code>`)
    }
    return htmlContent
  }

  /**
   * For each mapping, look for its value and replace KEY by the found VALUE
   * @param {string} text Text to be processed
   * @param {object} obj FVTT object instance
   * @param {object} mappings Dict with mapping [KEY] = [PATH]
   * @returns 
   */
  static applyMappings(text, obj, mappings) {
    text = text.replace(new RegExp("ASSETUUID", 'g'), MoulinetteObsidian.getValue(obj, "uuid"));
    if(mappings) {
      for (const [key, path] of Object.entries(mappings)) {
        text = text.replace(new RegExp(key, 'g'), MoulinetteObsidian.getValue(obj, path));
      }
    }
    return text
  }

  /**
   * Processes the list of all assets of given type, retrieving templates, replacing values, etc.
   * 
   * @param {string} assetType Type of assets (ex: Scenes or Actors)
   * @param {array} assets List of assets
   * @param {string|async function} img Image path location within asset OR function generate the image (ex: for scene)
   * @param {object} mapping List of mappings (key|path) of values to be replaced in tables
   * @param {async function} content Function generating Markdown content for a specific asset (must return string)
   */
  static async processAssets(assetType, assets, image, mappings, content) {
    const FILEUTIL = game.moulinette.applications.MoulinetteFileUtil
    const rootFolder = `moulinette-obsidian/${game.world.id}`

    let assetList = {}
    const assetFolder = `${rootFolder}/${assetType}`
    await FILEUTIL.createFolderRecursive(assetFolder)
    const assetTemplate = await MoulinetteObsidian.getTemplate(assetType.toLowerCase() + "-page")
    const assetListTemplate = await MoulinetteObsidian.getTemplate(assetType.toLowerCase() + "-list")
    let assetTableTemplate = await MoulinetteObsidian.getTemplate(assetType.toLowerCase() + "-table")
    let assetTableRowTemplate = assetTableTemplate.match(/##([^#]+)##/)
    if(assetTableRowTemplate) {
      assetTableTemplate = assetTableTemplate.substring(0, assetTableRowTemplate.index)
      assetTableRowTemplate = assetTableRowTemplate[1]
    }

    for(const a of assets) {
      const relFolder = MoulinetteObsidian.getFolderPath(a.folder)
      const folder = relFolder.length > 0 ? `${assetFolder}/${relFolder}` : assetFolder + "/"
      
      let assetData = assetTemplate.replace("ASSETNAME", a.name)
      assetData = MoulinetteObsidian.applyMappings(assetData, a, mappings)
      if(content) {
        assetData = assetData.replace("ASSETCONTENT", await content(a, rootFolder))
      }

      let assetTableRow = assetTableRowTemplate.replace("ASSETNAME", `[[${assetType}/${relFolder}${a.name}\\|${a.name}]]`)
      assetTableRow = MoulinetteObsidian.applyMappings(assetTableRow, a, mappings)
      
      if(image) {
        // image is the path within the asset object which contains the image location
        if (typeof image === 'string' || image instanceof String) {
          const ext = a[image].split('.').pop();
          const assetImg = `${assetType}/${relFolder}${a.name}.${ext}`
          if(a[image]) {
            await MoulinetteObsidian.uploadBinary(a[image], `${a.name}.${ext}`, folder)    
            assetData = assetData.replace("ASSETIMG", `![[${assetImg}|200]]`)
            assetTableRow = assetTableRow.replace("ASSETIMG", `![[${assetImg}\\|100]]`)
          } else {
            assetData = assetData.replace("ASSETIMG", "")
          }
        } 
        // image is the function to generate an image for that asset
        else {
          const assetImg = `${assetType}/${relFolder}${a.name}.webp`
          await image(a, folder, `${a.name}.webp`)
          assetData = assetData.replace("ASSETIMG", `![[${assetImg}|200]]`)
          assetTableRow = assetTableRow.replace("ASSETIMG", `![[${assetImg}\\|100]]`)
        }
      }

      await MoulinetteObsidian.uploadMarkdown(assetData, `${a.name}.md`, folder)    
      assetList[`${relFolder}/${a.name}`] = assetTableRow + "\n"
    }

    const assetsMD = MoulinetteObsidian.generateList(assetList, assetTableTemplate)
    await MoulinetteObsidian.uploadMarkdown(assetListTemplate.replace("ASSETLIST", assetsMD), `All ${assetType}.md`, rootFolder)
  }

  /**
   * Generates all the required files for Obsidian
   */
  static async exportWorld({ exportScenes=true, exportActors=true, exportItems=true, exportArticles=true } = {}) {
    const FILEUTIL = game.moulinette.applications.MoulinetteFileUtil
    const rootFolder = `moulinette-obsidian/${game.world.id}`
    
    // export scenes
    // -------------
    if(exportScenes) {
      await MoulinetteObsidian.processAssets("Scenes", game.scenes, async function(sc, folder, filename) {
        const width = 600
        const height = (sc.height / sc.width) * 600;
        const thumb = await sc.createThumbnail({width:width, height:height, format: "image/webp", quality: 0.8 })
        const blob = FILEUTIL.b64toBlob(thumb.thumb)
        const mdFileThumb = new File([blob], filename, { type: blob.type, lastModified: new Date() })
        await FILEUTIL.uploadFile(mdFileThumb, filename, folder, true)
      });
    }

    // export actors
    // -------------
    if(exportActors) {
      await MoulinetteObsidian.processAssets("Actors", game.actors, "img");
    }

    // export items
    // -------------
    if(exportItems) {
      await MoulinetteObsidian.processAssets("Items", game.items, "img");
    }

    // export articles
    // -------------
    if(exportArticles) {
      const mappings = {
        "PAGES": "#pages"
      }
      await MoulinetteObsidian.processAssets("Articles", game.journal, null, mappings, async function(a, folder) {
        let content = ""
        for(const p of a.pages) {
          content += `---\n\n## ${p.name}\n\n`
          if(p.text && p.text.content) {
            //content += jQuery('<div>').html(p.text.content).text();
            let pageHTML = await MoulinetteObsidian.downloadDependencies(p.text.content, folder)
            pageHTML = await MoulinetteObsidian.replaceReferences(pageHTML)
            content += pageHTML
          } else {
            content += "*No content*"
          }
          content += "\n\n"
        }
        return content
      });
    }
  }
}