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
    const searchIdx = this.assetsData.id
    
    for(let a = 0; a < this.assetsData.results.length; a++) {
      const asset = this.assetsData.results[a]
      const pack = this.assetsData.packs[asset.pack]
      const path = asset.data ? asset.data.path : asset.path
      const url = `${pack.baseUrl}/${path}`
      const filename = path.split("/").pop().replace("_thumb", "")
      const title = `${filename} from ${pack.creator} (${pack.name})`
      if(asset.data && asset.data['type'] == "snd") {
        const name = game.moulinette.applications.Moulinette.prettyText(asset.data.title && asset.data.title.length > 0 ? asset.data.title : asset.data.path.split("/").pop())
        const shortName = name.length <= 40 ? name : name.substring(0,40) + "..."

        const durHr = Math.floor(asset.data.duration / (3600))
        const durMin = Math.floor((asset.data.duration - 3600*durHr)/60)
        const durSec = asset.data.duration % 60
        const duration = (durHr > 0 ? `${durHr}:${durMin.toString().padStart(2,'0')}` : durMin.toString()) + ":" + durSec.toString().padStart(2,'0')
        const previewSoundURL = `${pack.baseUrl}/${asset.data.path.slice(0, -4)}_preview.ogg` // remove .ogg/.mp3/... from original path

        let html = `<div class="sound" data-idx="${a}" data-sidx="${searchIdx}">` +
          `<div class="audio" title="${title}">${shortName}</div>` +
          `<div class="background"><i class="fas fa-music"></i></div>` +
          `<div class="duration"><i class="far fa-hourglass"></i> ${duration}</div>` +
          `<div class="sound-controls">` +
            (asset.data.preview ? `<div class="ctrl sound-play" data-url="${previewSoundURL}"><a data-action="sound-play" title="${game.i18n.localize("mtte.previewSound")}"><i class="fas fa-play"></i></a></div>` : "") +
          "</div></div>"

        //this.assets.push(`<div class="sound"><a data-idx="${a}">${title}</a></div>`)
        this.assets.push(html)

      } else {
        this.assets.push(`<div class="tileres" title="${title}" data-idx="${a}" data-sidx="${searchIdx}"><img width="${this.assetsSize}" height="${this.assetsSize}" src="${url}"/></div>`)
      }
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
    this.html.find(".sound").click(this._onShowTile.bind(this))

    // make sure window is on top of others
    this.bringToTop()

    // autoload on scroll
    this.html.find(".list").on('scroll', this._onScroll.bind(this))

    // autoload on scroll
    const parent = this
    this.html.find(".sound-play").click(ev => {
      ev.preventDefault();
      const audio = html.find("#availablePreview")[0]
      const url = $(ev.currentTarget).data("url")
      if (url == parent.previewUrl) {
        if (audio.paused) {
          audio.play();
        } else {
          audio.pause();
        }
      } else {
        parent.previewUrl = url
        audio.src = url;
        audio.play();
      }
      return false
    })
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
    const searchIdx = source.dataset.sidx;

    if(assetIdx >=0 && assetIdx < this.assetsData.results.length) {
      const asset = this.assetsData.results[assetIdx]
      const pack = this.assetsData.packs[asset.pack]
      const url = asset.data ? `${pack.baseUrl}/${asset.data.path}` : `${pack.baseUrl}/${asset.path}`
      this.html.find("#availablePreview")[0].pause()
      new MoulinetteAvailableResult(pack, url, this.assetsSize, asset, searchIdx).render(true)
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
