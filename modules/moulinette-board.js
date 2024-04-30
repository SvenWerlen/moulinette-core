import { MoulinetteBoardGroup } from "./moulinette-board-editgroup.js"

export class MoulinetteBoard {

  /**
   * Retrieves board data (from settings)
   */
  static getBoardData() {
    const board = duplicate(game.settings.get("moulinette", "board"))
    // initialize
    if(!board.nav) {
      board.nav = []
    }
    return board
  }

  /**
   * Stores board data (to settings)
   */
  static async storeBoardData(data) {
    if(!data || !data.nav) return
    // consistency check
    if(data.selected && (data.selected <= 0 || data.selected > data.nav.length)) {
      delete data.selected
    }
    await game.settings.set("moulinette", "board", data)
  }

  /**
   * Returns the group list matching the level
   */
  static getGroupData(data, level) {
    if(!data || !level || level < 1) return null
    if(!data.nav) data.nav = []
    if(level == 1) return data
    // check selected
    if(data.selected && data.selected > 0 && data.selected <= data.nav.length) {
      return MoulinetteBoard.getGroupData(data.nav[data.selected-1], level-1)
    }
    return null
  }

  /**
   * Generates the navigation items for a specific level
   * 
   * @param {Array} navigation 
   * @param {Number} selected 
   * @returns 
   */
  static generateNavigation(navigation, selected) {
    return navigation.map((el, idx) => {
      const selectedHTML = selected == idx+1 ? " selected" : ""
      if(el.icon && el.faIcon) {
        return `<i class="lvl${selectedHTML} ${el.icon}" data-idx="${idx+1}"></i>`
      } else if(el.icon) {
        return `<img class="lvl${selectedHTML}" src="${el.icon}" data-idx="${idx+1}"/>`
      } else {
        return `<span class="lvl${selectedHTML}" data-idx="${idx+1}">${el.name}</span>`
      }
    }).join("")
  }

  /**
   * Refresh the moulinette board
   * @param {Array} tempBoard temporary/preview board (not yet stored)
   */
  static refresh(tempBoard) {
    // Inject HTML (if doesn't exist)
    if($("#mtteboard").length == 0) {
      $("body").append(`<div id="mtteboard"><img class="logo" src="/modules/moulinette-core/img/moulinette.png"/><div class="top" data-lvl="1"></div><div class="nav"></div></div>`);
    }
    
    const board = tempBoard ? tempBoard : MoulinetteBoard.getBoardData()

    // navigation tabs (top)
    let groupData = MoulinetteBoard.getGroupData(board, 1)
    let content = MoulinetteBoard.generateNavigation(groupData.nav, groupData.selected)
    content += `<i class="lvl1 action fa-solid fa-circle-plus"></i>`

    groupData = MoulinetteBoard.getGroupData(board, 2)
    let contentNav = `<div class="list" data-lvl="2">${MoulinetteBoard.generateNavigation(groupData.nav, groupData.selected)}<i class="lvl action fa-solid fa-circle-plus"></i></div>`
    
    groupData = MoulinetteBoard.getGroupData(board, 3)
    if(groupData) {
      contentNav += `<div class="list" data-lvl="3">${MoulinetteBoard.generateNavigation(groupData.nav, groupData.selected)}<i class="lvl action fa-solid fa-circle-plus"></i></div>`
    }

    $("#mtteboard .top").html(content)
    $("#mtteboard .nav").html(contentNav)
    $("#mtteboard .action").click(MoulinetteBoard._onAddBoardGroup)
    $("#mtteboard .lvl").mousedown(MoulinetteBoard._onClickBoardGroup)    
  }

  /**
   * Event : user wants to add a new board group
   */
  static _onAddBoardGroup(event) {
    event.preventDefault();
    const lvl = $(event.currentTarget).closest('[data-lvl]').data('lvl');
    if(lvl) {
      (new MoulinetteBoardGroup(MoulinetteBoard, lvl)).render(true)
    }
  }

  /**
   * Event : user clicked on board group
   */
  static _onClickBoardGroup(event) {
    const idx = $(event.currentTarget).data("idx")
    const lvl = $(event.currentTarget).closest('[data-lvl]').data('lvl');
    if(!idx || !lvl) return;

    // left click => select
    if(event.which == 1) {
      const board = MoulinetteBoard.getBoardData()
      const groupData = MoulinetteBoard.getGroupData(board, lvl)
      if(groupData.selected != idx) {
        groupData.selected = idx
        MoulinetteBoard.storeBoardData(board).then(() => MoulinetteBoard.refresh())
      }
    }
    // right click => edit
    else if(event.which == 3) {
      if(lvl) {
        (new MoulinetteBoardGroup(MoulinetteBoard, lvl, idx)).render(true)
      }
    }
  }
}