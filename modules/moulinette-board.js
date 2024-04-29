import { MoulinetteBoardGroup } from "./moulinette-board-editgroup.js"

export class MoulinetteBoard {

  static getBoardData() {
    if(!game.moulinette.board) {
      game.moulinette.board = []
    }
    return game.moulinette.board
  }

  static render(visible = true) {
    // Inject HTML (if doesn't exist)
    if($("#mtteboard-top").length == 0) {
      $("body").append(`<div id="mtteboard-top"></div>`);
      $("body").append(`<div id="mtteboard-nav"></div>`);
    }
    
    const data = MoulinetteBoard.getBoardData()

    let content = `<img class="logo" src="/modules/moulinette-core/img/moulinette.png"/>`
    content += data.map(el => {
      if(el.icon && el.faIcon) {
        return `<i class="lvl1 ${el.icon}"></i>`
      } else if(el.icon) {
        return `<img class="lvl1" src="${el.icon}"/>`
      } else {
        return `<span class="lvl1">${el.name}</span>`
      }
    }).join("")
    // content += `<i class="lvl1 fa-regular fa-lightbulb"></i>`
    // content += `<i class="lvl1 selected fa-solid fa-block-brick"></i>`
    // content += `<i class="lvl1 fa-solid fa-music"></i>`
    // content += `<i class="lvl1 fa-regular fa-lightbulb"></i>`
    // content += `<i class="lvl1 fa-regular fa-lightbulb"></i>`
    // content += `<span class="lvl1">Text</span>`
    content += `<i class="lvl1 action fa-solid fa-circle-plus"></i></li>`

    $("#mtteboard-top").html(content)

    $("#mtteboard-top .action").click(MoulinetteBoard._onAddBoardGroup)

    const lvl1 = []
    const lvl2 = []
    const lvl3 = []
    let content2 = "<ul>" + lvl1.map(el => `<li class="lvl1">` + (el.startsWith("fa") ? `<i class="${el}"></i>` : el) + "</li>").join("") + `<li class="lvl1 action"><i class="fa-solid fa-circle-plus"></i></li></ul>`
    content2 += "<ul>" + lvl2.map(el => `<li class="lvl2">` + (el.startsWith("fa") ? `<i class="${el}"></i>` : el) + "</li>").join("") + "</ul>"
    content2 += "<ul>" + lvl3.map(el => `<li class="lvl3">` + el + "</li>").join("") + "</ul>"

    $("#mtteboard-nav").html(content2)
  }

  /**
   * User wants to add a new board group
   */
  static _onAddBoardGroup(event) {
    event.preventDefault();
    (new MoulinetteBoardGroup(MoulinetteBoard)).render(true)
  }
}