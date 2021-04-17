
import { Moulinette } from "./modules/moulinette.js"
import { MoulinetteFileUtil } from "./modules/moulinette-file-util.js"
import { MoulinetteClient } from "./modules/moulinette-client.js"
import { MoulinetteForgeModule } from "./modules/moulinette-forge-module.js"

/**
 * Init: define global game settings & helpers
 */
Hooks.once("init", async function () {
  console.log("Moulinette Core| Init")
  
  game.settings.register("moulinette", "userId", { scope: "world", config: false, type: String, default: randomID(26) });
  game.settings.register("moulinette", "currentTab", { scope: "world", config: false, type: String, default: "scenes" })
  
  game.settings.register("moulinette-core", "customPath", {
    name: game.i18n.localize("config.mtteCustomPath"), 
    hint: game.i18n.localize("config.mtteCustomPathHint"), 
    scope: "world",
    config: true,
    default: "",
    type: String
  });
  
  game.moulinette = {
    modules: [],
    applications: {
      Moulinette,
      MoulinetteClient,
      MoulinetteForgeModule,
      MoulinetteFileUtil
    },
    forge: []
  }

  Handlebars.registerHelper('pretty', function(text) {
    return Moulinette.prettyText(text)
  });
  
});

/**
 * Ready: defines a shortcut to open Moulinette Interface
 */
Hooks.once("ready", async function () {
  if (game.user.isGM) {
    await MoulinetteFileUtil.createFolderIfMissing(".", "moulinette");
    
    // open moulinette on CTRL+M
    document.addEventListener("keydown", evt => {
      if(evt.key == "m" && evt.ctrlKey && !evt.altKey && !evt.metaKey) {
        game.moulinette.Moulinette.showMoulinette()
      }
    });
   
    // load one default module (Forge)
    game.moulinette.modules.push({
      id: "forge",
      name: game.i18n.localize("mtte.moulinetteForge"),
      descr: game.i18n.localize("mtte.moulinetteForgeHelp"), 
      icon: "modules/moulinette-core/img/moulinette.png",
      class: (await import("./modules/moulinette-forge.js")).MoulinetteForge
    })
  }
});

/**
 * Controls: adds a new Moulinette control
 */
Hooks.on('renderSceneControls', (controls, html) => { 
  if (game.user.isGM) { 
    Moulinette.addControls(controls, html) 
  } 
});
