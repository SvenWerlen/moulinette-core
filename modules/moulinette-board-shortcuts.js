/**
 * Moulinette Shortcuts
 * 
 * This class handles shortcut management for Moulinette Board
 */
export class MoulinetteBoardShortcuts {

  static ICONS = { 'Scene' : "fas fa-map", 'JournalEntry': "fas fa-book-open", 'PlaylistSound': "fas fa-music" }
  static MODULES = { 'Sound': "sounds", 'Tile': "tiles" }

  /**
   * Retrieve asset from packs
   */

  /**
   * Generates a new shortcut
   */
  static async createShortcut(data) {
    if(data.source == "mtte") {
      // Source = Moulinette Cloud
      if(MoulinetteBoardShortcuts.MODULES[data.type]) {
        const module = game.moulinette.forge.find(f => f.id == MoulinetteBoardShortcuts.MODULES[data.type])
        const shortcut = module.instance.getBoardDataShortcut(data)
        if(shortcut) {
          const assets = await module.instance.getBoardDataAssets(data)
          if(assets) {
            shortcut.assets = assets
            return shortcut
          }
        }
      }
      // Source = Moulinette (local indexing)
      return null
    }

    // Source = FoundryVTT
    switch(data.type) {
      case "Macro":
      case "RollTable":
      case "Scene":
      case "Actor":
      case "Item":
      case "JournalEntry":
      case "PlaylistSound":
        const asset = await fromUuid(data.uuid)
        if(asset) {
          let item = {
            type: data.type,
            name: asset.name,
            icon: MoulinetteBoardShortcuts.ICONS[data.type] || asset.img,
            assets: [{
              uuid: data.uuid
            }]
          }
          if(MoulinetteBoardShortcuts.ICONS[data.type]) {
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
    // Moulinette
    if(MoulinetteBoardShortcuts.MODULES[data.type]) {
      const module = game.moulinette.forge.find(f => f.id == MoulinetteBoardShortcuts.MODULES[data.type])
      await module.instance.executeBoardDataAsset(asset) || ui.notifications.error(game.i18n.localize("mtte.errorBoardShortcutNotExecutable"))  
      return
    }
    // FoundryVTT
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
      case "Item":
      case "JournalEntry":
        const obj = await fromUuid(asset.uuid)
          if(obj) {
            obj.sheet.render(true);
          }
          break
      case "PlaylistSound":
        const sound = await fromUuid(asset.uuid)
        if(sound) {
          if (sound.playing) {
            await sound.parent.stopSound(sound);
          } else {
            await sound.parent.playSound(sound);
          }
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
    console.log("HERE", data)
    if(!data.assets || !Array.isArray(data.assets)) return null
    const assets = []
    for(const a of data.assets) {
      switch(data.type) {
        // MTTE
        case "Sound":
        case "Tile":
          const module = game.moulinette.forge.find(f => f.id == MoulinetteBoardShortcuts.MODULES[data.type])
          const name = await module.instance.getBoardDataAssetName(a)
          assets.push({ name: name ? name : "-- invalid --" })
          break
        // FVTT
        case "Macro":
        case "RollTable":
        case "Scene":
        case "Actor":
        case "Item":
        case "JournalEntry":
        case "PlaylistSound":
          const asset = await fromUuid(a.uuid)
          assets.push({ name: asset ? asset.name : "-- invalid --" })
          break
      }
    }
    return assets
  }

  /**
   * Generates a DataTransfer data as used by FVTT and Moulinette
   */
  static getDataTransfer(data) {
    delete game.moulinette.board.selected
    if(!data.assets || !Array.isArray(data.assets)) return
    // Enable multi-drop (Moulinette Layer)
    const asset = data.assets[Math.floor(Math.random() * data.assets.length)] 
    // Moulinette
    if(asset.pack) {
      game.moulinette.board.selected = data
      const module = game.moulinette.forge.find(f => f.id == MoulinetteBoardShortcuts.MODULES[data.type])
      return module.instance.getBoardDataDataTransfer(asset)
    }
    // FVTT core
    else if(["Macro", "RollTable", "Scene", "Actor", "Item", "JournalEntry", "PlaylistSound"].includes(data.type)) {
      return {
        uuid: asset.uuid,
        type: data.type
      }
    }
    delete game.moulinette.board.selected
    return {}
  }

  /**
   * Returns a random asset from last used board item
   */
  static getRandomAsset() {
    return game.moulinette.board.selected ? MoulinetteBoardShortcuts.getDataTransfer(game.moulinette.board.selected) : null
  }


}