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
   * - terms : search terms
   * - module : which module to trigger (tiles, scenes, etc.)
   * - options:
   *    - packName : filter the pack list based on the pack name (partial name (prefix) works too)
   */
  static searchUI(terms, module, options = {} ) {
    const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
    if(!terms) {
      return console.error("Moulinette API | You need to specify 'terms' when calling searchUI")
    }
    const search = { terms: terms }
    if(options && options.packName) {
      search.pack = options.packName
    }
    new forgeClass(module, search).render(true)
  }

  /**
   * Open Moulinette Filepicker
   * Returns the path of the asset the user selected
   * - search:
   *    - terms: search terms (filter)
   *    - pack: filter the pack list based on the pack name (partial name (prefix) works too)
   */
  static async assetPickerBrowse(callback, search = {}) {
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

};
