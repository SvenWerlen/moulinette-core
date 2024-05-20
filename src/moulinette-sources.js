import { MoulinetteSourcesFilter } from "./moulinette-sources-filter.js"

/*************************
 * Moulinette Sources
 *************************/
export class MoulinetteSources extends FormApplication {
  
  constructor(parent, filters, extensions) {
    super()
    this.parent = parent
    this.filters = filters
    this.curFilters = null
    this.extensions = extensions
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-sources",
      classes: ["mtte", "sources"],
      title: game.i18n.localize("mtte.moulinetteSources"),
      template: "modules/moulinette-core/templates/sources.hbs",
      width: 1000,
      height: 500,
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    let sources = []
    
    // global path
    const customPath = game.settings.get("moulinette-core", "customPath")
    if(customPath) {
      sources.push({
        auto: true,
        type: "global",
        creator: "*",
        pack: "*",
        source: game.moulinette.applications.MoulinetteFileUtil.getSource(),
        path: customPath,
        enabled: true,
        custom: false,
        immuable: true
      })
    }

    // default source
    for(const f of this.filters) {
      sources.push({
        auto: true,
        type: "default",
        creator: "*",
        pack: "*",
        source: game.moulinette.applications.MoulinetteFileUtil.getSource(),
        path: `moulinette/${f}/custom`,
        enabled: true,
        custom: false,
        immuable: true
      })
    }
    
    let types = ["images", "tiles", "scenes", "sounds"]
    const settings = Array.isArray(game.settings.get("moulinette", "sources")) ? game.settings.get("moulinette", "sources") : []
    
    for(const s of game.moulinette.sources) {
      const setting = settings.find(sett => sett.auto && sett.source == s.source && sett.path == s.path && sett.type == s.type)
      sources.push({
        auto: true,
        type: s.type,
        creator: setting && setting.creator ? setting.creator : s.publisher,
        pack: setting && setting.pack ? setting.pack : s.pack,
        source: s.source,
        path: s.path,
        forceRefresh: setting ? setting.forceRefresh : false,
        enabled: setting ? setting.enabled : true,
        custom: setting ? true : false
      })
    }

    for(const s of settings) {
      if(!s.auto) sources.push(s)
    }

    if(this.filters.length > 0) {
      sources = sources.filter(s => ["global", "default"].includes(s.type) || this.filters.includes(s.type))
      types = types.filter(t => this.filters.includes(t))
    }

    this.sources = sources
    return { sources: this.sources, types: types }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.html = html

    // import/export actions
    html.find(".exports button").click(this._onAction.bind(this));
    
    // actions (on individual source)
    html.find(".actions a").click(this._onAction.bind(this));
    // actions (on buttons)
    html.find(".actions button").click(this._onAction.bind(this));

    // actions (on buttons)
    html.find(".actions input[type='checkbox']").click(ev => {
      if($(ev.currentTarget).is(":checked")) {
        html.find(".creatorPack.custom").hide()
        html.find(".creatorPack.auto").show()
      } else {
        html.find(".creatorPack.custom").show()
        html.find(".creatorPack.auto").hide()
      }
      
    })

    // make sure window is on top of others
    this.bringToTop()
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
            // prefill creator and pack
            this.html.find("#creator").val("My Assets")
            this.html.find("#pack").val(path.split("/").pop())
          },
      }).browse();
    }
    // filter files
    else if(source.classList.contains("filter")) {
      const parent = this
      const dialog = new MoulinetteSourcesFilter(this.extensions, this.curFilters, function(filters) {
        parent.curFilters = filters
      })
      dialog.position.left = event.pageX - dialog.position.width/2
      dialog.position.top = event.pageY - 120 // is auto
      dialog.render(true)
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
          config = { auto: true, forceRefresh: false, type: sel.type, source: sel.source, path: sel.path, enabled: true }
          settings.push(config)
        }
        // toggle
        config.enabled = !config.enabled
        // store settings
        await game.settings.set("moulinette", "sources", settings)
        return this.render()
      }

    }
    // toggle force-reindex
    else if(source.classList.contains("forceIndex")) {
      const src = source.closest(".source")
      const idx = $(src).data("idx")
      if(idx >= 0 && idx < this.sources.length) {
        const sel = this.sources[idx]
        // check if entry exists
        let config = settings.find(s => s.type == sel.type && s.source == sel.source && s.path == sel.path)
        if(!config) {
          config = { auto: true, forceRefresh: false, type: sel.type, source: sel.source, path: sel.path, enabled: true }
          settings.push(config)
        }
        // toggle
        config.forceRefresh = !config.forceRefresh
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
        // filters
        this.curFilters = sel.filters
        // auto
        if(sel.creator == "*") {
          this.html.find("#autoEdit").prop('checked', true);
          this.html.find(".creatorPack.auto").show()
          this.html.find(".creatorPack.custom").hide()
        } else {
          this.html.find("#autoEdit").prop('checked', false);
          this.html.find(".creatorPack.auto").hide()
          this.html.find(".creatorPack.custom").show()
        }
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
      const auto = this.html.find('#auto').is(":checked")
      const type = this.html.find('select[name=type] option').filter(':selected').val()
      const creator = this.html.find('#creator').val()
      const pack = this.html.find('#pack').val()
      const folder = this.folder
      // validate
      if( !type || type.length < 3 ) {
        return ui.notifications.error(`Please select a valid source type (drop-down list)!`)
      }
      if( !folder ) {
        return ui.notifications.error(`Please browse and pick a valid folder!`)
      }
      if( !auto && (!creator || creator.length < 1 || creator.length > 120) ) {
        return ui.notifications.error(`Please enter a valid text (max 120 chars) as creator!`)
      }
      if( !auto && (!pack || pack.length < 1 || pack.length > 120) ) {
        return ui.notifications.error(`Please enter a valid text (max 120 chars) as pack!`)
      }
      // check that source doesn't exist
      const source = this.sources.find(s => s.type == type && s.source == folder.source && s.path == folder.path)
      if(source) {
        ui.notifications.error(`This path already exist!`)
        return
      }

      settings.push({
        auto: false,
        forceRefresh: false,
        type: type,
        creator: auto ? "*" : creator,
        pack: auto ? "*" : pack,
        source: folder.source,
        filters: this.curFilters && this.curFilters.length > 0 ? this.curFilters : null,
        path: folder.path,
        enabled: true,
      })
      this.folder = null
      this.curFilters = null
      this.html.find(".browse").css("color", "inherit")
      await game.settings.set("moulinette", "sources", settings)
      return this.render()
    }
    // button : Cancel
    else if(source.classList.contains("cancel")) {
      // reset visibility
      this.html.find(".creatorPack.custom").show()
      this.html.find(".creatorPack.auto").hide()
      this.html.find("#auto").prop('checked', false);
      // toggle actions visibility
      this.html.find(".update").hide()
      this.html.find(".add").show()
      // reset
      this.folder = null
      this.curFilters = null
    }
    // button : Edit source
    else if(source.classList.contains("update")) {
      const auto = this.html.find('#autoEdit').is(":checked")
      const idx = this.html.find('#idxEdit').val()
      const creator = this.html.find('#creatorEdit').val()
      const pack = this.html.find('#packEdit').val()
      // validate
      if( idx < 0 || idx >= this.sources.length ) return;
      if( !auto && (!creator || creator.length < 1 || creator.length > 120) ) {
        return ui.notifications.error(`Please enter a valid text (max 120 chars) as creator!`)
      }
      if( !auto && (!pack || pack.length < 1 || pack.length > 120) ) {
        return ui.notifications.error(`Please enter a valid text (max 120 chars) as pack!`)
      }
      // retrieve setting
      const source = this.sources[idx]
      let setting = settings.find(s => s.type == source.type && s.source == source.source && s.path == source.path)
      if(!setting) {
        setting = { auto: source.auto, type: source.type, source: source.source, path: source.path, enabled: true }
        settings.push(setting)
      }

      // store settings
      setting.creator = auto ? "*" : creator
      setting.pack = auto ? "*" : pack
      setting.filters = this.curFilters
      await game.settings.set("moulinette", "sources", settings)
      this.folder = null
      this.curFilters = null
      return this.render()
    }
    // button : export
    else if(source.classList.contains("export")) {
      const filename = `moulinette-${game.world.id}-sources.json`
      const data = Array.isArray(game.settings.get("moulinette", "sources")) ? game.settings.get("moulinette", "sources") : []
      saveDataToFile(JSON.stringify(data, null, 2), "text/json", filename);
    }
    // button : import
    else if(source.classList.contains("import")) {
      const parent = this
      new Dialog({
        title: `Import Data: Moulinette Sources`,
        content: await renderTemplate("templates/apps/import-data.html", {
          hint1: game.i18n.format("DOCUMENT.ImportDataHint1", {document: "sources"}),
          hint2: game.i18n.format("DOCUMENT.ImportDataHint2", {name: "this config"})
        }),
        buttons: {
          import: {
            icon: '<i class="fas fa-file-import"></i>',
            label: "Import",
            callback: html => {
              const form = html.find("form")[0];
              if ( !form.data.files.length ) return ui.notifications.error("You did not upload a data file!");
              readTextFromFile(form.data.files[0]).then(json => {
                game.settings.set("moulinette", "sources", JSON.parse(json)).then(ev => parent.render(true))
              });
            }
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("mtte.cancel")
          }
        },
        default: "import"
      }, {
        width: 400
      }).render(true);
    }
    // button : index
    else if(source.classList.contains("index")) {
      ui.notifications.info(game.i18n.localize("mtte.indexingInProgress"));
      game.moulinette.applications.Moulinette.inprogress(this.html.find(".index"))    

      // scan tiles
      for(const f of this.filters) {
        await game.moulinette.applications.MoulinetteFileUtil.updateIndex(this.parent, f, `moulinette/${f}/custom`, this.extensions, false)
      }

      // clear cache
      game.moulinette.cache.clear()
      if(this.parent) {
        this.parent.clearCache()
        // close source UI
        this.close()
      }
      
    }
    else if(source.classList.contains("clearIndex")) {
      const sourceUI = this
      Dialog.confirm({
        title: game.i18n.localize("mtte.clearIndex"),
        content: game.i18n.localize("mtte.clearIndexConfirmation"),
        yes: async function() {
          // clear the indices
          for(const f of sourceUI.filters) {
            await game.moulinette.applications.MoulinetteFileUtil.uploadFile(new File([JSON.stringify({})], "index-mtte.json", { type: "application/json", lastModified: new Date() }), "index-mtte.json", `moulinette/${f}/custom`, true)
          }
          // 
          // clear cache
          game.moulinette.cache.clear()
          if(sourceUI.parent) {
            sourceUI.parent.clearCache()
            // close source UI
            sourceUI.close()
          }
        },
        no: () => {}
      });
    }
  }

  close() {
    // refresh moulinette UI
    const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
    new forgeClass().render(true)
    super.close()
  }

}

