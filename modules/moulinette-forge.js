import { MoulinetteForgeModule } from "./moulinette-forge-module.js"

/*************************
 * Moulinette Forge
 *************************/
export class MoulinetteForge extends FormApplication {
  
  static get TABS() { return game.moulinette.forge.map( f => f.id ) }
  
  constructor(tab) {
    super()
    const curTab = tab ? tab : game.settings.get("moulinette", "currentTab")
    this.tab = MoulinetteForge.TABS.includes(curTab) ? curTab : null
    
    // specific to Tiles
    this.assets = []
    this.assetsPacks = []
    this.assetsCount = 0
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette",
      classes: ["mtte", "forge"],
      title: game.i18n.localize("mtte.moulinetteForge"),
      template: "modules/moulinette-core/templates/forge.hbs",
      width: 880,
      height: "auto",
      resizable: true,
      dragDrop: [{dragSelector: ".draggable"}],
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    if(!game.user.isGM) {
      return { error: game.i18n.localize("ERROR.mtteGMOnly") }
    }
    
    // no module available
    if(game.moulinette.forge.length == 0) {
      return { error: game.i18n.localize("ERROR.mtteNoModule") }
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
    
    // fetch initial asset list
    const assets = await this.activeModule.instance.getAssetList()
      
    return { 
      modules: game.moulinette.forge.sort((a,b) => a.name < b.name ? -1 : 1), 
      activeModule: this.activeModule, 
      assets: assets,
      footer: await this.activeModule.instance.getFooter()
    }
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
    
    // delegate activation to module
    if(this.activeModule) {
      this.activeModule.instance.activateListeners(html)
    }
    
    this.html = html
  }
  
  /**
   * User clicked on another tab (i.e. module)
   */
  _onNavigate(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const tab = source.dataset.tab;
    if(MoulinetteForge.TABS.includes(tab)) {
      this.tab = tab
      game.settings.set("moulinette", "currentTab", tab)
      this._clearPackLists()
      this.render();
    }
  }
  
  async _onClickButton(event) {
    event.preventDefault();

    // delegate activation to module
    if(this.activeModule) {

      const source = event.currentTarget;
      // search
      if(source.classList.contains("search")) {
        const searchTerms = this.html.find("#search").val()
        const assets = await this.activeModule.instance.getAssetList(searchTerms)
        this.html.find('.list').html(assets.join(""))
        // delegate activation to module
        if(this.activeModule) {
          this.activeModule.instance.activateListeners(this.html)
        }
      } 
      // any other action
      else {
        await this.activeModule.instance.onAction(source.classList)
      }
    }
  }
  
  _clearPackLists() {
    this.filter = ""
    this.assetsCount = 0
    this.assets.length = 0
    this.assetsPacks.length = 0
  }
}
