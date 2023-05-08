/*************************
 * Moulinette Forge Module
 *************************/
export class MoulinetteForgeModule {

  static MAX_HISTORY = 100
  
  /**
   * Overwrite this function to implement your clear cache
   */
  clearCache() {
    console.debug("Moulinette Forge Module | Default clearCache() not implemented")
  }
  
  /**
   * Overwrite this function to indicate if the module supports multiple modes (default : yes)
   */
  supportsModes() {
    console.debug("Moulinette Forge Module | Default supportsMode() not implemented")
    return true
  }

  /**
   * Overwrite this function to indicate if the module supports thumb sizes
   */
  supportsThumbSizes() {
    console.debug("Moulinette Forge Module | Default supportsThumbSizes() not implemented")
    return false
  }

  /**
   * Overwrite this function to indicate if the module supports whole word search
   */
  supportsWholeWordSearch() {
    console.debug("Moulinette Forge Module | Default supportsWholeWordSearch() not implemented")
    return false
  }

  /**
   * Overwrite this function to implement thumb sizes
   */
  async onChangeThumbsSize(increase) {
    console.debug("Moulinette Forge Module | Default onChangeThumbsSize() does nothing")
  }
  
  /**
   * Overwrite this function to implement your asset packs/categories
   */
  async getPackList() {
    console.debug("Moulinette Forge Module | Default getPackList() returns empty list")
    return []
  }
    
  /**
   * Overwrite this function to implement your asset search (filter with searchTerms)
   */
  async getAssetList(searchTerms, packs, publisher, moduleFilters) {
    console.debug("Moulinette Forge Module | Default getAssetList() returns empty list")
    return []
  }
  
  /**
   * Overwrite this function to add your listeners
   */
  activateListeners(html, callbackSelect) {
    console.debug("Moulinette Forge Module | Default activeListeners() does nothing")
  }
  
  /**
   * Overwrite this function to implement forge actions
   */
  async onAction(classList) {
    console.debug("Moulinette Forge Module | Default onAction() does nothing")
  }
  
  /**
   * Overwrite this function to implement onDragStart action
   */
  onDragStart(event) {
    console.debug("Moulinette Forge Module | Default onDragStart() does nothing")
  }

  /**
   * Overwrite this function to implement onLeftClickGrid action (on Canvas)
   */
  async onLeftClickGrid(data) {
    console.debug("Moulinette Forge Module | Default onLeftClickGrid() does nothing")
  }

  /**
   * Overwrite this function to implement onRightClickGrid action (on Canvas)
   */
  async onRightClickGrid(data) {
    console.debug("Moulinette Forge Module | Default onRightClickGrid() does nothing")
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

  /**
   * Common function to add asset to history
   */
  async addToHistory(pack, tile) {
    const fav = game.settings.get("moulinette", "favorites")

    if(!("history" in fav)) {
      fav.history = { icon: "fas fa-history", list: [] }
    }

    // remove from history if already exists
    let found = false
    for(let i = 0; i < fav.history.list.length; i++){
      const a = fav.history.list[i]
      if (a.pub == pack.publisher && a.pack == pack.name && a.asset == tile.filename) {
        fav.history.list.splice(i, 1);
        found = true
      }
    }
    // add at the end of the list
    fav.history.list.push({ pub: pack.publisher, pack: pack.name, asset: tile.filename})

    // remove first element if size > MAX_HISTORY
    if(fav.history.list.length > MoulinetteForgeModule.MAX_HISTORY) {
      fav.history.list.shift()
    }

    // store new favorites back
    await game.settings.set("moulinette", "favorites", fav)
  }


  /**
   * Common function to toggle an asset as favorite
   * Returns the list of favorites group the asset is now in
   *
   * Structure is : {
   *   favID : { 'icon': "fa icon", 'list': [{ pub: <publisher>, pack: <pack>, asset: <path> }] },
   * }
   */
  async toggleFavorite(pack, tile, deleteOnly = false) {
    const fav = game.settings.get("moulinette", "favorites")
    let curFav = game.settings.get("moulinette", "currentFav")

    if(!deleteOnly && curFav == "history") {
      curFav = "default"
    }

    if(!(curFav in fav)) {
      console.warn(`Favorite category ${curFav} doesn't exist!`)
      return []
    }

    let found = false
    for(let i = 0; i < fav[curFav].list.length; i++){
      const a = fav[curFav].list[i]
      if (a.pub == pack.publisher && a.pack == pack.name && a.asset == tile.filename) {
        fav[curFav].list.splice(i, 1);
        found = true
      }
    }
    if(!deleteOnly && !found) {
      fav[curFav].list.push({ pub: pack.publisher, pack: pack.name, asset: tile.filename})
    }

    const groups = []
    for(const f in fav) {
      if(f == "history") continue
      const found = fav[f].list.find(a => a.pub == pack.publisher && a.pack == pack.name && a.asset == tile.filename)
      if(found) {
        groups.push(fav[f].icon)
      }
    }

    // store new favorites back
    await game.settings.set("moulinette", "favorites", fav)
    return groups
  }

  /**
   * Common function to check if an asset has been selected as favorite or not
   * Returns a list of favorite groups
   */
  isFavorite(pack, tile) {
    const groups = []
    const favs = game.settings.get("moulinette", "favorites")
    for( const f in favs ) {
      if(f == "history") continue;
      const found = favs[f].list.find(a => a.pub == pack.publisher && a.pack == pack.name && a.asset == tile.filename)
      if(found) {
        groups.push(favs[f].icon)
      }
    }
    return groups
  }

  /**
   * Clears the favorites of the currently selected list
   */
  async clearFavorites() {
    const favs = game.settings.get("moulinette", "favorites")
    const curFav = game.settings.get("moulinette", "currentFav")
    favs[curFav].list = []
    await game.settings.set("moulinette", "favorites", favs)
  }
  
  /**
   * Overwrite this function to implement function
   */
  async getAssetURL(packIdx, path) {
    console.debug("Moulinette Forge Module | Default getAssetURL() does nothing")
  }

  /**
   * Overwrite this function to implement module-specific indexing
   */
  async indexAssets() {
    console.debug("Moulinette Forge Module | Default onIndexAssets() does nothing")
    return []
  }

  /**
   * Overwrite this function to add filters
   */
  getFilters() {
    console.debug("Moulinette Forge Module | Default getFilters() returns nothing")
    return []
  }
}
