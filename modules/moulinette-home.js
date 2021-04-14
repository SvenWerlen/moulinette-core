/*************************
 * Moulinette Home
 *************************/
export class MoulinetteHome extends FormApplication {
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinetteHome",
      classes: ["mtte", "home"],
      title: game.i18n.localize("mtte.moulinetteHome"),
      template: "modules/moulinette-core/templates/home.hbs",
      width: "400",
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  getData() {
    if (!game.user.isGM) {
      return { error: game.i18n.localize("ERROR.mtteGMOnly") }
    }
    return { modules: game.moulinette.modules }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    html.find("img.button").click(this._onSelect.bind(this));
  }
  
  async _onSelect(event) {
    event.preventDefault();
    const source = event.currentTarget;
    for(const m of game.moulinette.modules) {
      if(source.classList.contains(m.id)) {
        new m.class().render(true)
      }
    }
  }
}
