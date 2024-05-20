import { MoulinetteBoardEdit } from "./moulinette-board-edit.js"
import { MoulinetteBoardShortcuts } from "./moulinette-board-shortcuts.js"

/**
 * Moulinette Board
 * 
 * Data structure :
 * {
 *   name : nav item name
 *   icon : icon path (if it's an icon)
 *   faicon : True if icon is a FontAwesome icon, otherwise, it's an image path
 *   nav : [children]
 * }
 */
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
    await game.settings.set("moulinette", "board", data)
  }

  /**
   * Returns the group list matching the level
   */
  static getGroupData(data, level) {
    if(!data || !level || level < 1) return null
    if(!data.nav) data.nav = []
    if(level == 1) return data
    const selected = data.nav.find(el => el.selected)
    if(selected) {
      return MoulinetteBoard.getGroupData(selected, level-1)
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
  static generateNavigation(navigation, draggable = false) {
    const dragHTML = draggable ? `draggable="true"` : ""
    return navigation.map((el, idx) => {
      const selectedHTML = el.selected ? " selected" : ""
      if(el.icon && el.faIcon) {
        return `<i class="lvl${selectedHTML} ${el.icon}" data-idx="${idx+1}" ${dragHTML}></i>`
      } else if(el.icon) {
        return `<div class="lvl${selectedHTML}" data-idx="${idx+1}" ${dragHTML}><img src="${el.icon}" /></div>`
      } else {
        return `<div class="lvl${selectedHTML}" data-idx="${idx+1}" ${dragHTML}><span>${el.name.substring(0, 10)}</span></div>`
      }
    }).join("")
  }


  /**
   * Toggle visibilty (on/off)
   */
  static toggle() {
    $("#mtteboard").toggle()
    if($("#mtteboard").is(":visible")) {
      MoulinetteBoard.refresh()
    }
  }

  /**
   * Refresh the moulinette board
   * @param {Array} tempBoard temporary/preview board (not yet stored)
   */
  static refresh(tempBoard) {
    // Inject HTML (if doesn't exist)
    if($("#mtteboard").length == 0) {
      $("body").append(`<div id="mtteboard"><img class="logo" src="/modules/moulinette-core/img/moulinette.png"/><div class="top" data-lvl="1"></div><div class="nav"></div><div id="boardpreview"/></div>`);
    }

    const emptyEl = `<div class="empty" data-idx="0"></div>`
    const board = tempBoard ? tempBoard : MoulinetteBoard.getBoardData()

    // navigation tabs (top)
    let groupData = MoulinetteBoard.getGroupData(board, 1)
    let content = emptyEl + MoulinetteBoard.generateNavigation(groupData.nav, !tempBoard)
    if(!tempBoard) {
      content += `<i class="lvl action fa-solid fa-circle-plus"></i>`
    }

    // navigation levels #2 and #3 (left)
    let contentNav = ""
    groupData = MoulinetteBoard.getGroupData(board, 2)
    if(groupData) {
      let hasSelected = groupData.nav.find(el => el.selected)
      contentNav += `<div class="list ${hasSelected ? "hasSel" : ""}" data-lvl="2">` + emptyEl +
        `${MoulinetteBoard.generateNavigation(groupData.nav, !tempBoard)}` +
        (tempBoard ? "</div>" : `<i class="lvl action fa-solid fa-circle-plus"></i></div>`)
      
      groupData = MoulinetteBoard.getGroupData(board, 3)
      if(groupData) {
        hasSelected = groupData.nav.find(el => el.selected)
        if(groupData) {
          contentNav += `<div class="list ${hasSelected ? "hasSel" : ""}" data-lvl="3">` + emptyEl +
            `${MoulinetteBoard.generateNavigation(groupData.nav, !tempBoard)}` +
            (tempBoard ? "</div>" : `<i class="lvl action fa-solid fa-circle-plus"></i></div>`)
        }

        groupData = MoulinetteBoard.getGroupData(board, 4)
        if(groupData) {
          const noItem = !groupData.nav || groupData.nav.length == 0
          contentNav += `<div class="list" data-lvl="4">` + emptyEl +
            `${MoulinetteBoard.generateNavigation(groupData.nav, !tempBoard)}` +
            (tempBoard ? "</div>" : `<i class="lvl action fa-solid fa-circle-plus"></i></div>`)
        } 
      }
    }
    
    $("#mtteboard .top").html(content)
    $("#mtteboard .nav").html(contentNav)

    if(!tempBoard) {
      $("#mtteboard .action").click(MoulinetteBoard._onAddBoardGroup)
      $("#mtteboard .lvl").mouseup(MoulinetteBoard._onClickBoardGroup)
      .on("mouseenter", ev => {
        const div = $(ev.currentTarget)
        const idx = div.data("idx")
        const lvl = div.closest('[data-lvl]').data('lvl')
        const groupData = MoulinetteBoard.getGroupData(board, lvl)
        if(groupData && idx > 0 && idx <= groupData.nav.length) {
          MoulinetteBoardShortcuts.generatePreview(groupData.nav[idx-1]).then((html) => {
            $("#boardpreview").html(html)
            .css({ top: div.offset().top, left: div.offset().left + div.width() + 20, 'visibility': 'visible', 'opacity': 1})
          })
        }
        
      })
      .on("mouseleave", ev => {
        $("#boardpreview").css({'visibility': 'hidden', 'opacity': 0})
      })

      $("#mtteboard .top > *:not(.action), #mtteboard .list > *:not(.action)").on('dragstart', function(ev) {
        ev.stopPropagation()
        $("#boardpreview").css({'visibility': 'hidden', 'opacity': 0})
        let data = {
          // for Moulinette only
          board: {
            lvl: $(ev.currentTarget).closest('[data-lvl]').data('lvl'),
            idx: $(ev.currentTarget).data('idx'),
          }
        }
        // for Foundry VTT
        const groupDataSrc = MoulinetteBoard.getGroupData(board, data.board.lvl)
        if(groupDataSrc) {
          data = foundry.utils.mergeObject(data, MoulinetteBoardShortcuts.getDataTransfer(groupDataSrc.nav[data.board.idx-1]))
        }
        console.log(data)
        ev.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(data));
      }).on('dragend', function(ev) {
        ev.preventDefault(); 
        $("#mtteboard .empty").removeClass("expand")
      }).on('dragenter', function(ev) {
        ev.preventDefault(); 
        $("#mtteboard .empty").addClass("expand")
        $(ev.currentTarget).addClass("dropzone")
      }).on('dragleave', function(ev) {
        ev.preventDefault(); 
        $(ev.currentTarget).removeClass("dropzone")
      }).on('dragover', function(ev) {
        ev.preventDefault(); 
      }).on('drop', function(ev) {
        ev.preventDefault(); 
        $(ev.currentTarget).removeClass("dropzone")
        const target = {
          lvl: $(ev.currentTarget).closest('[data-lvl]').data('lvl'),
          idx: $(ev.currentTarget).data('idx')
        }
        
        let data = null
        try {
          data = JSON.parse(ev.originalEvent.dataTransfer.getData("text/plain"));
        } catch(err) {
          return {};
        }
    
        if(data) {
          if(data.board) {
            const source = data.board
            if(source.lvl == target.lvl && source.idx == target.idx) return
            const board = MoulinetteBoard.getBoardData()
            const groupDataSrc = MoulinetteBoard.getGroupData(board, source.lvl)
            const groupDataTrg = MoulinetteBoard.getGroupData(board, target.lvl)
            if(groupDataSrc && groupDataTrg) {
              // groups cannot moved into other levels
              const el = groupDataSrc.nav[source.idx-1]
              if(source.lvl != target.lvl && !el.assets) return ui.notifications.error(game.i18n.localize("mtte.errorBoardMove"))
              // remove src from list
              const movedEl = groupDataSrc.nav.splice(source.idx-1,1)[0]
              // insert src to list
              const targetIdx = source.lvl == target.lvl && source.idx < target.idx ? target.idx-1 : target.idx
              groupDataTrg.nav.splice(targetIdx, 0, movedEl);
              MoulinetteBoard.storeBoardData(board).then(() => MoulinetteBoard.refresh())
            }
          }
          else {
            MoulinetteBoardShortcuts.createShortcut(data).then(item => {
              if(item) {
                const groupDataTrg = MoulinetteBoard.getGroupData(board, target.lvl)
                if(groupDataTrg) {
                  // insert src to list
                  groupDataTrg.nav.splice(target.idx, 0, item);
                  MoulinetteBoard.storeBoardData(board).then(() => MoulinetteBoard.refresh())
                }
              } else {
                console.warn("Moulinette Board | No support for : ", data)
                return ui.notifications.error(game.i18n.localize("mtte.errorUnsupportedType"))
              }
            })
          }
        }
      })
    }
  }

  /**
   * Event : user wants to add a new board group
   */
  static _onAddBoardGroup(event) {
    event.preventDefault();
    const lvl = $(event.currentTarget).closest('[data-lvl]').data('lvl');
    if(lvl) {
      if(lvl == 4) {
        ui.notifications.info(game.i18n.localize("mtte.boardMaxLevelReached"),)
      } else {
        (new MoulinetteBoardEdit(MoulinetteBoard, lvl)).render(true)
      }
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
      if(idx > 0 && idx <= groupData.nav.length) {
        if(groupData.nav[idx-1].type) {
          MoulinetteBoardShortcuts.executeShortcut(groupData.nav[idx-1])
        } else {
          groupData.nav.forEach(el => delete el.selected)
          groupData.nav[idx-1].selected = true
          MoulinetteBoard.storeBoardData(board).then(() => MoulinetteBoard.refresh())
        }
      }
    }
    // right click => edit
    else if(event.which == 3) {
      if(lvl) {
        (new MoulinetteBoardEdit(MoulinetteBoard, lvl, idx)).render(true)
      }
    }
  }
}