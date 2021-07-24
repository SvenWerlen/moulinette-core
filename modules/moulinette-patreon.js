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
      id: "moulinette-patreon",
      classes: ["mtte", "patreon"],
      title: game.i18n.localize("mtte.moulinettePatreon"),
      template: "modules/moulinette-core/templates/patreon.hbs",
      width: 550,
      height: "auto",
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    if(!game.settings.get("moulinette-core", "enableMoulinetteCloud")) {
      return { disabled: true }
    }
    const user = await game.moulinette.applications.Moulinette.getUser(true)
    const userId = game.settings.get("moulinette", "userId");
    const callback = `${game.moulinette.applications.MoulinetteClient.SERVER_URL}/patreon/callback`
    const patreonURL = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${MoulinettePatreon.CLIENT_ID}&redirect_uri=${callback}&scope=identity identity.memberships&state=${userId}`
    
    return { user: user, url: patreonURL }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.html = html
    
    // buttons
    html.find("button").click(this._onClickButton.bind(this))
  }
  
  /**
   * User clicked on button (or ENTER on search)
   */
  async _onClickButton(event) {
    event.preventDefault();
    const source = event.currentTarget
    if(source.classList.contains("continue")) {
      console.log("Moulinette Patreon | Refreshing")
      game.moulinette.cache.clear()
      this.render()
    } else if(source.classList.contains("login")) {
      game.moulinette.cache.clear()
    } else if(source.classList.contains("logout")) {
      console.log("Moulinette Patreon | Loging out")
      await game.settings.set("moulinette", "userId", randomID(26));
      game.moulinette.cache.clear()
      this.render()
    } else if(source.classList.contains("gift")) {
      new MoulinettePatreonGift(this).render(true)
    }
  }
  
  /**
   * Check if patreon level is > 5$/month
   * It's not a robust implementation and is not intended to be.
   * If you really want to not support me, feel free to hijack it :)
   */
  static hasEarlyAccess() {
    return ["Dwarf blacksmith", "Dwarf goldsmith", "Owner"].includes(game.moulinette.user.patron)
  }

}

export class MoulinettePatreonGift extends FormApplication {
  
  constructor(parent) {
    super()
    this.parent = parent
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-gift",
      classes: ["mtte", "gift"],
      title: game.i18n.localize("mtte.moulinettePatreonGift"),
      template: "modules/moulinette-core/templates/patreon-gift.hbs",
      width: 400,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async _updateObject(html) {
    const gift = this.html.find("#coupon").val()
    // check guid
    const client = new game.moulinette.applications.MoulinetteClient()
    const result = await client.get(`/manage-gifts/claim/${game.moulinette.user.id}/${gift}`)
    if(!result || result.status != 200) {
      ui.notifications.error(game.i18n.localize("mtte.errorInvalidGift"))
      console.error(`Moulinette Patreon | Invalid gift '${gift}'`)
    } else {
      this.parent.render()
      this.close()
    }
  }
  
  activateListeners(html) {
    this.html = html
    super.activateListeners(html);
  }

}

