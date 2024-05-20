/**
 * Moulinette API
 * 
 * Provides functions that partner modules can use to
 * integrate with Moulinette
 */
import { MoulinetteFilePickerUI } from "./moulinette-filepicker.js"

export class MoulinetteAPI {
  
  /**
   * Open Moulinette UI and triggers a search
   * - module : which module to trigger (tiles, scenes, etc.)
   * - search:
   *    - terms : search terms (filter)
   *    - creator : filter the pack list based on the creator name (must exactly match)
   *    - pack : filter the pack list based on the pack name (partial name (prefix) works too)
   */
  static searchUI(module, search = {} ) {
    const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
    if(!forgeClass) {
      return console.error("Moulinette API | You need to specify a valid (and enabled moulinette module) when calling searchUI. Try 'tiles' or 'scenes'")
    }
    new forgeClass(module, search).render(true)
  }

  /**
   * Open Moulinette Filepicker
   * Returns the path of the asset the user selected
   * - callback: the function to call with the path of the selected asset
   * - search:
   *    - terms: search terms (filter)
   *    - creator : filter the results for a specific creator name (must exactly match)
   *    - pack: filter the results for a specific pack name (partial name (prefix) works too)
   */
  static async assetPicker(callback, search = {}) {
    const module = game.moulinette.forge.find(f => f.id == "tiles")
    if(!module ) {
      return console.error("Moulinette API | Moulinette Tiles is required. Please install and enable it!")
    }

    const picker = new MoulinetteFilePickerUI(module, {
      type: "image",
      search: search,
      callbackSelect: (path) => {
        if ( !path ) return ui.notifications.error("You must select an asset to proceed.");

        // Update the target field
        if ( this.field ) {
          this.field.value = path;
          this.field.dispatchEvent(new Event("change"));
        }

        // Trigger a callback and close
        if ( callback ) callback(path, this);
        return picker.close();
      },
      callbackDefault: () => {
        // close moulinette asset picker
        picker.close();
        // open new picker
        const defPicker = new FilePicker({forceDefault: true, type: "image", callback: (path) => {
          // Trigger a callback and close
          if ( callback ) callback(path, this);
          return defPicker.close();
        }})
        return defPicker.render(true)
      }
    })
    picker.render(true)
  }

  /**
   * Retrieve the URL of the asset 
   * - type: type of asset (sounds)
   * - packIdx: pack index
   * - assetPath: asset relative path
   */
  static getAssetURL(type, packIdx, assetPath) {
    const module = game.moulinette.forge.find(f => f.id == type)
    if(module) {
      return module.instance.getAssetURL(packIdx, assetPath)
    }
    return null
  }

};
