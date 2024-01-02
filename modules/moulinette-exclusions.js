export class MoulinetteExclusions extends Application {

  constructor() {
    super()
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-exclusions",
      classes: ["mtte", "exclusions"],
      title: game.i18n.localize("mtte.manageContentVisibility"),
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
          if(Object.keys(exclusions[exclCreator]) == 0) {
            delete exclusions[exclCreator]
          }
        }
      }
      game.settings.set("moulinette", "dataExclusions",exclusions).then(() => this.render(true))
    })

    html.find(".actions .export").click(() => {
      const filename = `moulinette-${game.world.id}-exclusions.json`
      const data = game.settings.get("moulinette", "dataExclusions")
      saveDataToFile(JSON.stringify(data, null, 2), "text/json", filename);
    });

    html.find(".actions .import").click( async () => {
      const parent = this
      new Dialog({
        title: `Import Data: Moulinette Exclusions`,
        content: await renderTemplate("templates/apps/import-data.html", {
          hint1: game.i18n.format("DOCUMENT.ImportDataHint1", {document: "exclusions"}),
          hint2: game.i18n.format("DOCUMENT.ImportDataHint2", {name: "this config"})
        }),
        buttons: {
          import: {
            icon: '<i class="fas fa-file-import"></i>',
            label: "Import",
            callback: html => {
              const form = html.find("form")[0];
              if ( !form.data.files.length ) return ui.notifications.error("You did not upload a data file!");
              readTextFromFile(form.data.files[0]).then(json => {
                game.settings.set("moulinette", "dataExclusions", JSON.parse(json)).then(ev => parent.render(true))
              });
            }
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("mtte.cancel")
          }
        },
        default: "import"
      }, {
        width: 400
      }).render(true);
    });

  }

}
