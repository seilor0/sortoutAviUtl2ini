
class Model {
  constructor({
    name='',
  }={}) {
    this.name=name;
  }
  // method
  clone() {
    return new Model({name:this.name});
  }
}
export class PackageModel extends Model {
  constructor({
    name='',
    initOrder=null, 
    toDelete=false, 
    uninstalled=false, 
    props={},
    fontStyle={}
  }={}) {
    super({name:name});
    this.initOrder   = initOrder;
    this.toDelete    = toDelete;
    this.uninstalled = uninstalled;
    this.props       = structuredClone(props); // {order, hide, labels:[], ...}
    this.fontStyle   = structuredClone(fontStyle);
  }
  // method
  clone() {
    return new PackageModel({
      name        : this.name,
      initOrder   : this.initOrder,
      toDelete    : this.toDelete,
      uninstalled : this.uninstalled,
      props       : structuredClone(this.props),
      fontStyle   : structuredClone(this.fontStyle),
    });
  }
}
export class FolderModel extends Model {
  constructor({
    name='',
    isOpen=true,
    order=null,
    children=[],
  }={}) {
    super({name:name});
    this.isOpen = isOpen;
    this.order = order;
    this.children = [...children];
  }
  // method
  clone() {
    return new FolderModel({
      name     : this.name,
      isOpen   : this.isOpen,
      order    : this.order,
      children : this.children.map(model=>model.clone()),
      // children : [...this.children],
    });
  }
}
