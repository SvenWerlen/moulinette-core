

export class MoulinetteFilePicker extends FilePicker {
  
  constructor(options={}) {
    super(options);
  }

  async browse(target, options={}) {
    if ( game.world && !game.user.can("FILES_BROWSE") ) return;

    // moulinette API sometimes requires to have default FilePicker
    const forceDefault = this.options && this.options.forceDefault

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

  /**
   * SOURCE : FoundryVTT core code
   * -----------------------------
   * Dispatch a POST request to the server containing a directory path and a file to upload
   * @param {string} source   The data source to which the file should be uploaded
   * @param {string} path     The destination path
   * @param {File} file       The File object to upload
   * @param {object} [body={}]  Additional file upload options sent in the POST body
   * @param {object} [options]  Additional options to configure how the method behaves
   * @param {boolean} [options.notify=true] Display a UI notification when the upload is processed
   * @return {Promise<Object>}  The response object
   */
  static async upload(source, path, file, body={}, {notify=true, timeoutMs=30000, onTimeout = () => {}}={}) {

    // Create the form data to post
    const fd = new FormData();
    fd.set("source", source);
    fd.set("target", path);
    fd.set("upload", file);
    Object.entries(body).forEach(o => fd.set(...o));

    const notifications = Object.fromEntries(["ErrorSomethingWrong", "WarnUploadModules", "ErrorTooLarge"].map(key => {
      const i18n = `FILES.${key}`;
      return [key, game.i18n.localize(i18n)];
    }));

    // Dispatch the request
    try {
      const response = await fetchJsonWithTimeout(this.uploadURL, {method: "POST", body: fd}, {timeoutMs: timeoutMs, onTimeout: onTimeout} );

      // Attempt to obtain the response
      if ( response.error ) {
        ui.notifications.error(response.error);
        return false;
      } else if ( !response.path ) {
        console.error(notifications["ErrorSomethingWrong"]);
        if ( notify ) ui.notifications.error(notifications["ErrorSomethingWrong"]);
        return false;
      }

      // Display additional response messages
      if ( response.message ) {
        if ( /^(modules|systems)/.test(response.path) ) {
          console.warn(notifications["WarnUploadModules"]);
          if ( notify ) ui.notifications.warn(notifications["WarnUploadModules"]);
        }
        console.info(response.message);
        if ( notify ) ui.notifications.info(response.message);
      }
      return response;
    }
    catch (e) {
      if ( (e instanceof HttpError) && (e.code === 413) ) {
        console.error(notifications["ErrorTooLarge"]);
        if ( notify ) ui.notifications.error(notifications["ErrorTooLarge"]);
        return false;
      }
      return false;
    }
  }

}


export class MoulinetteFilePickerUI extends FormApplication {
  
  static MAX_ASSETS = 100
  
  constructor(module, options = {}) {
    super();
    this.assetInc = 0
    this.module = module
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
    // fetch available packs & build publishers
    let publishers = {}
    let packs = await this.module.instance.getPackList()
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
    })
    publishers = Object.values(publishers).filter(p => p.count > 0).sort((a,b) => a.name > b.name)   
    
    // prepare packs 
    // - cleans packname by removing publisher from pack name to avoid redundancy
    packs = duplicate(packs.filter(p => p.count > 0 || p.special))
    for(const p of packs) {
      p["cleanName"] = p["name"].startsWith(p["publisher"]) ? p["name"].substring(p["publisher"].length).trim() : p["name"]
    }
    
    // autoselect matchiing pack (if call by searchAPI)
    let publisher = null
    let packIdx = -1
    let matchingPack = null
    if(this.search && this.search.pack) {
      matchingPack = packs.find(p => p.name.startsWith(this.search.pack));
      if(matchingPack) {
        packIdx = matchingPack.idx
        matchingPack.selected = "selected"
      }
    }

    // fetch initial asset list
    const terms = this.search && this.search.terms ? this.search.terms : ""
    this.assets = await this.module.instance.getAssetList(terms, packIdx, publisher)

    const data = { 
      terms: terms,
      user: await game.moulinette.applications.Moulinette.getUser(),
      supportsModes: this.module.instance.supportsModes(),
      supportsThumbSizes: this.module.instance.supportsThumbSizes(),
      assetsCount: `${assetsCount.toLocaleString()}${special ? "+" : ""}`,
      assets: this.assets.slice(0, MoulinetteFilePickerUI.MAX_ASSETS),
    }

    const browseMode = game.settings.get("moulinette-core", "browseMode")
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
    this.module.instance.activateListeners(html, this.callback, this.type)
    
    // enable expand listeners
    html.find(".expand").click(this._onToggleExpand.bind(this));
    
    // autoload on scroll
    html.find(".list").on('scroll', this._onScroll.bind(this))
    
    // adapt footer height to fit
    html.find(".list").css('bottom', "80px")

    this.html = html
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
   * Refresh the list based on the new search
   */
  async _searchAssets() {
    const searchTerms = this.html.find("#search").val().toLowerCase()
    const selectedValue = this.html.find(".plist").children("option:selected").val()
    
    const browseMode = game.settings.get("moulinette-core", "browseMode")
    if(browseMode == "byPub") {
      this.assets = await this.module.instance.getAssetList(searchTerms, -1, selectedValue, this.type)
    } else {
      this.assets = await this.module.instance.getAssetList(searchTerms, selectedValue, null, this.type)
    }
    
    const supportsModes = this.module.instance.supportsModes()
    
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
      let assetsToShow = supportsModes && viewMode == "browse" ? this.assets.filter(a => a.indexOf('class="folder"') > 0) : this.assets.slice(0, MoulinetteFilePickerUI.MAX_ASSETS).join("")
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
    if(!this.expand || folderEl.hasClass("expanded")) {
      folderEl.find("div").toggle()
      return
    }
    
    const regex = new RegExp(`data-path="${folder.replace("(",'\\(').replace(")",'\\)')}[^"/]+"`, "g")
    let matchList = []
    for(const a of this.assets) {
      if(a.match(regex)) {
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
    this.module.instance.onChangeThumbsSize(source.classList.contains("plus"))
  }
}
