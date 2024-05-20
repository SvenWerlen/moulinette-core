/**
 * Moulinette Shortcuts
 * 
 * This class handles shortcut management for Moulinette Board
 * 
 */
export class MoulinetteBoardShortcuts {

  static SUPPORTED_MTYPES = ["Sound", "Tile"]
  static SUPPORTED_TYPES = ["Macro", "RollTable", "Scene", "Actor", "Item", "JournalEntry", "PlaylistSound"]
  static ICONS = { 
    'Scene' : "fas fa-map", 
    'JournalEntry': "fas fa-book-open", 
    'Macro': "fas fa-code",
    'PlaylistSound': "fas fa-music",
    'RollTable': "fas fa-th-list",
    'Actor': "fas fa-user",
    'Item': "fas fa-suitcase",
   }

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
    if(MoulinetteBoardShortcuts.SUPPORTED_TYPES.includes(data.type)) {
      const asset = await fromUuid(data.uuid)
      if(asset) {
        let item = {
          type: data.type,
          name: asset.name,
          icon: asset.img || MoulinetteBoardShortcuts.ICONS[data.type],
          assets: [{
            uuid: data.uuid
          }]
        }
        if(!asset.img) {
          item.faIcon = true
        }
        return item
      }
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
        console.log(macro)
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
      if(module) {
        return module.instance.getBoardDataDataTransfer(asset)
      }
    }
    // FVTT core
    else if(MoulinetteBoardShortcuts.SUPPORTED_TYPES.includes(data.type)) {
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

  /**
   * Returns an HTML preview of the provided data
   */
  static async generatePreview(data) {
    if(!data) return ""
    let html = ""
    // Folder
    if(!data.assets) {
      html = `<h3><i class="fas fa-folder-open fa-lg"></i> ${data.name}</h3>`
      html += '<hr>' + game.i18n.localize("mtte.boardInstructionsFolder") + game.i18n.localize("mtte.boardInstructionsCommon")
    }
    // Moulinette
    else if(MoulinetteBoardShortcuts.SUPPORTED_MTYPES.includes(data.type)) {
      const module = game.moulinette.forge.find(f => f.id == MoulinetteBoardShortcuts.MODULES[data.type])
      if(module) {
        html += await module.instance.getBoardDataPreview(data)
      }
    }
    // FVTT core
    // Force translation of mtte.boardInstructionsMacro mtte.boardInstructionsRollTable mtte.boardInstructionsScene, mtte.boardInstructionsActor mtte.boardInstructionsItem mtte.boardInstructionsJournalEntry mtte.boardInstructionsPlaylistSound    
    else if(MoulinetteBoardShortcuts.SUPPORTED_TYPES.includes(data.type)) {
      html = `<h3><i class="${MoulinetteBoardShortcuts.ICONS[data.type]} fa-lg"></i> ${data.name}</h3>`
      if(data.assets.length > 1) {
        html += game.i18n.format("mtte.boardAssetsCount", { count: data.assets.length, type: data.type})
      } else if(data.assets.length == 1) {
        const asset = await fromUuid(data.assets[0].uuid)
        if(asset) {
          switch(data.type) {
            case "Macro":
              html += game.i18n.format("mtte.boardMacro", { type: asset.type })
              break
            case "JournalEntry":
              html += game.i18n.format("mtte.boardJournal", { count: asset.pages.size })
              break
            case "Scene":
              if(asset.thumbnail) {
                html += `<img src="${asset.thumbnail}"/>`
              }
              break;
            default:
              html += game.i18n.format("mtte.boardOther", { type: data.type })
          }
        }
        
      }
      html += '<hr>' + game.i18n.localize("mtte.boardInstructions" + data.type) + game.i18n.localize("mtte.boardInstructionsCommon")
    }
    return html
  }


  /**
   * Stops any ongoing preview
   */
  static stopPreview(data) {
    if(!data) return
    // Folder
    if(!data.assets) return
    // Moulinette
    else if(MoulinetteBoardShortcuts.SUPPORTED_MTYPES.includes(data.type)) {
      const module = game.moulinette.forge.find(f => f.id == MoulinetteBoardShortcuts.MODULES[data.type])
      if(module) {
        module.instance.stopBoardDataPreview(data)
      }
    }
    // FVTT core
    // Force translation of mtte.boardInstructionsMacro mtte.boardInstructionsRollTable mtte.boardInstructionsScene, mtte.boardInstructionsActor mtte.boardInstructionsItem mtte.boardInstructionsJournalEntry mtte.boardInstructionsPlaylistSound    
    else if(MoulinetteBoardShortcuts.SUPPORTED_TYPES.includes(data.type)) {
      return 
    }
  }

  /**
   * Returns the number of elements in the entire tree
   */
  static countChildren(data) {
    let count = 1
    if(data.nav) {
      for(const child of data.nav) {
        count += MoulinetteBoardShortcuts.countChildren(child)
      }
    }
    return count
  }
}