export class MoulinetteLayer extends PlaceablesLayer {

  constructor(...args) {
    super(...args);

    this.documentName = "Scene"
    this.active = false;
    this.isSetup = false;
  }

  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      zIndex: 180,
      name: "moulinette"
    });
  }

  getDocuments() {
    return []
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

  _onClickLeft(event) {
    if(!game.moulinette.user.hasEarlyAccess()) return;
    const t = this.worldTransform;
    const tx = (event.data.originalEvent.clientX - t.tx) / canvas.stage.scale.x;
    const ty = (event.data.originalEvent.clientY - t.ty) / canvas.stage.scale.y;
    let coords = [tx, ty];
    coords = canvas.grid.getCenter(tx, ty);
    if ( canvas.grid.hitArea.contains(coords[0], coords[1]) ) {
      game.moulinette.forge.forEach(f => f.instance.onLeftClickGrid({
        x: coords[0],
        y: coords[1],
        ctrl: event.data.originalEvent.ctrlKey,
        alt: event.data.originalEvent.altKey,
        shift: event.data.originalEvent.shiftKey
      }))
    }
  }

  _onClickRight(event) {
    if(!game.moulinette.user.hasEarlyAccess()) return;
    const t = this.worldTransform;
    const tx = (event.data.originalEvent.clientX - t.tx) / canvas.stage.scale.x;
    const ty = (event.data.originalEvent.clientY - t.ty) / canvas.stage.scale.y;
    let coords = [tx, ty];
    coords = canvas.grid.getCenter(tx, ty);
    if ( canvas.grid.hitArea.contains(coords[0], coords[1]) ) {
      game.moulinette.forge.forEach(f => f.instance.onRightClickGrid({
        x: coords[0],
        y: coords[1],
        ctrl: event.data.originalEvent.ctrlKey,
        alt: event.data.originalEvent.altKey,
        shift: event.data.originalEvent.shiftKey
      }))
    }
  }

  selectObjects() {
    // no real implementation
  }

}
