

export class MoulinetteFilePicker extends FilePicker {
  
  static MAX_ASSETS = 100

  constructor(options={}) {
    super(options);
  }

  async browse(target, options={}) {
    if ( game.world && !game.user.can("FILES_BROWSE") ) return;

    // moulinette API sometimes requires to have default FilePicker
    const shiftKeyDown = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT)
    const forceDefault = (this.options && this.options.forceDefault) || shiftKeyDown

    // force retrieve user
    if(!forceDefault && ["image", "imagevideo"].includes(this.type) && !this.default) {
      const module = game.moulinette.forge.filter(f => f.id == "tiles")
      if(module && module.length == 1) {
        this.picker = new MoulinetteFilePickerUI(module[0], { type: this.type, callbackSelect: this._onSelect.bind(this), callbackDefault: this._onDefault.bind(this, target) })
        this.picker.render(true)
        return;
      }
    }

    return super.browse(target, options)
  }
  
    
  /**
   * User chose display mode
   */
  async _onSelect(path) {
    if ( !path ) return ui.notifications.error("You must select a file to proceed.");

    // Update the target field
    if ( this.field ) {
      this.field.value = path;
      this.field.dispatchEvent(new Event("change"));
    }

    // Trigger a callback and close
    if ( this.callback ) this.callback(path, this);
    return this.picker.close();
  }
  
  /**
   * User chose display mode
   */
  async _onDefault(target) {
    this.default = true
    return super.browse(target)
  }
}


export class MoulinetteFilePickerUI extends FormApplication {
  
  static MAX_ASSETS = 100
  
