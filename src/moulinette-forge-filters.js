export class MoulinetteForgeFilters extends FormApplication {

  constructor(filters, callback) {
    super()
    this.filters = filters
    this.callback = callback
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "mtteForgeFiltersDialog",
      classes: ["mtte", "options"],
      title: "",
      template: "modules/moulinette-core/templates/forge-filters.hbs",
      width: 100,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }

  getData() {
    return {
      options: this.filters
    }
  }

  /**
   * Implements listeners
   */
  activateListeners(html) {
    const parent = this
    html.find(".applyFilters").click(ev => {
      ev.preventDefault();
      const filters = []
      html.find("input:checkbox:checked").each((idx,cb) => {
        filters.push($(cb).val())
      })
      if(parent.callback) {
        parent.callback(filters)
      }
      parent.close()
    })
  }
}
