import { MoulinettePatreon } from "./moulinette-patreon.js"
import { MoulinetteShortcuts } from "./moulinette-shortcuts.js"
import { MoulinetteForgeFilters } from "./moulinette-forge-filters.js"

/*************************
 * Moulinette Forge
 *************************/
export class MoulinetteForge extends FormApplication {
  
  static MAX_ASSETS = 100
  
  static get TABS() { return game.moulinette.forge.map( f => f.id ) }
  
  constructor(tab, search) {
    super()
    const curSavedTab = game.settings.get("moulinette", "currentTab")
    const curTab = tab ? tab : curSavedTab
    this.assetInc = 0
    this.tab = MoulinetteForge.TABS.includes(curTab) ? curTab : null
    this.search = search

    // store tab
    if(this.tab != curSavedTab) {
      game.settings.set("moulinette", "currentTab", this.tab)
    }

    // clear all caches
    for(const f of game.moulinette.forge) {
      f.instance.clearCache()
    }

    // timer for storing position
    this.positionTimer = null
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
      height: position ? position.height : 800,
      left: position ? position.left : null,
      top: position ? position.top : null,
      resizable: true,
      dragDrop: [{dragSelector: ".draggable"}],
      closeOnSubmit: false,
      submitOnClose: false,
    });
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

    // filters
    const filters = this.activeModule.instance.getFilters()

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
        if(p.isRemote) {
          publishers[p.publisher].isRemote = true
        }
      } else {
        publishers[p.publisher] = { name: p.publisher, count: p.count, isRemote: p.isRemote, special: p.special }
      }
    })
    // highlight cloud/remote creators based on configuration
    Object.keys(publishers).forEach(k => {
      const p = publishers[k]
      if(p.isRemote && cloudColor == "def") p.class = "cloud"
      if(p.isRemote && cloudColor == "contrast") p.class = "cloud contrast"
    })

    publishers = Object.values(publishers).filter(p => p.special || p.count > 0).sort((a,b) => a.name > b.name)
    
    // prepare packs 
    // - cleans packname by removing publisher from pack name to avoid redundancy
    packs = duplicate(packs.filter(p => p.count > 0 && !(this.search && this.search.creator && p.publisher != this.search.creator) || p.special))
    for(const p of packs) {
      p["cleanName"] = p["name"].startsWith(p["publisher"]) ? p["name"].substring(p["publisher"].length).trim() : p["name"]
    }

    // retrieve module filters
    const curFilters = game.settings.get("moulinette", "moduleFilters")
    const moduleId = this.activeModule.id
    const moduleFilters = moduleId in curFilters ? curFilters[moduleId] : []

    // fetch initial asset list
    const terms = this.search && this.search.terms ? this.search.terms : ""
    this.assets = terms.length > 0 ? await this.activeModule.instance.getAssetList(terms, -1, null, moduleFilters) : []

    const data = {
      user: await game.moulinette.applications.Moulinette.getUser(),
      modules: game.moulinette.forge.sort((a,b) => a.name < b.name ? -1 : 1), 
      activeModule: this.activeModule,
      supportsModes: this.activeModule.instance.supportsModes(),
      supportsThumbSizes: this.activeModule.instance.supportsThumbSizes(),
      supportsWholeWordSearch: this.activeModule.instance.supportsWholeWordSearch(),
      supportsShortcuts: ["tiles", "sounds", "scenes", "prefabs"].includes(this.activeModule.id),
      supportsFilters: filters.length > 0,
      filters: filters,
      filtersEnabled: moduleFilters.length > 0,
      hidePacks: assetsCount == 0,
      assetsCount: `${assetsCount.toLocaleString()}${special ? "+" : ""}`,
      assets: this.assets.slice(0, MoulinetteForge.MAX_ASSETS),
      footer: await this.activeModule.instance.getFooter(),
      terms: terms,
      compactUI: uiMode == "compact",
      dropdownModeAuto: game.settings.get("moulinette-core", "dropdownMode") == "auto",
      disabled: !game.settings.get("moulinette-core", "enableMoulinetteCloud")
    }
    
    data.publishers = publishers
    data.packs = []

    // keep publisher names for up/down key events
    this.publishers = publishers.map(p => p.name)

    // reset initial search
    this.selCreator = null
    this.selPack = -1
      
    return data;
  }

  activateListeners(html, focus = true) {
    super.activateListeners(html);
    
    const parent = this

    // make sure window is on top of others (except if called from child)
    if(!this.noBringToTop) {
      this.bringToTop()
      this.noBringToTop = false
    }
    
    // give focus to input text
    if(focus) {
      html.find("#search").focus();
    }
    
    // module navigation
    html.find(".tabs a").click(this._onNavigate.bind(this));

    // search options
    html.find(".sOptions a").click(this._onSearchOptions.bind(this))

    // initialize
    if(game.settings.get("moulinette", "wholeWordSearch")) {
      html.find(".sOptions a.wholeWord").addClass("active")
    }

    // re-enable moulinette Cloud
    html.find(".mouCloudEnable").click(async function(ev) {
      ev.preventDefault()
      await game.settings.set("moulinette-core", "enableMoulinetteCloud", true)
      parent.render()
    })

    // buttons
    html.find("button").click(this._onClickButton.bind(this))

    // shortcuts
    html.find(".shortcuts a").click(this._onGenerateShortcuts.bind(this))

    // display mode
    html.find(".display-modes a").click(this._onChangeDisplayMode.bind(this))

    // thumb sizes
    html.find(".thumbsizes a").click(this._onChangeThumbsizes.bind(this))

    // filters
    html.find(".filters a").click(this._onFilters.bind(this))

    // footer toggle
    html.find(".footerToggle a").click(ev => html.find(".footer").show())

    // patreon authentication
    html.find(".mouAuthenticate").click(ev => { 
      ev.preventDefault(); 
      new MoulinettePatreon(parent).render(true); 
      return false; 
    })
    
    // highlight current displayMode
    const dMode = game.settings.get("moulinette", "displayMode")
    html.find(`.display-modes .mode-${dMode}`).addClass("active")

    // asset search (filter on creator)
    html.find(".filterList.creators a").click(async function(ev) {
      ev.preventDefault();
      const source = ev.currentTarget;
      parent._onCreatorSelected($(source).closest("li").data("id"), $(source).closest(".top"))
    });
    html.find(".filterCombo.creators").change(function(ev) {
      ev.preventDefault();
      const id = $(this).find(":selected").val()
      parent._onCreatorSelectedDropDown(id)
    });

    // asset search (filter on pack)
    html.find(".filterList.packs a").click(async function(ev) {
      ev.preventDefault();
      const source = ev.currentTarget;
      parent._onPackSelected($(source).closest("li").data("id"), $(source).closest(".top"));
    });
    html.find(".filterCombo.packs").change(async function(ev) {
      ev.preventDefault();
      parent.selPack = $(this).find(":selected").val()
      await parent._searchAssets()
    });

    // up / down => select next entry
    html.find(".filterList.creators").keydown(function(ev) {
      const kEv = ev.originalEvent
      if(ev.key == "Tab") {
        ev.preventDefault();
        html.find(ev.shiftKey ? "#search" : ".filterList.packs").focus()
      } else if(ev.key == "ArrowDown" || ev.key == "ArrowUp") {
        ev.preventDefault();
        // index can only be [0..pub.lenth]
        const idx = Math.max(-1, parent.publishers.indexOf(parent.selCreator))
        const newIdx = Math.min(Math.max(-1, idx + (ev.key == "ArrowDown" ? 1 : -1)), parent.publishers.length -1)
        parent._onCreatorSelected(newIdx < 0 ? "-1" : parent.publishers[newIdx], $(ev.currentTarget).closest(".top"));
      }
    })
    html.find(".filterList.packs").keydown(function(ev) {
      const kEv = ev.originalEvent
      if(ev.key == "Tab") {
        ev.preventDefault();
        html.find(ev.shiftKey ? ".filterList.creators" : "#search").focus()
      } else if(ev.key == "ArrowDown" || ev.key == "ArrowUp") {
        ev.preventDefault();
        // index can only be [0..pack.lenth]
        const idx = Math.max(-1, parent.packs.findIndex(p => p.id == parent.selPack))
        const newIdx = Math.min(Math.max(-1, idx + (ev.key == "ArrowDown" ? 1 : -1)), parent.packs.length -1)
        parent._onPackSelected(newIdx < 0 ? "-1" : parent.packs[newIdx].id, $(event.currentTarget).closest(".top"));
      }
    })

    // delegate activation to module
    if(this.activeModule) {
      this.activeModule.instance.activateListeners(html)
    }
    
    // enable expand listeners
    html.find(".expand").click(this._onToggleExpand.bind(this));
    
    // autoload on scroll
    html.find(".list").on('scroll', this._onScroll.bind(this))

    const maxHeight = 400

    $(".filterList > li").hover(function() {
      const $container = $(this),
          $list = $container.find("ul"),
          $anchor = $container.find("a"),
          height = $list.height() * 1.0,   // make sure there is enough room at the bottom
          multiplier = height / maxHeight; // needs to move faster if list is taller

      // need to save height here so it can revert on mouseout
      $container.data("origHeight", $container.height());

      // so it can retain it's rollover color all the while the dropdown is open
      $anchor.addClass("hover");

      // make sure dropdown appears directly below parent list item
      $list.show().css({ paddingTop: $container.data("origHeight")});

      // don't do any animation if list shorter than max
      if (multiplier > 1) {
        $container
          .css({ height: maxHeight, overflow: "hidden" })
          .mousemove(function(e) {
              var offset = $container.offset();
              var relativeY = ((e.pageY - offset.top) * multiplier) - ($container.data("origHeight") * multiplier);
              if (relativeY > $container.data("origHeight")) {
                  $list.css("top", -relativeY + $container.data("origHeight"));
              };
          });
      }

    }, function() {
      var $el = $(this);
      // put things back to normal
      $el
        .height($(this).data("origHeight"))
        .find("ul")
        .css({ top: 0 })
        .hide()
        .end()
        .find("a")
        .removeClass("hover");

    });

    this.html = html

    // initialize search
    if(this.search && this.search.creator) {
      const creator = this.search.creator
      this.search.creator = null
      this._onCreatorSelected(creator, html.find(".filterList.creators .top"))
    }
    else if(this.search && this.search.pack) {
      const match = this.packs.find(p => p.name == this.search.pack)
      this.search.pack = null
      if(match) {
        this._onPackSelected(match.id, html.find(".filterList.packs .top"))
      }
    }
  }

  /**
   * User selects a creator in the list (default HTML implementation)
   */
  async _onCreatorSelectedDropDown(id) {
    const Moulinette = game.moulinette.applications.Moulinette
    this.selCreator = id && id != "-1" ? id : null
    this.selPack = "-1"
    // refresh pack list
    let packs = await this.activeModule.instance.getPackList()
    packs = packs.filter(p => p.count > 0)
    const assetsCount = packs.reduce((acc, p) => acc + p.count, 0); // count number of assets
    if(this.selCreator) {
      packs = Moulinette.optimizePacks(packs.filter(p => p.publisher == id))
    }

    // color
    const cloudColor = game.settings.get("moulinette-core", "cloudColor")

    this.packs = []
    let packList = `<option value="-1">${game.i18n.localize("mtte.allPacks")}</option>`
    if(this.selCreator) {
      const packNames = Object.keys(packs).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      for(const p of packNames) {
        const count = packs[p].reduce((acc, p) => acc + p.count, 0);
        const ids = packs[p].reduce((acc, p) => acc + (acc.length > 0 ? "," : "") + p.idx, "");
        const isRemote = packs[p].reduce((remote, p) => remote && p.isRemote, true);
        const isFree = packs[p].reduce((free, p) => free && p.isFree, true);
        
        // highlight cloud/remote assets based on configuration
        let packClass = ""
        if(isRemote && cloudColor == "def") packClass = "cloud"
        if(isRemote && cloudColor == "contrast") packClass = "cloud contrast"

        const packName = Moulinette.prettyText(p)
        packList += `<option value="${ids}" class="${packClass}">${Moulinette.prettyText(packName)} ${isFree ? "🎁 " : ""}(${Moulinette.prettyNumber(count)})</option>`
        // keep pack ids for up/down key event
        this.packs.push({ id: ids, name: packName})
      }
    }
    this.html.find(".filterCombo.packs").html(packList)

    await this._searchAssets()
  }

  /**
   * User selects a creator in the list
   */
  async _onCreatorSelected(id, dropDownList) {
    const Moulinette = game.moulinette.applications.Moulinette
    this.selCreator = id && id != "-1" ? id : null
    this.selPack = "-1"
    this.html.find("#creatorName").text(this.selCreator ? id : game.i18n.localize("mtte.chooseCreator"))
    dropDownList.height(dropDownList.data("origHeight"))
    // refresh pack list
    this.html.find("#packName").text(game.i18n.localize("mtte.choosePack"))
    let packs = await this.activeModule.instance.getPackList()
    packs = packs.filter(p => p.count > 0)
    const assetsCount = packs.reduce((acc, p) => acc + p.count, 0); // count number of assets
    if(this.selCreator) {
      packs = Moulinette.optimizePacks(packs.filter(p => p.publisher == id))
    }

    // color
    const cloudColor = game.settings.get("moulinette-core", "cloudColor")

    this.packs = []
    let packList = `<li data-id="-1" class="all"><a>${game.i18n.localize("mtte.allPacks")} (${Moulinette.prettyNumber(assetsCount)})</a></li>`
    if(this.selCreator) {
      const packNames = Object.keys(packs).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      for(const p of packNames) {
        const count = packs[p].reduce((acc, p) => acc + p.count, 0);
        const ids = packs[p].reduce((acc, p) => acc + (acc.length > 0 ? "," : "") + p.idx, "");
        const isRemote = packs[p].reduce((remote, p) => remote && p.isRemote, true);
        const isFree = packs[p].reduce((free, p) => free && p.isFree, true);

        // highlight cloud/remote assets based on configuration
        let packClass = ""
        if(isRemote && cloudColor == "def") packClass = "cloud"
        if(isRemote && cloudColor == "contrast") packClass = "cloud contrast"

        const packName = Moulinette.prettyText(p)
        packList += `<li data-id="${ids}" class="${packClass}"><a><i class="fas fa-${isRemote ? "cloud" : "desktop"}"></i> ${Moulinette.prettyText(packName)} ${ isFree ? '<i class="fa-solid fa-gift"></i> ' : ''}(${Moulinette.prettyNumber(count)})</a></li>`
        // keep pack ids for up/down key event
        this.packs.push({ id: ids, name: packName})
      }
    }
    packList += `<li class="filler"></li>`
    this.html.find(".filterList.packs .sub_menu").html(packList)

    await this._searchAssets()
    this.html.find(".filterList.creators").focus()
  }

  /**
   * User selects a pack in the list
   */
  async _onPackSelected(id, dropDownList) {
    this.selPack = id
    if(this.selPack) {
      const match = this.packs.find(p => p.id == id)
      this.html.find("#packName").text(match ? match.name : game.i18n.localize("mtte.choosePack"))
      dropDownList.height(dropDownList.data("origHeight"))
      await this._searchAssets()
      this.html.find(".filterList.packs").focus()
    }
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
   * User clicked on search option
   */
  async _onSearchOptions(event) {
    event.preventDefault();

    const source = event.currentTarget;
    if(source.classList.contains("wholeWord")) {
      $(source).toggleClass("active")
      // store in settings
      const wholeWord = $(source).hasClass("active")
      await game.settings.set("moulinette", "wholeWordSearch", wholeWord)
      ui.notifications.info(game.i18n.localize(wholeWord ? "mtte.wholeWordEnabled" : "mtte.wholeWordDisabled"));
      this._searchAssets()
    }
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
      // search
      else if(source.classList.contains("hidefooter")) {
        this.html.find(".footer").hide()
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
    console.log(`Moulinette | Searching ${searchTerms} with filters: ${this.selCreator} ${this.selPack}`)

    // retrieve module filters
    const curFilters = game.settings.get("moulinette", "moduleFilters")
    const moduleId = this.activeModule.id
    const moduleFilters = moduleId in curFilters ? curFilters[moduleId] : []

    this.assets = await this.activeModule.instance.getAssetList(searchTerms, this.selPack, this.selCreator, moduleFilters)
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
    const folderIdx = folderEl.data("idx")
    if(!this.expand || folderEl.hasClass("expanded")) {
      folderEl.find("div:not(.bc)").toggle()
      return
    }
    
    let matchList = []

    // new optimized way
    if(folderIdx) {
      const key = `data-folder="${folderIdx}"`
      for(const a of this.assets) {
        if(a.indexOf(key) > 0) {
          matchList.push(a)
        }
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
    this.activateListeners(this.html, false)
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
  
  /**
   * User chose thumbsizes
   */
  async _onGenerateShortcuts(event) {
    event.preventDefault();
    const source = event.currentTarget
    const moduleId = this.activeModule.id
    const filters = {
      terms: this.html.find("#search").val().toLowerCase()
    }

    if(this.selCreator) {
      filters.creator = this.selCreator
    }
    if(this.selPack != "-1") {
      const entry = this.packs.find(p => p.id == this.selPack)
      if(entry) {
        filters.pack = entry.name
      }
    }
    new MoulinetteShortcuts(moduleId, filters).render(true)
  }

  /**
   * Save position when window moves or resized
   */
  setPosition({left, top, width, height, scale}={}) {
    super.setPosition({left, top, width, height, scale})

    const parent = this
    clearInterval(this.positionTimer);
    this.positionTimer = setInterval(function() {
      clearInterval(parent.positionTimer)
      const position = game.settings.get("moulinette", "winPosForge")
      if(!position) {
        game.settings.set("moulinette", "winPosForge", parent.position)
        console.log("Moulinette Forge | Window position stored!")
      }
      else if(parent.position.left != position.left || parent.position.top != position.top || 
        parent.position.width != position.width || parent.position.height != position.height) {
        game.settings.set("moulinette", "winPosForge", parent.position)
        console.log("Moulinette Forge | Window position stored!")
      }
    }, 2000);
  }

  /**
   * User chose filters
   */
  async _onFilters(event) {
    event.preventDefault();
    const parent = this

    // stored filters
    const moduleId = parent.activeModule.id
    const curFilters = game.settings.get("moulinette", "moduleFilters")
    const moduleFilters = moduleId in curFilters ? curFilters[moduleId] : []    
    
    const filters = this.activeModule.instance.getFilters()
    for(const f of filters) {
      f.checked = moduleFilters.includes(f.id)
    }
    const dialog = new MoulinetteForgeFilters(filters, async function(filters) {
      curFilters[moduleId] = filters
      await game.settings.set("moulinette", "moduleFilters", curFilters)
      const filterButton = parent.html.find(".filters a.filters")
      if(filters.length > 0) {
        filterButton.addClass("enabled")
      } else {
        filterButton.removeClass("enabled")
      }

      parent._searchAssets()
    })
    dialog.position.left = event.pageX - dialog.position.width/2
    dialog.position.top = event.pageY - 120 // is auto
    dialog.render(true)
  }
}
