/*************************
 * Available result from Moulinette Cloud
 *************************/
export class MoulinetteAvailableResult extends FormApplication {
  
  constructor(pack, asset, size) {
    super()
    this.pack = pack
    this.asset = asset
    this.size = size
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
    const information = await client.get(`/api/marketplace/${this.pack.id}`)

    // update pack information
    if(information.status == 200) {
      this.pack.creator = information.data.publisher
      this.pack.name = information.data.pack
    }

    return { 
      imageSize: this.size,
      creatorUrl: information.status == 200 ? information.data.publisherUrl : null,
      mouliplaceCreatorUrl: information.status == 200 ? information.data.mouliplaceCreatorUrl : null,
      mouliplaceUrl: information.status == 200 ? information.data.mouliplaceUrl : null,
      moulinetteUrl: "https://assets.moulinette.cloud/marketplace/creators",
      tiers: information.data.tiers,
      vanity: information.data.vanity,
      pack: this.pack,
      url: this.asset,
      assetName: this.asset.split("/").pop().replace("_thumb", ""),
      assetPath: this.asset.substring(0, this.asset.lastIndexOf("/"))
    }
  }
  
}
