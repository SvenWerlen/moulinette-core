/*************************
 * Moulinette Sources
 *************************/
export class MoulinetteSources extends FormApplication {
  
  constructor() {
    super()
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-sources",
      classes: ["mtte", "sources"],
      title: game.i18n.localize("mtte.moulinetteSources"),
      template: "modules/moulinette-core/templates/sources.hbs",
      width: 800,
      height: 500,
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {

    // prepare list
    const sources = []
    const settings = Array.isArray(game.settings.get("moulinette", "sources")) ? game.settings.get("moulinette", "sources") : []
    for(const s of settings) {
      if(!s.auto) sources.push(s)
    }

    for(const s of game.moulinette.sources) {
      const setting = settings.find(sett => sett.auto && sett.source == s.source && sett.path == s.path && sett.type == s.type)
      sources.push({
        auto: true,
        type: s.type,
        creator: setting && setting.creator ? setting.creator : s.publisher,
        pack: setting && setting.pack ? setting.pack : s.pack,
        source: s.source,
        path: s.path,
        enabled: setting ? setting.enabled : true,
        custom: setting ? true : false
      })
    }

    this.sources = sources
    return { sources: this.sources }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.html = html

    // actions (on individual source)
    html.find(".actions a").click(this._onAction.bind(this));
    // actions (on buttons)
    html.find(".actions button").click(this._onAction.bind(this));
  }

  /**
   * User clicked on link
   */
  async _onAction(event) {
    event.preventDefault();

    const settings = Array.isArray(game.settings.get("moulinette", "sources")) ? game.settings.get("moulinette", "sources") : []

    const source = event.currentTarget;
    // browse folders
    if(source.classList.contains("browse")) {
      new FilePicker({
          type: "folder",
          callback: (path, picker) => {
            this.folder = { path: path, source: picker.activeSource }
            ui.notifications.info(`Source ${path} + ${picker.activeSource}`)
            // change browse button
            this.html.find(".browse").css("color", "green")
          },
      }).browse();
    }
    // toggle visibility
    else if(source.classList.contains("toggle")) {
      const src = source.closest(".source")
      const idx = $(src).data("idx")
      if(idx >= 0 && idx < this.sources.length) {
        const sel = this.sources[idx]
        // check if entry exists
        let config = settings.find(s => s.type == sel.type && s.source == sel.source && s.path == sel.path)
        if(!config) {
          config = { auto: true, type: sel.type, source: sel.source, path: sel.path, enabled: true }
          settings.push(config)
        }
        // toggle
        config.enabled = !config.enabled
        // store settings
        await game.settings.set("moulinette", "sources", settings)
        return this.render()
      }

    }
    // change/modify entry
    else if(source.classList.contains("edit")) {
      const src = source.closest(".source")
      const idx = $(src).data("idx")
      if(idx >= 0 && idx < this.sources.length) {
        const sel = this.sources[idx]
        // set index
        this.html.find("#idxEdit").val(idx)
        // toggle actions visibility
        this.html.find(".update").show()
        this.html.find(".add").hide()
        // default values
        this.html.find("#creatorEdit").val(sel.creator);
        this.html.find("#packEdit").val(sel.pack);
      }
    }
    // reset automatic entry
    else if(source.classList.contains("reset") || source.classList.contains("delete")) {
      const src = source.closest(".source")
      const idx = $(src).data("idx")
      if(idx >= 0 && idx < this.sources.length) {
        const sel = this.sources[idx]
        // check if entry exists
        const config = settings.find(s => s.type == sel.type && s.source == sel.source && s.path == sel.path)
        const parent = this
        if(config) {
          Dialog.confirm({
            title: game.i18n.localize(source.classList.contains("reset") ? "mtte.resetSource" : "mtte.deleteSource"),
            content: game.i18n.localize(source.classList.contains("reset") ? "mtte.resetSourceContent" : "mtte.deleteSourceContent"),
            yes: async function() {
              await game.settings.set("moulinette", "sources", settings.filter(c => c !== config))
              return parent.render()
            },
            no: () => {}
          });
        }
      }
    }
    // button : Add
    else if(source.classList.contains("add")) {
      const type = this.html.find('select[name=type] option').filter(':selected').val()
      const creator = this.html.find('#creator').val()
      const pack = this.html.find('#pack').val()
      const folder = this.folder
      // validate
      if( !type || type.length < 3 ) {
        return ui.notifications.error(`Please select a valid source type (drop-down list)!`)
      }
      if( !creator || creator.length < 3 || creator.length > 20 ) {
        return ui.notifications.error(`Please enter a valid text (min 3 chars) as creator!`)
      }
      if( !pack || pack.length < 3 || pack.length > 20 ) {
        return ui.notifications.error(`Please enter a valid text (min 3 chars) as pack!`)
      }
      if( !folder ) {
        return ui.notifications.error(`Please browse and pick a valid folder!`)
      }
      // check that source doesn't exist
      const source = this.sources.find(s => s.type == type && s.source == folder.source && s.path == folder.path)
      if(source) {
        ui.notifications.error(`This path already exist!`)
        return
      }

      settings.push({
        auto: false,
        type: type,
        creator: creator,
        pack: pack,
        source: folder.source,
        path: folder.path,
        enabled: true
      })
      this.folder = null
      this.html.find(".browse").css("color", "inherit")
      await game.settings.set("moulinette", "sources", settings)
      return this.render()
    }
    // button : Cancel
    else if(source.classList.contains("cancel")) {
      // toggle actions visibility
      this.html.find(".update").hide()
      this.html.find(".add").show()
    }
    // button : Edit source
    else if(source.classList.contains("update")) {
      const idx = this.html.find('#idxEdit').val()
      const creator = this.html.find('#creatorEdit').val()
      const pack = this.html.find('#packEdit').val()
      // validate
      if( idx < 0 || idx >= this.sources.length ) return;
      if( !creator || creator.length < 3 || creator.length > 20 ) {
        return ui.notifications.error(`Please enter a valid text (min 3 chars) as creator!`)
      }
      if( !pack || pack.length < 3 || pack.length > 20 ) {
        return ui.notifications.error(`Please enter a valid text (min 3 chars) as pack!`)
      }
      // retrieve setting
      const source = this.sources[idx]
      let setting = settings.find(s => s.type == source.type && s.source == source.source && s.path == source.path)
      if(!setting) {
        setting = { auto: source.auto, type: source.type, source: source.source, path: source.path, enabled: true }
        settings.push(setting)
      }

      // store settings
      setting.creator = creator
      setting.pack = pack
      await game.settings.set("moulinette", "sources", settings)
      return this.render()
    }
  }

}

