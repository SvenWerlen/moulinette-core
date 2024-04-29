/*************************
 * Moulinette Board (Edit group)
 *************************/
export class MoulinetteBoardGroup extends FormApplication {
  
  constructor(board, group) {
    super()
    this.board = board
    this.data = {}

    if(group) {
      this.group = group
    } else {
      const data = this.board.getBoardData()
      data.push(this.data)
    }
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-board-group",
      classes: ["mtte", "board"],
      title: game.i18n.localize("mtte.favorite"),
      template: "modules/moulinette-core/templates/board-editgroup.hbs",
      width: 500,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  getData() {
    return {
      data: {}, 
      canBrowse: true,
      canUpload: true,
      exists: false
    }
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
      let settings = game.settings.get("moulinette", "soundboard-advanced")
      const slot = `#${this.data.idx}`
      const dialogDecision = await Dialog.confirm({
        title: game.i18n.localize("mtte.deleteFavorite"),
        content: game.i18n.format("mtte.deleteFavoriteContent", { from: slot }),
      })
      if(!dialogDecision) return;

      delete settings["audio-" + this.slot]
      await game.settings.set("moulinette", "soundboard-advanced", settings)
      this.close()
      if(this.board) {
        this.board.render(true)
      }
    }
    else if(button.classList.contains("save")) {
      const settings = game.settings.get("moulinette", "soundboard-advanced")
      if(this.data.path.length == 0) {
        return ui.notifications.error(game.i18n.localize("mtte.errorSoundboardNoAudio"));
      }

      // remove icon size for icon button
      if(this.data.icon && this.data.size) {
        delete this.data.size
      }

      let audio = duplicate(this.data)
      delete audio["id"]
      delete audio["idx"]
      settings["audio-" + this.slot] = audio
      await game.settings.set("moulinette", "soundboard-advanced", settings)
      this.close()
      if(this.board) {
        this.board.render(true)
      }
    }
  }
  
  /**
   * User selected a path (as image icon)
   */
  _onPathChosen(path) {
    this.html.find("input.icon2").val(path)
    this.html.find(".icon").val("")
    this.data.icon = path
    this.data.faIcon = false
    this._updateAudioButtonLayout()
  }

  /**
   * Update Button Layout according to the current settings
   */
  _updateAudioButtonLayout() {
    if(this.board) {
      this.board.render(true)
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
      parent.data.icon = parent.html.find("input.icon").val()
      parent.data.faIcon = parent.data.icon.length > 0
      parent._updateAudioButtonLayout()
    });

    html.find("button").click(this._onClick.bind(this))
    
    html.find("input.shortText").on('input',function(e){
      const txt = $(e.currentTarget).val()
      parent.data.name = txt
      parent._updateAudioButtonLayout()
    });

    html.find("#IconInputEdit").change((e) => {
      html.find(".icon2").val("")
      const txt = $(e.currentTarget).val()
      parent.data.icon = txt
      parent.data.faIcon = txt.length > 0
      parent._updateAudioButtonLayout()
    })

    html.find(".icon2").change((e) => {
      html.find(".icon").val("")
      const txt = $(e.currentTarget).val()
      parent.data.icon = txt
      parent.data.faIcon = false
      parent._updateAudioButtonLayout()
    })
  }
  
}
