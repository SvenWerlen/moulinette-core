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
  static async uploadBinary(fvttPath, filename, folder) {
    try {
      const response = await fetch(fvttPath, { method: 'GET', headers: { 'Content-Type': 'application/octet-stream' }})
      const blob = await response.blob()
      const binFile = new File([blob], filename, { type: blob.type, lastModified: new Date() });
      await game.moulinette.applications.MoulinetteFileUtil.uploadFile(binFile, filename, folder, true)
    } catch(error) {
      console.error("Moulinette Obsidian | Couldn't retrieve file from path : ", fvttPath)
      console.error(error)
    }
  }

  /**
   * Generates a Markdown text listing all elements
   * 
   * @param {*} elementList dict object with key = folder, value = Markdown row
   * @param {*} tableTemplate markdown template for that table
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
   * Generates all the required files for Obsidian
   */
  static async exportWorld({ exportScenes=true, exportActors=true } = {}) {
    const FILEUTIL = game.moulinette.applications.MoulinetteFileUtil
    const rootFolder = `moulinette-obsidian/${game.world.id}`
    
    // export scenes
    // -------------
    if(exportScenes) {
      let sceneList = {}
      const sceneFolder = `${rootFolder}/Scenes`
      await FILEUTIL.createFolderRecursive(sceneFolder)
      const sceneTemplate = await MoulinetteObsidian.getTemplate("scene")
      const sceneListTemplate = await MoulinetteObsidian.getTemplate("scenes")
      const sceneTableTemplate = await MoulinetteObsidian.getTemplate("actors-table")
      
      for(const sc of game.scenes) {
        console.log(sc)
        const relFolder = MoulinetteObsidian.getFolderPath(sc.folder)
        const folder = relFolder.length > 0 ? `${sceneFolder}/${relFolder}` : sceneFolder
        
        FILEUTIL.createFolderRecursive(folder)
        const filenameThumb = `${sc.name}.webp`
        const width = 600
        const height = (sc.height / sc.width) * 600;
        //const height = (sc.dimensions.height / sc.dimensions.width) * 600;
        const thumb = await sc.createThumbnail({width:width, height:height, format: "image/webp", quality: 0.8 })
        const blob = FILEUTIL.b64toBlob(thumb.thumb)
        const mdFileThumb = new File([blob], filenameThumb, { type: blob.type, lastModified: new Date() })
        await FILEUTIL.uploadFile(mdFileThumb, filenameThumb, folder, true)
        
        let sceneData = sceneTemplate.replace("SCENENAME", sc.name)
        sceneData = sceneData.replace("SCENEPATH", `${filenameThumb}`)
        await MoulinetteObsidian.uploadMarkdown(sceneData, `${sc.name}.md`, folder)    

        sceneList[`${relFolder}/${sc.name}`] = `| ![[Scenes/${relFolder}${filenameThumb}\\|100]] | [[Scenes/${relFolder}${sc.name}\\|${sc.name}]] |\n`
      }

      const scenesMD = MoulinetteObsidian.generateList(sceneList, sceneTableTemplate)
      await MoulinetteObsidian.uploadMarkdown(sceneListTemplate.replace("SCENELIST", scenesMD), `All Scenes.md`, rootFolder)
    }

    // export actors
    // -------------
    if(exportActors) {
      let actorList = {}
      const actorFolder = `${rootFolder}/Actors`
      await FILEUTIL.createFolderRecursive(actorFolder)
      const actorTemplate = await MoulinetteObsidian.getTemplate("actor")
      const actorListTemplate = await MoulinetteObsidian.getTemplate("actors")
      const actorTableTemplate = await MoulinetteObsidian.getTemplate("actors-table")
      
      for(const a of game.actors) {
        const relFolder = MoulinetteObsidian.getFolderPath(a.folder)
        const folder = relFolder.length > 0 ? `${actorFolder}/${relFolder}` : actorFolder
        
        let actorData = actorTemplate.replace("ACTORNAME", a.name)
        let actorImg = null
        if(a.img) {
          const ext = a.img.split('.').pop();
          await MoulinetteObsidian.uploadBinary(a.img, `${a.name}.${ext}`, folder)    
          actorImg = `Actors/${relFolder}${a.name}.${ext}`
          actorData = actorTemplate.replace("ACTORIMG", `![[${actorImg}|200]]`)
        } else {
          actorData = actorTemplate.replace("ACTORIMG", "")
        }
        
        //actorData = sceneData.replace("SCENEPATH", `${filenameThumb}`)
        await MoulinetteObsidian.uploadMarkdown(actorData, `${a.name}.md`, folder)    

        actorImg = actorImg ? `![[${actorImg}\\|100]]` : ""
        actorList[`${relFolder}/${a.name}`] = `| ${actorImg} | [[Actors/${relFolder}${a.name}\\|${a.name}]] |\n`
      }

      const actorsMD = MoulinetteObsidian.generateList(actorList, actorTableTemplate)
      await MoulinetteObsidian.uploadMarkdown(actorListTemplate.replace("ACTORLIST", actorsMD), `All Actors.md`, rootFolder)
    }
  }
}