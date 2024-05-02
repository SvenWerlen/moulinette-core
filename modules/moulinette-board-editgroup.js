/*************************
 * Moulinette Board (Edit group)
 *************************/
export class MoulinetteBoardGroup extends FormApplication {
  
  constructor(boardUI, level, idx) {
    super()

    // Moulinette Board (parent)
    this.boardUI = boardUI
    // Board data (from settings)
    this.board = this.boardUI.getBoardData()
    // Navigation level
    this.boardGroupData = this.boardUI.getGroupData(this.board, level)
    // Existing navigation item
    if(idx && idx > 0 && idx <= this.boardGroupData.nav.length) {
      this.navItem = this.boardGroupData.nav[idx-1]
      this.isNew = false
      this.idx = idx
    } 
    // New navigation item
    else {
      this.navItem = {}
      this.boardGroupData.nav.push(this.navItem)
      this.isNew = true
    }
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-board-group",
      classes: ["mtte", "board"],
      title: game.i18n.localize("mtte.boardGroup"),
      template: "modules/moulinette-core/templates/board-editgroup.hbs",
      width: 500,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  getData() {
    return {
      data: this.navItem, 
      isNew: this.isNew
    }
  }

  /**
   * Refresh navigation from settings before closing
   */
  async close(options={}) {
    if(this.boardUI) {
      this.boardUI.refresh()
    }
    super.close(options)
  }
  
  async _onClick(event) {
    event.preventDefault();
    const button = event.currentTarget;
    if(button.classList.contains("cancel")) {
      this.close()
    }
    else if(button.classList.contains("browse")) {
      const icon = this.html.find("input.icon2").val()
      new FilePicker({callback: this._onPathChosen.bind(this), current: icon ? icon : "moulinette/images/", type: "image"}).render(true);
    }
    else if(button.classList.contains("browseSound")) {
      new FilePicker({callback: this._onAudioChosen.bind(this), type: "audio"}).render(true);
    }
    else if(button.classList.contains("browseGameIcon")) {
      //const icon = this.html.find("input.icon2").val()
      const picker = game.moulinette.applications.MoulinetteGameIconsPicker
      if(!picker) {
        return ui.notifications.error(game.i18n.localize("mtte.errorGameIconModule"));
      }
      if(!game.permissions.FILES_UPLOAD.includes(game.user.role)) {
        return ui.notifications.error(game.i18n.localize("mtte.filepickerCanNotUpload"));
      }

      picker.browse("", (path) => {
        this._onPathChosen(path)
      })
    }
    else if(button.classList.contains("delete")) {
      // prompt confirmation
      const dialogDecision = await Dialog.confirm({
        title: game.i18n.localize("mtte.deleteBoardGroup"),
        content: game.i18n.format("mtte.deleteBoardGroupContent", { name: this.navItem.name, count: 0 }),
      })
      if(!dialogDecision) return;
      
      if(this.idx > 0 && this.idx <= this.boardGroupData.nav.length) {
        this.boardGroupData.nav.splice(this.idx-1, 1); // remove item
        await this.boardUI.storeBoardData(this.board)
        this.close()
      } else {
        console.error("Moulinette Board | Something went wrong with deletion", this.idx, this.board)
      }
    }
    else if(button.classList.contains("save")) {
      if(!this.navItem.name) {
        return ui.notifications.error(game.i18n.localize("mtte.errorBoardNoName"));
      }
      if(this.boardUI) {
        await this.boardUI.storeBoardData(this.board)
      }
      this.close()
    }
  }
  
  /**
   * User selected a path (as image icon)
   */
  _onPathChosen(path) {
    this.html.find("input.icon2").val(path)
    this.html.find(".icon").val("")
    this.navItem.icon = path
    this.navItem.faIcon = false
    this._updatePreview()
  }

  /**
   * Update Button Layout according to the current settings
   */
  _updatePreview() {
    if(this.boardUI) {
      this.boardUI.refresh(this.board)
    }
  }

  activateListeners(html) {
    const parent = this
    this.html = html

    IconPicker.Init({
      // Required: You have to set the path of IconPicker JSON file to "jsonUrl" option. e.g. '/content/plugins/IconPicker/dist/iconpicker-1.5.0.json'
      jsonUrl: "/modules/moulinette-core/iconpicker/iconpicker.json",
      // Optional: Change the buttons or search placeholder text according to the language.
      searchPlaceholder: game.i18n.localize("mtte.searchIcon"),
      showAllButton: game.i18n.localize("mtte.showAll"),
      cancelButton: game.i18n.localize("mtte.cancel"),
      noResultsFound: game.i18n.localize("mtte.noResultsFound"),
      // v1.5.0 and the next versions borderRadius: '20px', // v1.5.0 and the next versions
    });
    IconPicker.Run('#GetIconPickerEdit', function() {
      html.find(".icon2").val("")
      parent.navItem.icon = parent.html.find("input.icon").val()
      parent.navItem.faIcon = parent.navItem.icon.length > 0
      parent._updatePreview()
    });

    html.find("button").click(this._onClick.bind(this))
    
    html.find("input.shortText").on('input',function(e){
      const txt = $(e.currentTarget).val()
      parent.navItem.name = txt
      parent._updatePreview()
    });

    html.find("#IconInputEdit").change((e) => {
      html.find(".icon2").val("")
      const txt = $(e.currentTarget).val()
      parent.navItem.icon = txt
      parent.navItem.faIcon = txt.length > 0
      parent._updatePreview()
    })

    html.find(".icon2").change((e) => {
      html.find(".icon").val("")
      const txt = $(e.currentTarget).val()
      parent.navItem.icon = txt
      parent.navItem.faIcon = false
      parent._updatePreview()
    })

    html.find("input.shortText").focus().val($("input.shortText").val());
  }
  
}
