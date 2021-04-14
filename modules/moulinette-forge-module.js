/*************************
 * Moulinette Forge Module
 *************************/
export class MoulinetteForgeModule {
  
  /**
   * Overwrite this function to implement your asset searchTerms
   */
  async getAssetList(searchTerms) {
    console.debug("Moulinette Forge Module | Default getAssetList() returns empty list")
    return []
  }
  
  /**
   * Overwrite this function to add your listeners
   */
  activateListeners(html) {
    console.debug("Moulinette Forge Module | Default activeListeners() does nothing")
  }
  
  /**
   * Overwrite this function to implement forge actions
   */
  async onAction(classList) {
    console.debug("Moulinette Forge Module | Default onAction() does nothing")
  }
  
  /**
   * Overwrite this function to additional HTML at the bottom of the list
   */
  async getFooter() {
    console.debug("Moulinette Forge Module | Default getFooter() returns nothing")
    return ""
  }
  
  /**
   * Overwrite this function to implement shortcut actions
   */
  async onShortcut(type) {
    console.debug("Moulinette Forge Module | Default onAction() does nothing")
  }
}
