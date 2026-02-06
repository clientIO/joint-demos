
export class Connection {
    linkModel;
    source;
    target;
    constructor(linkModel, source, target) {
        this.linkModel = linkModel;
        this.source = source;
        this.target = target;
    }
}
