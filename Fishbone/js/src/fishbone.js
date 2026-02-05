import { g, util } from '@joint/core';

const sin45 = Math.sin(Math.PI / 4);

export function layoutFishbone(graph, x, y, options = {}) {
    const { vsGap = 10, vcGap = 12, hsGap = 5, hcGap = 2, ...restOptions } = options;
    const layoutOptions = { vsGap, vcGap, hsGap, hcGap };
    const [head] = graph.getSources();
    const [tail] = graph.getNeighbors(head, { outbound: true });
    
    // Determine the orientation of the tail's children
    const topChildren = [];
    const bottomChildren = [];
    getChildren(graph, tail).forEach((child) => {
        if (child.get('direction') === 'top') {
            topChildren.push(child);
        }
        else {
            bottomChildren.push(child);
        }
    });
    
    // Recursively measure the size of the tail node and its children
    const sizeTop = measureNode(graph, tail, topChildren, false, 0, true, { ...restOptions, ...layoutOptions, top: true });
    const sizeBottom = measureNode(graph, tail, bottomChildren, false, 0, true, { ...restOptions, ...layoutOptions, top: false });
    
    const size = {
        width: Math.max(sizeTop.width, sizeBottom.width),
        height: sizeTop.height + sizeBottom.height
    };
    
    const { height: headHeight } = head.size();
    const { height: tailHeight } = tail.size();
    
    // Position the tail node at the specified coordinates
    const xt = x;
    const yt = y - tailHeight / 2;
    
    // Position the tail node
    tail.position(xt, yt);
    
    // Position the top and bottom descendants of the tail node
    positionHorizontalChildren(graph, bottomChildren, tail, xt, yt, 0, {
        top: false,
        ...layoutOptions
    });
    positionHorizontalChildren(graph, topChildren, tail, xt, yt, 0, {
        top: true,
        ...layoutOptions
    });
    
    head.position(x + size.width, y - headHeight / 2);
    
    return new g.Rect(x, y, size.width, size.height);
}

function getChildren(graph, node) {
    return util.sortBy(graph.getNeighbors(node, { outbound: true }), (child) => {
        return child.get('order') || 0;
    });
}

function measureNode(graph, node, children, horizontal, level = 0, last, options = {}) {
    const { vsGap = 0, vcGap = 0, hsGap = 0, hcGap = 0 } = options;
    
    if (children.length === 0) {
        return { ...node.size() };
    }
    
    children.forEach((child, index) => {
        child.set('layoutSize', measureNode(graph, child, getChildren(graph, child), !horizontal, level + 1, index === children.length - 1, options));
    });
    
    const sizes = children.map(child => child.get('layoutSize'));
    
    let totalWidth = 0;
    let totalHeight = 0;
    
    const { width: nodeWidth, height: nodeHeight } = node.size();
    
    if (horizontal) {
        
        let h = sizes.reduce((acc, size) => acc + size.height, 0);
        h += (sizes.length - 1) * vsGap;
        
        let linkOverlap = 0;
        if (!last || level <= 1) {
            const a = h + 2 * vcGap;
            const b = sin45 * a;
            linkOverlap = Math.max(b - nodeWidth / 2, 0);
            if (level > 1 && node.get('compact')) {
                linkOverlap += nodeWidth / 2;
            }
        }
        
        node.set('linkOverlap', linkOverlap);
        
        let dy = 0;
        const rightWidth = children.reduce((acc, child) => {
            const size = child.get('layoutSize');
            let overflow = nodeWidth / 2 - hcGap;
            if (node.get('compact')) { // if odd level, we skew the nodes
                const grandChildren = getChildren(graph, child);
                overflow += sin45 * (dy + child.get('layoutSize').height - child.size().height / 2);
                if (grandChildren.length > 0) {
                    overflow -= sin45 * vcGap;
                    const gc = grandChildren.at(-1);
                    const gcY = gc.get('layoutSize').height - gc.size().height;
                    overflow -= sin45 * gcY;
                    
                }
                else {
                    overflow -= sin45 * child.size().height / 2;
                }
            }
            else {
                overflow += sin45 * dy;
            }
            
            dy += size.height;
            child.set('layoutTailOverflow', overflow);
            
            dy += vsGap;
            
            return Math.max(acc, size.width - Math.max(overflow, 0) + hcGap, 0);
        }, 0);
        
        totalWidth = linkOverlap + nodeWidth + rightWidth;
        totalHeight = nodeHeight + h + vcGap;
        
    }
    else {
        const [parent] = graph.getNeighbors(node, { inbound: true });
        let nGap = 0;
        if (level > 0 && parent.get('compact')) {
            nGap = sin45 * nodeHeight / 2;
        }
        node.set('layoutCompactSpace', nGap);
        
        totalWidth = nodeWidth + nGap + hcGap + sizes.reduce((acc, size) => acc + size.width, 0);
        totalWidth += hsGap * (sizes.length - 1);
        
        totalHeight = nodeHeight / 2 + vcGap + Math.max(...sizes.map(size => size.height));
    }
    return { width: totalWidth, height: totalHeight };
}

