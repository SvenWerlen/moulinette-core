export class MoulinetteBoardHelp extends FormApplication {
  
    constructor() {
      super()
    }
    
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        id: "moulinette-board-help",
        classes: ["mtte", "boardedit"],
        title: "Moulinette Board",
        template: "modules/moulinette-core/templates/board-help.hbs",
        width: 500,
        height: "auto",
        closeOnSubmit: true,
        submitOnClose: false,
      });
    }

    activateListeners(html) {
      super.activateListeners(html);
      html.find("button").click(this._onClickButton.bind(this));
    }

    async _onClickButton(event) {
      event.preventDefault();
      const source = event.currentTarget;
      if(source.classList.contains("export")) {
        const filename = `moulinette-${game.world.id}-board.json`
        const data = game.settings.get("moulinette", "board")
        saveDataToFile(JSON.stringify(data, null, 2), "text/json", filename);
      } else if(source.classList.contains("import")) {
        const parent = this
        new Dialog({
          title: `Import Data: Moulinette Board`,
          content: await renderTemplate("templates/apps/import-data.html", {
            hint1: game.i18n.format("DOCUMENT.ImportDataHint1", {document: "board"}),
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
                  game.settings.set("moulinette", "board", JSON.parse(json)).then(ev => parent.render(true))
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
        }
    }
    
}