/**
 * Moulinette Shortcuts
 * 
 * Provides code for automation
 */
export class MoulinetteShortcuts  extends FormApplication {

  constructor(module, filters = {}) {
    super()
    this.module = module
    this.filters = filters
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-shortcuts",
      classes: ["mtte", "shortcuts"],
      title: game.i18n.localize("mtte.moulinetteShortcuts"),
      template: "modules/moulinette-core/templates/shortcuts.hbs",
      width: 600,
      height: "auto",
      resizable: true,
      dragDrop: [{dragSelector: ".draggable"}],
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }

  async getData() {
    const MACRO_NAME = { tiles: "MouTiles", }
    // prepare code
    const macroCode = `game.moulinette.applications.MoulinetteAPI.searchUI("${this.module}", ${JSON.stringify(this.filters, null, 3)});`
    const macroName = "Mou" + this.module.charAt(0).toUpperCase() + this.module.slice(1);
    let macroJournalCode = `@Macro[${macroName}]{${this.filters.terms}`
    macroJournalCode += "|" + (this.filters.creator ? this.filters.creator : "")
    macroJournalCode += "|" + (this.filters.pack ? this.filters.pack : "") + "}"
    return { macroCode: macroCode, macroJournalCode: macroJournalCode }
  }

  activateListeners(html) {
    super.activateListeners(html);

    // make sure window is on top of others
    this.bringToTop()

    // actions
    html.find("button").click(this._onClickButton.bind(this))

    this.html = html
  }

  _onDragStart(event) {
    super._onDragStart(event)

    const code = this.html.find("#codeMacro").val()
    let dragData = {
      type: "Macro",
      data: {
        name: "Moulinette UI shortcut",
        author: game.user.id,
        type: "script",
        img: "modules/moulinette-core/img/moulinette.png",
        command: code,
      }
    }

    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  async _onClickButton(event) {
    event.preventDefault();
    const source = event.currentTarget

    if(source.classList.contains("clipboardMacro") || source.classList.contains("clipboardJournal")) {
      const code = this.html.find(source.classList.contains("clipboardMacro") ? "#codeMacro" : "#codeJournal").val()
      navigator.clipboard.writeText(code).then(() => {
        ui.notifications.info(game.i18n.localize("mtte.codeCopiedClipboardSuccess"))
      })
      .catch(() => {
        ui.notifications.warn(game.i18n.localize("mtte.codeCopiedClipboardFail"))
      });
    }
    else if(source.classList.contains("createMacro")) {
      const code = this.html.find("#codeMacro").val()
      const m = await Macro.create({
        name: "Moulinette UI shortcut",
        type: "script",
        img: "modules/moulinette-core/img/moulinette.png",
        command: code,
      });
      m.sheet.render(true)
    }
    else if(source.classList.contains("createJournal")) {
      const code = this.html.find("#codeJournal").val()
      const j = await JournalEntry.create({
        name: "Moulinette UI shortcut (article)",
        img: "modules/moulinette-core/img/moulinette.png",
        content: "This is a journal article sample: <br/><br/> " + code,
      });
      j.sheet.render(true)
    }
  }



}
