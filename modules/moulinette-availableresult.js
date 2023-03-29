/*************************
 * Available result from Moulinette Cloud
 *************************/
export class MoulinetteAvailableResult extends FormApplication {
  
  constructor(pack, url, size, asset, searchIdx) {
    super()
    this.pack = pack
    this.url = url
    this.asset = asset
    this.size = size
    this.searchIdx = searchIdx ? searchIdx : null
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-availableresult",
      classes: ["mtte", "forge", "searchresult"],
      title: game.i18n.localize("mtte.availableresult"),
      template: "modules/moulinette-core/templates/availableresult.hbs",
      width: 620,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  async getData() {
    const client = new game.moulinette.applications.MoulinetteClient()
    const information = await client.get(`/api/marketplace/${this.pack.id}/${this.searchIdx}`)

    // update pack information
    if(information.status == 200) {
      this.pack.creator = information.data.publisher
      this.pack.name = information.data.pack
    }

    let duration = ""
    let previewSoundURL = null
    if(this.asset.data && this.asset.data.type == "snd") {
      const durHr = Math.floor(this.asset.data.duration / (3600))
      const durMin = Math.floor((this.asset.data.duration - 3600*durHr)/60)
      const durSec = this.asset.data.duration % 60
      duration = (durHr > 0 ? `${durHr}:${durMin.toString().padStart(2,'0')}` : durMin.toString()) + ":" + durSec.toString().padStart(2,'0')
      previewSoundURL = `${this.pack.baseUrl}/${this.asset.data.path.slice(0, -4)}_preview.ogg` // remove .ogg/.mp3/... from original path
    }

    return { 
      imageSize: this.size,
      creatorUrl: information.status == 200 ? information.data.publisherUrl : null,
      mouliplaceCreatorUrl: information.status == 200 ? information.data.mouliplaceCreatorUrl : null,
      mouliplaceUrl: information.status == 200 ? information.data.mouliplaceUrl : null,
      moulinetteUrl: "https://assets.moulinette.cloud/marketplace/creators",
      tiers: information.data.tiers,
      vanity: information.data.vanity,
      asset: this.asset,
      isSound: this.asset.data && this.asset.data.type == "snd",
      soundDuration: duration,
      previewSoundURL: previewSoundURL,
      pack: this.pack,
      url: this.url,
      assetName: this.url.split("/").pop().replace("_thumb", ""),
      assetPath: this.url.substring(0, this.url.lastIndexOf("/"))
    }
  }
  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    html.find(".previewSound").click(ev => {
      ev.preventDefault();
      const audio = html.find("#availResultPreview")[0]
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
      return false
    })

    // make sure window is on top of others
    this.bringToTop()
  }
}
