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
   * Converts filename into pretty text
   */
  static prettyText(text) {
    // decode URI
    text = decodeURIComponent(text)
    
    // replace file separators
    text = text.replace(/[_-]/g, " ")

    // add spaces before and after parenthesis
    text = text.replace(/([^ ])\(/g, "$1 (")
    text = text.replace(/\)([^ ])/g, ") $1")
    
    // remove extension (if any)
    const idx = text.lastIndexOf('.')
    if(idx > 0 && (text.length - idx) <= 5) {
      text = text.substr(0, idx)
    }

    // adds a space between word and number (ex: Orks2 => Orks 2)
    text = text.replace( /(\d+)$/g, " $1");

    // remove all multiple spaces
    text = text.replace(/ +(?= )/g,'');

    return text;
  }
  
  /**
   * Converts filename into pretty text
   */
  static prettyNumber(num) {
    return num.toLocaleString()
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
      game.moulinette.user = {
        id: game.settings.get("moulinette", "userId"),
        hasEarlyAccess: function() { return false }
      }
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


  /**
   * Apply CSS & HTML changes on button to indicate inprogress
   */
  static inprogress(button) {
    if(!button) return
    button.prop("disabled", true);
    button.addClass("inprogress")
    button.append(`<img class="mttespinner" src="modules/moulinette-core/img/spinner.gif"/>`)
  }

};