  constructor(module, options = {}) {
    super();
    this.assetInc = 0
    this.activeModule = module
    this.type = options.type
    this.search = options.search
    this.callback = options.callbackSelect
    this.defaultUI = options.callbackDefault
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette",
      classes: ["mtte", "forge"],
      title: game.i18n.localize("mtte.moulinetteFilePicker"),
      template: "modules/moulinette-core/templates/filepicker.hbs",
      width: 880,
      height: 800,
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
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
    packs = duplicate(packs.filter(p => (p.count > 0 && !(this.search && this.search.creator && p.publisher != this.search.creator)) || p.special))
    for(const p of packs) {
      p["cleanName"] = p["name"].startsWith(p["publisher"]) ? p["name"].substring(p["publisher"].length).trim() : p["name"]
    }
    
    // autoselect matching creator (if called by searchAPI)
    if(this.search && this.search.creator) {
      const matchingCreator = publishers.find(p => p.name == this.search.creator)
      matchingCreator.selected = "selected"
    }
    // autoselect matching pack (if called by searchAPI)
    let publisher = this.search && this.search.creator ? this.search.creator : null
    let packIdx = -1
    let matchingPack = null
    if(this.search && this.search.pack) {
      matchingPack = packs.find(p => p.name.toLowerCase().startsWith(this.search.pack.toLowerCase()));
      if(matchingPack) {
        packIdx = matchingPack.idx
        matchingPack.selected = "selected"
      }
    }

    // fetch initial asset list
    const terms = this.search && this.search.terms ? this.search.terms : ""
    this.assets = await this.activeModule.instance.getAssetList(terms, packIdx, publisher)

    const data = { 
      terms: terms,
      user: await game.moulinette.applications.Moulinette.getUser(),
      supportsModes: this.activeModule.instance.supportsModes(),
      supportsThumbSizes: this.activeModule.instance.supportsThumbSizes(),
      supportsWholeWordSearch: this.activeModule.instance.supportsWholeWordSearch(),
      hidePacks: assetsCount == 0,
      assetsCount: `${assetsCount.toLocaleString()}${special ? "+" : ""}`,
      assets: this.assets.slice(0, MoulinetteFilePickerUI.MAX_ASSETS),
      dropdownModeAuto: game.settings.get("moulinette-core", "dropdownMode") == "auto"
    }

    data.publishers = publishers
    data.packs = []

    // keep publisher names for up/down key events
    this.publishers = publishers.map(p => p.name)

    // reset initial search
    this.search = null
    this.selCreator = null
    this.selPack = -1
      
    return data;
  }
  
  
  activateListeners(html) {
    super.activateListeners(html);
    
    // make sure window is on top of others
    this.bringToTop()
    
    // give focus to input text
    html.find("#search").focus();
    
    // search options
    html.find(".sOptions a").click(this._onSearchOptions.bind(this))

    // initialize
    if(game.settings.get("moulinette", "wholeWordSearch")) {
      html.find(".sOptions a.wholeWord").addClass("active")
    }

    // buttons
    html.find("button").click(this._onClickButton.bind(this))
    html.find(".fvtt-picker").click(this._onClickButton.bind(this))
    
    // display mode
    html.find(".display-modes a").click(this._onChangeDisplayMode.bind(this))
    
    // thumb sizes
    html.find(".thumbsizes a").click(this._onChangeThumbsizes.bind(this))

    // highlight current displayMode
    const dMode = game.settings.get("moulinette", "displayMode")
    html.find(`.display-modes .mode-${dMode}`).addClass("active")
    
    // asset search (filter on creator)
    const parent = this
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
      const Moulinette = game.moulinette.applications.Moulinette
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
        parent._onPackSelected(newIdx < 0 ? "-1" : parent.packs[newIdx].id, $(ev.currentTarget).closest(".top"));
      }
    })
    
    // delegate activation to module
    this.activeModule.instance.activateListeners(html, this.callback, this.type)
    
    // enable expand listeners
    html.find(".expand").click(this._onToggleExpand.bind(this));
    
    // autoload on scroll
    html.find(".list").on('scroll', this._onScroll.bind(this))
    
    // adapt footer height to fit
    html.find(".list").css('bottom', "80px")

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

        // highlight cloud/remote assets based on configuration
        let packClass = ""
        if(isRemote && cloudColor == "def") packClass = "cloud"
        if(isRemote && cloudColor == "contrast") packClass = "cloud contrast"

        const packName = Moulinette.prettyText(p)
        packList += `<option value="${ids}" class="${packClass}">${Moulinette.prettyText(packName)} (${Moulinette.prettyNumber(count)})</option>`
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

        // highlight cloud/remote assets based on configuration
        let packClass = ""
        if(isRemote && cloudColor == "def") packClass = "cloud"
        if(isRemote && cloudColor == "contrast") packClass = "cloud contrast"

        const packName = Moulinette.prettyText(p)
        packList += `<li data-id="${ids}" class="${packClass}"><a><i class="fas fa-${isRemote ? "cloud" : "desktop"}"></i> ${Moulinette.prettyText(packName)} (${Moulinette.prettyNumber(count)})</a></li>`
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
   * User clicked on button (or ENTER on search)
   */
  async _onClickButton(event) {
    event.preventDefault();
    const source = event.currentTarget;
    // search
    if(source.classList.contains("search")) {
      await this._searchAssets()
    } else if(source.classList.contains("fvtt-picker")) {
      this.defaultUI()
      this.close()
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
   * Refresh the list based on the new search
   */
  async _searchAssets() {
    const searchTerms = this.html.find("#search").val().toLowerCase()

    this.assets = await this.activeModule.instance.getAssetList(searchTerms, this.selPack, this.selCreator)
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
      let assetsToShow = supportsModes && viewMode == "browse" ? this.assets.filter(a => a.indexOf('class="folder"') > 0) : this.assets.slice(0, MoulinetteFilePicker.MAX_ASSETS).join("")
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
      if(this.assetInc * MoulinetteFilePickerUI.MAX_ASSETS < this.assets.length) {
        this.assetInc++
        this.html.find('.list').append(this.assets.slice(this.assetInc * MoulinetteFilePickerUI.MAX_ASSETS, (this.assetInc+1) * MoulinetteFilePickerUI.MAX_ASSETS))
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
