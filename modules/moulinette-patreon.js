/*************************
 * Moulinette Patreon
 *************************/
export class MoulinettePatreon extends FormApplication {
  
  static CLIENT_ID = "nf1BKT1t1tckhDJlW6vbJsGP3UL1nDL9K_RoSAN_a1kTTvZLdp2fQz347panKMHa"
  
  constructor() {
    super()
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette",
      classes: ["mtte", "patreon"],
      title: game.i18n.localize("mtte.moulinettePatreon"),
      template: "modules/moulinette-core/templates/patreon.hbs",
      width: 500,
      height: "auto",
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    const userId = game.settings.get("moulinette", "userId");
    const callback = `${game.moulinette.applications.MoulinetteClient.SERVER_URL}/patreon/callback`
    const patreonURL = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${MoulinettePatreon.CLIENT_ID}&redirect_uri=${callback}&scope=identity&state=${userId}`
    return { url: patreonURL }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.html = html
  }

}
