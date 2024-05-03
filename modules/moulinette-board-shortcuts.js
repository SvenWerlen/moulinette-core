/**
 * Moulinette Shortcuts
 * 
 * This class handles shortcut management for Moulinette Board
 */
export class MoulinetteBoardShortcuts {

  /**
   * Generates a new shortcut
   */
  static async createShortcut(data) {
    switch(data.type) {
      case "Macro":
      case "RollTable":
      case "Scene":
      case "Actor":
        const asset = await fromUuid(data.uuid)
        if(asset) {
          let item = {
            type: data.type,
            name: asset.name,
            icon: data.type == "Scene" ? "fas fa-map" : asset.img,
            assets: [{
              uuid: data.uuid
            }]
          }
          if(data.type == "Scene") {
            item.faIcon = true
          }
          return item
        }
        break
    }
    console.log(data)
    return null
  }

  /**
   * Execute shortcut
   */
  static async executeShortcut(data) {
    if(!data.assets || !Array.isArray(data.assets)) return
    const asset = data.assets[Math.floor(Math.random() * data.assets.length)] 
    switch(data.type) {
      case "Macro":
        const macro = await fromUuid(asset.uuid)
        if(macro) {
          macro.execute()
        }
        break
      case "RollTable":
        const rolltable = await fromUuid(asset.uuid)
        if(rolltable) {
          rolltable.draw({displayChat: true})
        }
        break
      case "Scene":
        const scene = await fromUuid(asset.uuid)
          if(scene) {
            scene.view();
          }
          break
      case "Actor":
        const actor = await fromUuid(asset.uuid)
          if(actor) {
            actor.sheet.render(true);
          }
          break
      default:
        return ui.notifications.error(game.i18n.localize("mtte.errorBoardShortcutNotExecutable"))
    }
  }

  /**
   * Return data about the shortcut assets
   */
  static async getAssets(data) {
    if(!data.assets) return null
    const assets = []
    for(const a of data.assets) {
      switch(data.type) {
        case "Macro":
        case "RollTable":
        case "Scene":
        case "Actor":
          const asset = await fromUuid(a.uuid)
          assets.push({ name: asset ? asset.name : "-- invalid --" })
          break
      }
    }
    return assets
  }


}