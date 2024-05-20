/**
 * Moulinette Cache class
 * 
 * Provides a common cache for all modules
 */
export class MoulinetteCache {
  
  constructor(tab) {
    this.cache = {}
  }
  
  clear() {
    this.cache = {}
  }
  
  hasData(key) {
    return key in this.cache
  }
  
  setData(key, data) {
    console.log(`MoulinetteCache | Adding ${key} to cache`)
    this.cache[key] = data
  }
  
  getData(key) {
    console.log(`MoulinetteCache | Retrieving ${key} from cache`)
    return key in this.cache ? duplicate(this.cache[key]) : null
  }
  
}
