import { dia, util } from '@joint/plus';

export default class TreeGraph extends dia.Graph {
    
    getRoot() {
        const [root = null] = this.getSources();
        return root;
    }
    
    getParentLink(el) {
        const [link = null] = this.getConnectedLinks(el, { inbound: true });
        return link;
    }
    
    getParent(el) {
        const [parent = null] = this.getNeighbors(el, { inbound: true });
        return parent;
    }
    
    getChildren(el, direction) {
        const bySiblingRank = (siblingEl) => siblingEl.get('siblingRank');
        const children = util.sortBy(this.getNeighbors(el, { outbound: true }), bySiblingRank);
        if (direction) {
            return children.filter(childEl => childEl.get('direction') === direction);
        }
        return children;
    }
    
    getBalancedChildDirection(el) {
        const rightChildren = this.getChildren(el, 'R');
        const leftChildren = this.getChildren(el, 'L');
        return (leftChildren.length > rightChildren.length) ? 'R' : 'L';
    }
    
    getDirection(el) {
        let current = el;
        let direction;
        do {
            direction = current.get('direction');
            current = this.getParent(current);
            if (!current)
                return null;
        } while (!direction);
        return direction;
    }
    
    getNextSibling(el) {
        const parent = this.getParent(el);
        if (!parent)
            return null;
        const direction = el.get('direction');
        const children = this.getChildren(parent).filter(c => c.get('direction') === direction);
        const sibling = children[children.indexOf(el) + 1];
        if (!sibling)
            return null;
        return sibling;
    }
    
    getPrevSibling(el) {
        const parent = this.getParent(el);
        if (!parent)
            return null;
        const direction = el.get('direction');
        const children = this.getChildren(parent).filter(c => c.get('direction') === direction);
        const sibling = children[children.indexOf(el) - 1];
        if (!sibling)
            return null;
        return sibling;
    }
    
    getSuccessor(el, direction) {
        const [child] = this.getChildren(el, direction);
        if (child)
            return child;
        let current = el;
        let parent;
        do {
            const sibling = this.getNextSibling(current);
            if (sibling)
                return sibling;
            parent = this.getParent(current);
            if (parent) {
                current = parent;
            }
        } while (parent);
        return null;
    }
    
    getClosestNextSibling(el) {
        let current = el;
        let i = 0;
        while (current && !this.getNextSibling(current)) {
            i++;
            current = this.getParent(current);
        }
        if (!current)
            return null;
        current = this.getNextSibling(current);
        while (--i >= 0) {
            const children = this.getChildren(current);
            if (children.length === 0)
                break;
            current = children[0];
        }
        return current;
    }
    
    getClosestPrevSibling(el) {
        let current = el;
        let i = 0;
        while (current && !this.getPrevSibling(current)) {
            i++;
            current = this.getParent(current);
        }
        if (!current)
            return null;
        current = this.getPrevSibling(current);
        while (--i >= 0) {
            const children = this.getChildren(current);
            if (children.length === 0)
                break;
            current = children[children.length - 1];
        }
        return current;
    }
    
    removeBranch(el, opt) {
        this.startBatch('remove-branch');
        const elements = [el, ...this.getSuccessors(el)];
        elements.forEach(element => element.remove(opt));
        this.stopBatch('remove-branch');
    }
    
    triggerLayout() {
        this.trigger('layout:request');
    }
}
