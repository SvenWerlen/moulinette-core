export class MoulinetteExclusions extends Application {

  constructor(title) {
    super({ title: title })
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-exclusions",
      classes: ["mtte", "exclusions"],
      title: game.i18n.localize("mtte.clickToHideTitle"),
      template: "modules/moulinette-core/templates/exclusions.hbs",
      width: 500
    });
  }

  async getData() {
    const exclusions = game.settings.get("moulinette", "dataExclusions")
    const creators = []
    for(const exKey of Object.keys(exclusions)) {
      const creator = { name: exKey, packs: [] }
      if(!("*" in exclusions[exKey])) {
        for(const pKey of Object.keys(exclusions[exKey])) {
          if(pKey != "*") {
            creator.packs.push({ id: pKey, name: exclusions[exKey][pKey]})
          }
          creator.packs.sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        }
      }
      creators.push(creator)
    }
    // sort
    creators.sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    return {
      exclusions: creators
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.html = html

    html.find(".actions a").click((ev) => {
      ev.preventDefault();
      const exclCreator = $(ev.currentTarget).data('creator')
      const exclPack = $(ev.currentTarget).data('pack')
      const exclusions = game.settings.get("moulinette", "dataExclusions")
      if(exclCreator in exclusions) {
        if(exclPack == "*") {
          delete exclusions[exclCreator]
        } else if(exclPack in exclusions[exclCreator]) {
          delete exclusions[exclCreator][exclPack]
        }
      }
      game.settings.set("moulinette", "dataExclusions",exclusions).then(() => this.render(true))
    })
  }

}
