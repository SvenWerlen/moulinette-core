export class MoulinetteProgress extends Application {

  constructor(title) {
    super({ title: title })
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-progress",
      classes: ["mtte", "progress", "preview"],
      title: game.i18n.localize("mtte.progress"),
      template: "modules/moulinette-core/templates/progress.hbs",
      width: 500,
      height: 90
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.html = html
  }

  /**
   * Update progress bar
   * @param {0-100} progress value (pourcentage)
   */
  setProgress(progress, description) {
    progress = Math.round(progress)
    if(!this.html) return
    if(progress >= 0 && progress <= 100) {
      const progressDiv = this.html.find(".progress")
      progressDiv.css("width", `${progress}%`)
      progressDiv.text(`${progress}%`)
    }
    if(description) {
      this.html.find(".description").text(description)
    }
    // close window if progress is 100%
    if(progress == 100) {
      setTimeout(() => this.close(), 2000);
    }
  }

}
