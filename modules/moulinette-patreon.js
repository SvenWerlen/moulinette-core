/*************************
 * Moulinette Patreon
 *************************/
export class MoulinettePatreon extends FormApplication {
  
  // client ID for FVTT integration
  static CLIENT_ID = "K3ofcL8XyaObRrO_5VPuzXEPnOVCIW3fbLIt6Vygt_YIM6IKxA404ZQ0pZbZ0VkB"
  
  constructor(callingWindow) {
    super()
    this.callingWindow = callingWindow
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
    return { user: user }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.html = html
    const parent = this

    // buttons
    html.find("button").click(this._onClickButton.bind(this))

    if(this.callingWindow) {
      this.callingWindow.noBringToTop = true
      this.callingWindow.render(true)
    }

    // re-enable moulinette Cloud
    html.find(".mouCloudEnable").click(async function(ev) {
      ev.preventDefault()
      await game.settings.set("moulinette-core", "enableMoulinetteCloud", true)
      parent.render()
    })

    // make sure window is on top of others
    this.bringToTop()
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
      const newGUID = randomID(26);
      const callback = `${game.moulinette.applications.MoulinetteClient.SERVER_URL}/patreon/callback`
      const patreonURL = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${MoulinettePatreon.CLIENT_ID}&redirect_uri=${callback}&scope=identity identity.memberships&state=${newGUID}`
      game.moulinette.cache.clear()
      await game.settings.set("moulinette", "userId", newGUID)
      window.open(patreonURL, '_blank');

      this.html.find(".login").hide()
      this.html.find(".error").html(game.i18n.localize("mtte.continue"))

      const parent = this
      this.timerIter = 0
      this.timer = setInterval(async function(){
        const progress = parent.html.find(".progress")

        // stop after 2 minutes maximum
        if(parent.timerIter > 60) {
          parent.html.find(".error").html(game.i18n.localize("mtte.authenticationTimeout"))
          progress.html("")
          return clearInterval(parent.timer);
        }

        parent.timerIter++;
        progress.html(progress.text() + " .")

        const client = new game.moulinette.applications.MoulinetteClient()
        const noCache = "?ms=" + new Date().getTime()
        const ready = await client.get(`/user/${newGUID}/ready`)
        if(ready && ready.status == 200 && ready.data.status == "yes") {
          clearInterval(parent.timer);
          parent.render()
        }

      }, 2000);

    } else if(source.classList.contains("logout")) {
      console.log("Moulinette Patreon | Loging out")
      await game.settings.set("moulinette", "userId", "anonymous");
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
   * However, server-side features double-check the permissions
   */
  static hasEarlyAccess() {
    return ["Dwarf blacksmith", "Dwarf goldsmith", "Dwarf goldsmith II", "Dwarf goldsmith III", "Dwarf noble", "Owner"].includes(game.moulinette.user.patron)
  }

  close() {
    if(this.timer) {
      clearInterval(this.timer);
    }
    super.close()
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
    const result = await client.get(`/creators/gifts/claim/${game.moulinette.user.id}/${gift}`)
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

