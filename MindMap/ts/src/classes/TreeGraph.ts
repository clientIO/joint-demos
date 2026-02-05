import type { layout } from '@joint/plus';
import { dia, util } from '@joint/plus';

export default class TreeGraph<
    E extends dia.Element = dia.Element,
    L extends dia.Link = dia.Link
> extends dia.Graph {

    getRoot(): E {
        const [root = null] = this.getSources();
        return root as E;
    }

    getParentLink(el: E): L {
        const [link = null] = this.getConnectedLinks(el, { inbound: true });
        return link as L;
    }

    getParent(el: E): E | null {
        const [parent = null] = this.getNeighbors(el, { inbound: true });
        return parent as E;
    }

    getChildren(el: E, direction?: string): E[] {
        const bySiblingRank = (siblingEl: E) => siblingEl.get('siblingRank');
        const children = util.sortBy(this.getNeighbors(el, { outbound: true }), bySiblingRank);
        if (direction) {
            return children.filter(childEl => childEl.get('direction') ===  direction);
        }
        return children;
    }

    getBalancedChildDirection(el: E): layout.TreeLayout.Direction {
        const rightChildren = this.getChildren(el, 'R');
        const leftChildren = this.getChildren(el, 'L');
        return (leftChildren.length > rightChildren.length) ? 'R' : 'L';
    }

    getDirection(el: E): layout.TreeLayout.Direction | null {
        let current: E = el;
        let direction;
        do {
            direction = current.get('direction');
            current = this.getParent(current);
            if (!current) return null;
        } while (!direction);
        return direction;
    }

    getNextSibling(el: E): E | null {
        const parent = this.getParent(el);
        if (!parent) return null;
        const direction = el.get('direction');
        const children = this.getChildren(parent).filter(c => c.get('direction') === direction);
        const sibling = children[children.indexOf(el) + 1];
        if (!sibling) return null;
        return sibling;
    }

    getPrevSibling(el: E): E | null {
        const parent = this.getParent(el);
        if (!parent) return null;
        const direction = el.get('direction');
        const children = this.getChildren(parent).filter(c => c.get('direction') === direction);
        const sibling = children[children.indexOf(el) - 1];
        if (!sibling) return null;
        return sibling;
    }

    getSuccessor(el: E, direction?: string): E | null {
        const [child] = this.getChildren(el, direction);
        if (child) return child;
        let current = el;
        let parent;
        do {
            const sibling = this.getNextSibling(current);
            if (sibling) return sibling;
            parent = this.getParent(current);
            if (parent) {
                current = parent;
            }
        } while (parent);
        return null;
    }

    getClosestNextSibling(el: E): E | null {
        let current = el;
        let i = 0;
        while (current && !this.getNextSibling(current)) {
            i++;
            current = this.getParent(current);
        }
        if (!current) return null;
        current = this.getNextSibling(current);
        while (--i >= 0) {
            const children = this.getChildren(current);
            if (children.length === 0) break;
            current = children[0];
        }
        return current;
    }

    getClosestPrevSibling(el: E): E | null {
        let current = el;
        let i = 0;
        while (current && !this.getPrevSibling(current)) {
            i++;
            current = this.getParent(current);
        }
        if (!current) return null;
        current = this.getPrevSibling(current);
        while (--i >= 0) {
            const children = this.getChildren(current);
            if (children.length === 0) break;
            current = children[children.length - 1];
        }
        return current;
    }

    removeBranch(el: E, opt?: dia.Cell.Options) {
        this.startBatch('remove-branch');
        const elements = [el, ...this.getSuccessors(el)];
        elements.forEach(element => element.remove(opt));
        this.stopBatch('remove-branch');
    }

    triggerLayout() {
        this.trigger('layout:request');
    }
}
