/*************************
 * Moulinette Help
 *************************/
import { MoulinettePatreon } from "./moulinette-patreon.js"
import { MoulinetteHelpIndexing } from "./moulinette-help-index.js"

export class MoulinetteHelp extends FormApplication {
  
  constructor(section = null) {
    super()
    this.section = section
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-help",
      classes: ["mtte", "help"],
      title: game.i18n.localize("mtte.moulinetteHelp"),
      template: "modules/moulinette-core/templates/help.hbs",
      width: 700,
      height: 800,
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    const user = await game.moulinette.applications.Moulinette.getUser()
    const bucket = game.settings.get("moulinette-core", "s3Bucket")

    return {
      user: user,
      icons: game.moulinette.forge.find(f => f.id == "gameicons"),
      tiles: game.moulinette.forge.find(f => f.id == "tiles"),
      scenes: game.moulinette.forge.find(f => f.id == "scenes"),
      sounds: game.moulinette.forge.find(f => f.id == "sounds"),
      search: game.moulinette.forge.find(f => f.id == "imagesearch"),
      s3bucket: bucket.length > 0 && bucket != "null" ? bucket : null,
      theforge: typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge,
      latestVersion: game.version.startsWith("10."),
      hasModules: game.moulinette.forge.length > 0,
      modulesCount: game.moulinette.forge.length
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.html = html

    html.find("a").click(this._onClick.bind(this))
    html.find("h1").click(ev => {
      event.preventDefault();
      const source = event.currentTarget
      $(source).next('.section').toggle();
    })

    navigator.clipboard.writeText("Moulinette rocks!").then(() => {
      html.find(".copySuccess").show()
    })
    .catch(() => {
      html.find(".copyFailed").show()
    });

    if(this.section) {
      html.find(`.section[data-id='${this.section}']`).show()
    }
  }

  _onClick(event) {
    event.preventDefault();
    const source = event.currentTarget
    const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
    if(source.classList.contains("patreon")) {
      new MoulinettePatreon().render(true)
    }
    else if(source.classList.contains("refresh")) {
      this.render(true)
      ui.notifications.info("Help refreshed!")
    }
    else if(source.classList.contains("gameicons")) {
      new forgeClass("gameicons").render(true)
    }
    else if(source.classList.contains("scenes")) {
      new forgeClass("scenes").render(true)
    }
    else if(source.classList.contains("sounds")) {
      new forgeClass("sounds").render(true)
    }
    else if(source.classList.contains("tiles")) {
      new forgeClass("tiles").render(true)
    }
    else if(source.classList.contains("soundpad")) {
      game.moulinette.forge.find( f => f.id == "sounds" ).instance.onShortcut("soundpads")
    }
    else if(source.classList.contains("soundboard")) {
      game.moulinette.forge.find( f => f.id == "sounds" ).instance.onShortcut("soundboard")
    }
    else if(source.classList.contains("favorites")) {
      game.moulinette.forge.find( f => f.id == "tiles" ).instance.onShortcut("favorites")
    }
    else if(source.classList.contains("faceted-search")) {
      game.moulinette.forge.find( f => f.id == "tiles" ).instance.onShortcut("search")
    }
    else if(source.classList.contains("browseMtte")) {
      const bucket = game.settings.get("moulinette-core", "s3Bucket")
      const path = $(source).data("path") ? $(source).data("path") : "moulinette/"
      if(bucket.length > 0 && bucket != "null") {
        const picker = new FilePicker()
        picker.activeSource = "s3"
        picker.sources["s3"].target = path
        picker.render(true);
      } else if(typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
        const picker = new FilePicker()
        picker.activeSource = "forgevtt"
        picker.sources["forgevtt"].target = path
        picker.render(true);
      } else {
        const picker = new FilePicker({current: path})
        picker.render(true);
      }
    }
    else if(source.classList.contains("checkIndex")) {
      new MoulinetteHelpIndexing($(source).data("path"), $(source).data("type")).render(true)
    }

  }
}