function positionNode(graph, node, horizontal, x, y, level = 0, options = {}) {
    const children = getChildren(graph, node);
    node.position(x, y);
    if (horizontal) {
        positionHorizontalChildren(graph, children, node, x, y, level, options);
    }
    else {
        positionVerticalChildren(graph, children, node, x, y, level, options);
    }
}

function positionVerticalChildren(graph, children, node, x, y, level, options = {}) {
    const { vsGap = 0, vcGap = 0, hsGap = 0, hcGap = 0, top = true } = options;
    let ty = vcGap;
    
    children.forEach((child) => {
        
        const size = child.get('layoutSize');
        
        ty += size.height;
        
        const cx = x - size.width + (child.get('layoutTailOverflow') || 0);
        const cy = (top)
            ? y + ty + node.size().height - child.size().height
            : y - ty;
        
        ty += vsGap;
        
        positionNode(graph, child, true, cx, cy, level + 1, { top, vcGap, vsGap, hsGap, hcGap });
        
        // Adjust the link vertices to create a diagonal line
        
        const nodeAnchorPoint = top
            ? node.getBBox().bottomMiddle()
            : node.getBBox().topMiddle();
        
        let diagonalShift = sin45 * (nodeAnchorPoint.y - child.getCenter().y);
        if (top) {
            diagonalShift = -diagonalShift;
        }
        
        const vertex = {
            x: x + node.size().width / 2 + diagonalShift,
            y: child.position().y + child.size().height / 2
        };
        
        const [link] = graph.getConnectedLinks(child, { inbound: true });
        link.vertices([vertex]);
        link.prop('source/anchor', {
            name: top ? 'bottom' : 'top',
            args: {
                useModelGeometry: true,
            }
        });
        
    });
}

function positionHorizontalChildren(graph, children, node, x, y, level, options = {}) {
    const { vsGap = 0, vcGap = 0, hsGap = 0, hcGap = 0, top = true } = options;
    let tx = node.size().width + (node.get('layoutCompactSpace') || 0) + hcGap;
    
    children.forEach((child) => {
        
        const size = child.get('layoutSize');
        const linkOverlap = child.get('linkOverlap') || 0;
        
        tx += size.width;
        
        const cx = x + tx - child.size().width - linkOverlap;
        
        tx += hsGap;
        
        const cy = (top)
            ? y - size.height - vcGap + node.size().height / 2
            : y + size.height - child.size().height + node.size().height / 2 + vcGap;
        
        positionNode(graph, child, false, cx, cy, level + 1, { top, vcGap, vsGap, hsGap, hcGap });
        
        const childAnchorPoint = top
            ? child.getBBox().bottomMiddle()
            : child.getBBox().topMiddle();
        let diagonalShift = sin45 * (childAnchorPoint.y - node.getCenter().y);
        if (top) {
            diagonalShift = -diagonalShift;
        }
        const vertex = {
            x: child.position().x + child.size().width / 2 + diagonalShift,
            y: y + node.size().height / 2
        };
        
        const [link] = graph.getConnectedLinks(child, { inbound: true });
        link.vertices([vertex]);
        link.prop('target/anchor', {
            name: top ? 'bottom' : 'top',
            args: {
                useModelGeometry: true,
            }
        });
    });
}
