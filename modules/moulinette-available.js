import { MoulinetteAvailableResult } from "./moulinette-availableresult.js"

/*************************************************
 * Available assets (from Moulinette Cloud)
 *************************************************/
export class MoulinetteAvailableAssets extends FormApplication {
  
  static MAX_ASSETS = 100
  
  constructor(terms, type, size) {
    super()

    this.assetInc = 0
    this.assetsData = {}
    this.assetsType = type
    this.assetsSize = size
    this.searchTerms = terms
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-available",
      classes: ["mtte", "forge", "available"],
      title: game.i18n.localize("mtte.availableAssets"),
      template: "modules/moulinette-core/templates/available.hbs",
      width: 850,
      height: 800,
      closeOnSubmit: true,
      submitOnClose: false,
      resizable: true,
    });
  }
  
  async getData() {
    this.assets = []
    this.assetsData = await game.moulinette.applications.MoulinetteFileUtil.getAvailableMatchesMoulinetteCloud(this.searchTerms, this.assetsType, false)
    
    for(let a = 0; a < this.assetsData.results.length; a++) {
      const asset = this.assetsData.results[a]
      const pack = this.assetsData.packs[asset.pack]
      const url = `${pack.baseUrl}/${asset.path}`
      const filename = asset.path.split("/").pop().replace("_thumb", "")
      const title = `${filename} from ${this.pack.creator} (${this.pack.name})`
      this.assets.push(`<div class="tileres" title="${title}" data-idx="${a}"><img width="${this.assetsSize}" height="${this.assetsSize}" src="${url}"/></div>`)
    }

    // randomize results (avoid some publishers to always be listed first)
    this.assets.sort((a,b) => 0.5 - Math.random())

    return { assets: this.assets.slice(0, MoulinetteAvailableAssets.MAX_ASSETS) };
  }
  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html
    
    this.html.find(".tileres").click(this._onShowTile.bind(this))

    // autoload on scroll
    this.html.find(".list").on('scroll', this._onScroll.bind(this))
  }

  // re-enable listeners
  _reEnableListeners() {
    this.html.find("*").off()
    this.activateListeners(this.html)
    this._activateCoreListeners(this.html)
  }
  
  _onShowTile(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const assetIdx = source.dataset.idx;

    if(assetIdx >=0 && assetIdx < this.assetsData.results.length) {
      const asset = this.assetsData.results[assetIdx]
      const pack = this.assetsData.packs[asset.pack]
      const url = `${pack.baseUrl}/${asset.path}`
      new MoulinetteAvailableResult(pack, url, this.assetsSize).render(true)
    }
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
      if(this.assetInc * MoulinetteAvailableAssets.MAX_ASSETS < this.assets.length) {
        this.assetInc++
        this.html.find('.list').append(this.assets.slice(this.assetInc * MoulinetteAvailableAssets.MAX_ASSETS, (this.assetInc+1) * MoulinetteAvailableAssets.MAX_ASSETS))
        this._reEnableListeners()
      }
      this.ignoreScroll = false
    }
  }
  
}
