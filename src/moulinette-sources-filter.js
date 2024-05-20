export class MoulinetteSourcesFilter extends FormApplication {

  constructor(extensions, filters, callback) {
    super()
    this.extensions = extensions
    this.filters = filters
    this.callback = callback
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "mtteSourcesFilterDialog",
      classes: ["mtte", "options"],
      title: "",
      template: "modules/moulinette-core/templates/sources-filter.hbs",
      width: 100,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }

  getData() {
    const options = []
    for(const e of this.extensions) {
      options.push({
        filter: e,
        checked: !this.filters || this.filters.includes(e)
      })
    }
    return {
      options: options
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
        parent.callback(filters.length == 0 || filters.length == this.extensions.length ? null : filters)
      }
      parent.close()
    })
  }
}
