export class MoulinetteLayer extends CanvasLayer {

  constructor(...args) {
    super(...args);

    this.active = false;
    this.isSetup = false;
  }

  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
        zIndex: 180,
        name: "moulinette"
    });
  }

  activate() {
    super.activate();
    this.active = true;
  }

  deactivate() {
    super.deactivate();
    this._clearChildren();
    this.active = false;
  }

  render(...args) {
    super.render(...args);
  }

  _clearChildren() {
    if (!this.UIContainer) return;
    this.UIContainer.children.forEach(child => {
      child.clear()
    });
  }

  selectObjects() {
    // no real implementation
  }

}
