import { MoulinetteForgeModule } from "./moulinette-forge-module.js"

/*************************
 * Moulinette Forge
 *************************/
export class MoulinetteForge extends FormApplication {
  
  static MAX_ASSETS = 100
  
  static get TABS() { return game.moulinette.forge.map( f => f.id ) }
  
  constructor(tab, search) {
    super()
    const curTab = tab ? tab : game.settings.get("moulinette", "currentTab")
    this.assetInc = 0
    this.tab = MoulinetteForge.TABS.includes(curTab) ? curTab : null
    this.search = search

    // clear all caches
    for(const f of game.moulinette.forge) {
      f.instance.clearCache()
    }
  }
  
  static get defaultOptions() {
    const position = game.settings.get("moulinette", "winPosForge")
    const uiMode = game.settings.get("moulinette-core", "uiMode")
    return mergeObject(super.defaultOptions, {
      id: "moulinette",
      classes: ["mtte", "forge", uiMode == "compact" ? "compact" : "normal"],
      title: game.i18n.localize("mtte.moulinetteForge"),
      template: "modules/moulinette-core/templates/forge.hbs",
      width: position ? position.width : 880,
      height: 800,
      left: position ? position.left : null,
      top: position ? position.top : null,
      resizable: true,
      dragDrop: [{dragSelector: ".draggable"}],
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  close() {
    // store window position and size
    game.settings.set("moulinette", "winPosForge", this.position)
    super.close()
  }
  
  async getData() {
    const uiMode = game.settings.get("moulinette-core", "uiMode")
    if(!game.user.isGM) {
      return { error: game.i18n.localize("mtte.errorGMOnly") }
    }
    
    // no module available
    if(game.moulinette.forge.length == 0) {
      return { error: game.i18n.localize("mtte.errorNoModule") }
    }
    
    // highlight selected tab
    for(const f of game.moulinette.forge) {
      f.active = this.tab == f.id
      if(f.active) {
        this.activeModule = f
      }
    }
    
    // no active module => select first
    if(!this.activeModule) {
      this.activeModule = game.moulinette.forge[0]
      this.activeModule.active = true
    }
    
    // color
    const cloudColor = game.settings.get("moulinette-core", "cloudColor")

    // fetch available packs & build publishers
    let publishers = {}
    let packs = await this.activeModule.instance.getPackList()
    packs = packs.sort((a, b) => (a.publisher == b.publisher) ? (a.name > b.name ? 1 : -1) : (a.publisher > b.publisher ? 1 : -1)) // sort by 1) publisher and 2) name
    let assetsCount = 0
    let special = false
    packs.forEach(p => { 
      if(p.special) special = true
      else assetsCount += p.count
        
      if(p.publisher in publishers) {
        publishers[p.publisher].count += p.count
        if(p.isRemote) publishers[p.publisher].isRemote = true
      } else {
        publishers[p.publisher] = { name: p.publisher, count: p.count, isRemote: p.isRemote }
      }

      // highlight cloud/remote assets based on configuration
      if(p.isRemote && cloudColor == "def") p.class = "cloud"
      if(p.isRemote && cloudColor == "contrast") p.class = "cloud contrast"
    })
    publishers = Object.values(publishers).filter(p => p.count > 0 && !(this.search && this.search.creator && p.name != this.search.creator)).sort((a,b) => a.name > b.name)
    
    // prepare packs 
    // - cleans packname by removing publisher from pack name to avoid redundancy
    packs = duplicate(packs.filter(p => p.count > 0 && !(this.search && this.search.creator && p.publisher != this.search.creator) || p.special))
    for(const p of packs) {
      p["cleanName"] = p["name"].startsWith(p["publisher"]) ? p["name"].substring(p["publisher"].length).trim() : p["name"]
    }
    
    const browseMode = game.settings.get("moulinette-core", "browseMode")

    // autoselect matching pack (if any)
    // autoselect matchiing pack (if call by searchAPI)
    let publisher = this.search && this.search.creator ? this.search.creator : null
    let packIdx = -1
    let matchingPack = null
    if(browseMode == "byPack" && this.curPack) {
      matchingPack = packs.find(p => p.path == this.curPack);
    }
    if(this.search && this.search.pack) {
      matchingPack = packs.find(p => p.name.startsWith(this.search.pack));
    }
    if(matchingPack) {
      packIdx = matchingPack.idx
      matchingPack.selected = "selected"
    }

    // fetch initial asset list
    const terms = this.search && this.search.terms ? this.search.terms : ""
    this.assets = await this.activeModule.instance.getAssetList(terms, packIdx, publisher)

    const data = { 
      user: await game.moulinette.applications.Moulinette.getUser(),
      modules: game.moulinette.forge.sort((a,b) => a.name < b.name ? -1 : 1), 
      activeModule: this.activeModule,
      supportsModes: this.activeModule.instance.supportsModes(),
      supportsThumbSizes: this.activeModule.instance.supportsThumbSizes(),
      assetsCount: `${assetsCount.toLocaleString()}${special ? "+" : ""}`,
      assets: this.assets.slice(0, MoulinetteForge.MAX_ASSETS),
      footer: await this.activeModule.instance.getFooter(),
      terms: terms,
      compactUI: uiMode == "compact"
    }
    
    if(browseMode == "byPub") {
      data.publishers = publishers
    } else {
      data.packs = packs
    }

    // reset initial search
    this.search = null
      
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // make sure window is on top of others
    this.bringToTop()
    
    // give focus to input text
    html.find("#search").focus();
    
    // module navigation
    html.find(".tabs a").click(this._onNavigate.bind(this));
    
    // buttons
    html.find("button").click(this._onClickButton.bind(this))
   
    // display mode
    html.find(".display-modes a").click(this._onChangeDisplayMode.bind(this))

    // thumb sizes
    html.find(".thumbsizes a").click(this._onChangeThumbsizes.bind(this))
    
    // highlight current displayMode
    const dMode = game.settings.get("moulinette", "displayMode")
    html.find(`.display-modes .mode-${dMode}`).addClass("active")
    
    // asset search (filter on pack)
    html.find("select.plist").on('change', this._onPackOrPubSelected.bind(this));
    
    // delegate activation to module
    if(this.activeModule) {
      this.activeModule.instance.activateListeners(html)
    }
    
    // enable expand listeners
    html.find(".expand").click(this._onToggleExpand.bind(this));
    
    // autoload on scroll
    html.find(".list").on('scroll', this._onScroll.bind(this))

    this.html = html
  }
  
  /**
   * User clicked on another tab (i.e. module)
   */
  async _onNavigate(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const tab = source.dataset.tab;
    // keep current selection
    if(game.settings.get("moulinette-core", "browseMode") == "byPack") {
      const packId = this.html.find(".plist option:selected").val()
      if(packId) {
        let packs = await this.activeModule.instance.getPackList()
        if(packId in packs) {
          this.curPack = packs[packId].path
        }
      }
    }
    if(MoulinetteForge.TABS.includes(tab)) {
      this.assets = [] // clean search list
      this.tab = tab
      game.settings.set("moulinette", "currentTab", tab)
      this.render();
    }
  }
  
  /**
   * User selected a pack
   */
  async _onPackOrPubSelected(event) {
    this.html.find("#search").val("")
    await this._searchAssets()
  }
  
  /**
   * User clicked on button (or ENTER on search)
   */
  async _onClickButton(event) {
    event.preventDefault();

    // delegate activation to module
    if(this.activeModule) {

      const source = event.currentTarget;
      // search
      if(source.classList.contains("search")) {
        await this._searchAssets()
      } 
      // any other action
      else {
        const refresh = await this.activeModule.instance.onAction(source.classList)
        if(refresh) {
          this.render()
        }
      }
    }
  }
  
  /**
   * Refresh the list based on the new search
   */
  async _searchAssets() {
    const searchTerms = this.html.find("#search").val().toLowerCase()
    const selectedValue = this.html.find(".plist").children("option:selected").val()
    
    const browseMode = game.settings.get("moulinette-core", "browseMode")
    if(browseMode == "byPub") {
      this.assets = await this.activeModule.instance.getAssetList(searchTerms, -1, selectedValue == -1 ? undefined : selectedValue)
    } else {
      this.assets = await this.activeModule.instance.getAssetList(searchTerms, selectedValue)
    }
    
    const supportsModes = this.activeModule.instance.supportsModes()
    
    this.expand = true // flag to disable expand/collapse
    if(this.assets.length == 0 && searchTerms.length == 0) {
      this.html.find('.list').html(`<div class="error">${game.i18n.localize("mtte.specialSearch")}</div>`)
    }
    else if(this.assets.length == 0) {
      this.html.find('.list').html(`<div class="error">${game.i18n.localize("mtte.noResult")}</div>`)
    }
    else {
      // browse => show all folders but no asset
      const viewMode = game.settings.get("moulinette", "displayMode")
      let assetsToShow = supportsModes && viewMode == "browse" ? this.assets.filter(a => a.indexOf('class="folder"') > 0) : this.assets.slice(0, MoulinetteForge.MAX_ASSETS).join("")
      // if only 1 folder, show all assets
      if(assetsToShow.length == 1 && viewMode == "browse") {
        assetsToShow = this.assets
        this.expand = false
      }
      
      if(assetsToShow.length == 0 && viewMode == "browse") {
        this.html.find('.list').html(`<div class="error">${game.i18n.localize("mtte.errorBrowseUpdateModule")}</div>`)
      } else {
        this.html.find('.list').html(assetsToShow)
      }
      
      this.ignoreScroll = supportsModes && viewMode == "browse"
      this.assetInc = 0
    }
    
    // re-enable listeners
    this._reEnableListeners()
    
    // force resize window
    this.setPosition()
  }
  
  /**
   * Dragging event
   */
  _onDragStart(event) {
    super._onDragStart(event)
    
    // delegate activation to module
    if(this.activeModule) {
      this.activeModule.instance.onDragStart(event)
    }
  }
  
  /**
   * Show/hide assets in one specific folder
   */
  async _onToggleExpand(event) {
    event.preventDefault();
    const source = event.currentTarget
    const folderEl = $(source).closest('.folder')
    const folder = folderEl.data('path')
    if(!this.expand || folderEl.hasClass("expanded")) {
      folderEl.find("div").toggle()
      return
    }
    
    const regex = new RegExp(`data-path="[^"]*${folder.replace("(",'\\(').replace(")",'\\)')}[^"/]+"`, "g")
    let matchList = []
    for(const a of this.assets) {
      if(decodeURIComponent(a).match(regex)) {
        matchList.push(a)
      }
    }
    folderEl.append(matchList)
    folderEl.addClass("expanded")
    
    // re-enable listeners
    this._reEnableListeners()
  }
  
  /**
   * Scroll event
   */
  async _onScroll(event) {
    if(this.ignoreScroll) return;
    const bottom = $(event.currentTarget).prop("scrollHeight") - $(event.currentTarget).scrollTop()
    const height = $(event.currentTarget).height();
    if(!this.assets) return;
    if(bottom - 20 < height) {
      this.ignoreScroll = true // avoid multiple events to occur while scrolling
      if(this.assetInc * MoulinetteForge.MAX_ASSETS < this.assets.length) {
        this.assetInc++
        this.html.find('.list').append(this.assets.slice(this.assetInc * MoulinetteForge.MAX_ASSETS, (this.assetInc+1) * MoulinetteForge.MAX_ASSETS))
        this._reEnableListeners()
      }
      this.ignoreScroll = false
    }
  }

  // re-enable listeners
  _reEnableListeners() {
    this.html.find("*").off()
    this.activateListeners(this.html)
    this._activateCoreListeners(this.html)
  }
  
  /**
   * User chose display mode
   */
  async _onChangeDisplayMode(event) {
    event.preventDefault();
    let mode = "tiles"
    const source = event.currentTarget
    if(source.classList.contains("mode-list")) {
      mode = "list"
    } else if(source.classList.contains("mode-browse")) {
      mode = "browse"
    }
    this.ignoreScroll = mode == "browse"
    await game.settings.set("moulinette", "displayMode", mode)
    this.html.find(".display-modes a").removeClass("active")
    this.html.find(`.display-modes a.mode-${mode}`).removeClass("active")
    this._searchAssets()
  }

  /**
   * User chose thumbsizes
   */
  async _onChangeThumbsizes(event) {
    event.preventDefault();
    const source = event.currentTarget
    this.activeModule.instance.onChangeThumbsSize(source.classList.contains("plus"))
  }
  
}
