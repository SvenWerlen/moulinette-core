export class MoulinetteBoardHelp extends FormApplication {
  
    constructor() {
      super()
    }
    
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        id: "moulinette-board-help",
        classes: ["mtte", "boardedit"],
        title: "Moulinette Board",
        template: "modules/moulinette-core/templates/board-help.hbs",
        width: 500,
        height: "auto",
        closeOnSubmit: true,
        submitOnClose: false,
      });
    }
    
}