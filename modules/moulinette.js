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
          </li>`
      );

      const moulinetteSub = $(
          `<ol class="sub-controls app control-tools moulinetteSub">
              <div id="moulinetteOptions" class="moulinette-options" style="display: none;"></div>
           </ol>`)

      html.find(".main-controls").append(moulinetteBtn);
      html.append(moulinetteSub);

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
//     if(text.indexOf("BBC") < 0) {
//       var splitStr = text.toLowerCase().split(' ');
//       for (let i = 0; i < splitStr.length; i++) {
//         splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
//       }
//       text = splitStr.join(' ');
//     }
    
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
      html.find('.moulinetteSub').hide();
      html.find('#moulinetteOptions').hide();
      html.find('.moulinette-scene-control').removeClass('active');
      html.find('.scene-control').first().addClass('active');
      $(document.getElementById("controls")).css('z-index', '');
    } else {
      this._createOptionsTable(html);
      html.find('.scene-control').removeClass('active');
      html.find('.moulinetteSub').show();
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
    content += `<li data-type="sync" class="shortcut" title="${game.i18n.localize("mtte.sync")}"><i class="fas fa-sync"></i></li>`
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
    } else if(type == "sync") {
      game.moulinette.cache.clear()
      ui.notifications.info(game.i18n.localize("mtte.refreshed"));
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
    // not yet supported by 9.x
    return;
    
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
    // current userId
    const userId = game.settings.get("moulinette", "userId")
    
    // moulinette cloud is disabled
    if(!game.settings.get("moulinette-core", "enableMoulinetteCloud")) {
      console.log("Moulinette | Moulinette Cloud is disabled.")
      game.moulinette.user = { id: game.settings.get("moulinette", "userId") }
      return game.moulinette.user
    }
    // default behaviour
    if(!game.moulinette.user.cache || force) {
      console.log("Moulinette | Retrieving user details")
      const client = new game.moulinette.applications.MoulinetteClient()
      const noCache = "?ms=" + new Date().getTime()
      const user = await client.get(`/user/${userId}${noCache}`)
      if(user && user.status == 200) {
        game.moulinette.user = user.data
        game.moulinette.user.hasEarlyAccess = MoulinettePatreon.hasEarlyAccess
        // GUID has been updated (after 24 hours, for security reasons)
        if(user.data.guid) {
          await game.settings.set("moulinette", "userId", user.data.guid)
          delete user.data.guid
        }
      } 
      game.moulinette.user.cache = true
    }
    
    // user.id 
    game.moulinette.user.id = game.settings.get("moulinette", "userId")
    return game.moulinette.user
  }

  /**
   * Establish a connection to Moulinette Cloud and fills the cache
   */
  static async fillMoulinetteCache() {
    const user = await game.moulinette.applications.Moulinette.getUser()
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id])
    return index
  }

  static async updateS3URLs() {
    // force linking to Patreon (required for that feature)
    await game.moulinette.applications.Moulinette.fillMoulinetteCache()

    if(!game.moulinette.user.id || game.moulinette.user.id == "anonymous") {
      return ui.notifications.warn(game.i18n.localize("mtte.errorLinkYourPatreon"));
    }

    // get all scenes with a matching background
    const s3Exp = /https:\/\/[a-zA-Z0-9\.]+.*digitaloceanspaces\.com\//;
    const scenes = Array.from(game.scenes.values()).filter(s => s.data.img && s.data.img.match(s3Exp))
    const urls = scenes.map( s => s.data.img )

    // let Moulinette generate new URLs
    let params = {
      method: "POST",
      body: JSON.stringify(urls),
      headers: { 'Content-Type': 'application/json' }
    }
    const response = await fetch(`${game.moulinette.applications.MoulinetteClient.SERVER_URL}/asset/s3/${game.moulinette.user.id}/BeneosBattlemaps`, params).catch(function(e) {
      console.log(`MoulinetteClient | Cannot establish connection to server ${game.moulinette.applications.MoulinetteClient.SERVER_URL}`, e)
    });

    // double check!
    const newUrls = await response.json()
    if(newUrls && newUrls.length == scenes.length) {
      //update all scenes
      for(let i = 0; i < scenes.length; i++) {
        await scenes[i].update({ 'id': scenes[i]._id, 'img': newUrls[i]})
        console.log(`Moulinette | Background scene for ${scenes[i].name} has been successfully updated!`)
      }
    } else {
      console.error("Moulinette | Something wrong on the Moulinette server. Try again or get support on Discord.")
    }

  }

};
