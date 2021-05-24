/**
 * Moulinette Core class
 * 
 * Provides functions for all other modules
 */
import { MoulinetteHome } from "./moulinette-home.js"
import { MoulinettePatreon } from "./moulinette-patreon.js"

export class Moulinette {
  
  constructor(hook, type, query) {
    Hooks.on(hook, this.handle.bind(this));
    this.type = type;
  }
  
  static showMoulinette() {
    new MoulinetteHome().render(true)
  }
  
  /**
   * Adds a control button in the menu (top-left)
   */
  static async addControls(controls, html) {

      const moulinetteBtn = $(
          `<li class="scene-control moulinette-scene-control" data-control="moulinette" title="${game.i18n.localize("mtte.moulinette")}">
              <i class="fas fa-hammer"></i>
              <ol class="control-tools">
                  <div id="moulinetteOptions" class="moulinette-options" style="display: none;">
                  </div>
              </ol>
          </li>`
      );

      html.append(moulinetteBtn);
      moulinetteBtn[0].addEventListener('click', ev => this.toggleOptions(ev, html));
  }
  
  /**
   * Converts filename into pretty text
   */
  static prettyText(text) {
    // decode URI
    text = decodeURIComponent(text)
    
    // replace file separators
    text = text.replace(/[_-]/g, " ")
    
    // adds a space between word and number (ex: Orks2 => Orks 2)
    text = text.replace( /(\d+)$/g, " $1");
    
    // capitalize each word (ugly hack for BBC)
    if(text.indexOf("BBC") < 0) {
      var splitStr = text.toLowerCase().split(' ');
      for (let i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
      }
      text = splitStr.join(' ');
    }
    
    return text;
  }
  
  /**
   * Converts filename into pretty text
   */
  static prettyNumber(num) {
    return num.toLocaleString()
  }
  
  /**
   * Toggles options visibility
   */
  static async toggleOptions(event, html) {
    if (html.find('.moulinette-scene-control').hasClass('active')) {
      html.find('#moulinetteOptions').hide();
      html.find('.moulinette-scene-control').removeClass('active');
      html.find('.scene-control').first().addClass('active');
      $(document.getElementById("controls")).css('z-index', '');
    } else {
      this._createOptionsTable(html);
      html.find('.scene-control').removeClass('active');
      html.find('#moulinetteOptions').show();
      html.find('.moulinette-scene-control').addClass('active');
      $(document.getElementById("controls")).css('z-index', 159); // notifications have 160
    }
    if(event) event.stopPropagation();
  }
  
  /**
   * Build controls UI
   */
  static async _createOptionsTable(html) {
    let content = `<ul><li class="title" data-type="home">${game.i18n.localize("mtte.quickOpen")}</li>`
    // add modules
    let shortcuts = []
    const modules = game.moulinette.forge.sort((a,b) => a.name < b.name ? -1 : 1)
    for(const f of modules) {
      content += `<li data-type="${f.id}" class="quick" title="${f.name}"><i class="${f.icon}"></i></li>`
      if(f.shortcuts && f.shortcuts.length > 0) {
        shortcuts.push(...f.shortcuts)
      }
    }
    content += `<li class="quick" data-type="empty">&nbsp;</li>`
    // add other actions
    for(const s of shortcuts) {
      content += `<li data-type="${s.id}" class="shortcut" title="${s.name}"><i class="${s.icon}"></i></li>`
    }
    if(game.moulinette.toggles.patreon) {
      content += `<li data-type="patreon" class="shortcut" title="${game.i18n.localize("mtte.patreon")}"><i class="fab fa-patreon"></i></li>`
    }
    content += "</ul>"
    
    // forge modules have the opportunity to add some controls (like the sound board)
    for(const f of game.moulinette.forge) {
      content += f.instance.getControls()
    }
    
    html.find('.moulinette-options ul').remove()
    html.find('.moulinette-options').append(content)
    html.find('.moulinette-options li.title').click(ev => this._openMoulinette(ev, html))
    html.find('.moulinette-options li.quick').click(ev => this._openMoulinette(ev, html))
    html.find('.moulinette-options li.shortcut').click(ev => this._onShortcut(ev, html))
    
    // forge modules have the opportunity to add some controls (like the sound board)
    for(const f of game.moulinette.forge) {
      await f.instance.activateControlsListeners(html)
    }
    
  }
  
  /**
   * Opens Moulinette Interface
   */
  static async _openMoulinette(event, html) {
    const type = event.currentTarget.dataset.type
    if(type == "empty") return event.stopPropagation();
    else if(type == "home") {
      Moulinette.showMoulinette()
    } else {
      const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
      new forgeClass(type).render(true)
    }
  }
  
  /**
   * Execute shortcut
   */
  static async _onShortcut(event, html) {
    const type = event.currentTarget.dataset.type
    if(type == "patreon") {
      new MoulinettePatreon().render(true)
      return
    }
    const forgeClass = game.moulinette.modules.find(m => m.id == "forge").class
    const module = game.moulinette.forge.find(m => m.shortcuts && m.shortcuts.find(s => s.id == type))
    if(module.instance.onShortcut(type)) {
      event.stopPropagation();
    }
  }

  /**
   * Load modules macros from modules into core compendium
   */
  static async loadModuleMacros() {
    // not yet supported by 0.8.x
    if(!game.data.version.startsWith("0.7")) return;
    
    const pack = game.packs.get("moulinette-core.moulinette-macros")
    const isLocked = pack.locked
    // unlock pack if needed
    if(isLocked) {
      await pack.configure({locked: false})
    }
    for(const m of game.moulinette.macros) {
      // add or update macros
      let match = (await pack.getIndex()).find( el => el.name === m.name )
      if(!match) {
        await pack.createEntity({
          name: m.name, 
          type: "script", 
          flags: {}, 
          scope: "global",
          command: m.data,
          img: m.img,
          actorIds: []
        })
        console.log(`${m.name} successfully created`)
      } else {
        pack.updateEntity({_id: match._id, name: m.name, command: m.data, img: m.img})
        console.log(`${m.name} successfully updated`)
      }
    }
    // unlock pack if needed
    if(isLocked) {
      await pack.configure({locked: true})
    }
  }
  
  /**
   * Retrieves linked user if any
   */
  static async getUser(force = false) {
    if(!game.moulinette.user.cache || force) {
      console.log("Moulinette | Retrieving user details")
      let userId = game.settings.get("moulinette", "userId");
      if(game.moulinette.toggles.patreon) {
        const client = new game.moulinette.applications.MoulinetteClient()
        const user = await client.get(`/user/${userId}`)
        if(user.status == 200) {
          game.moulinette.user = user.data
        }
      } else {
        userId = randomID(26)
      }
      game.moulinette.user.id = userId
      game.moulinette.user.cache = true
    }
    return game.moulinette.user
  }
  
};
