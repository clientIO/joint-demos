import { dia, elementTools, linkTools, shapes, util } from '@joint/plus';
import { BUS_COLOR, BUS_MARGIN, BUS_TREE_MARGIN, MIN_BUS_ELEMENT_SPAN, BUS_Y, TOP_LINK_COLOR, BOTTOM_LINK_COLOR } from './config';
import { artificialIntelligenceTimeline } from './data';
import { Milestone } from './shapes';

const BUTTON_FILL = '#FFFFFF';
const BUTTON_STROKE_COLOR = '#C9CAE0';
const ADD_SIGN_COLOR = '#A3B3D3';
const BUTTON_WIDTH = 30;

// Helpers

function routeOneDirection(tree, sourceElement, links, direction) {
    
    const linkCount = links.length;
    if (linkCount === 0)
        return;
    
    // The `directionFactor` is used to determine the direction
    // of the vertical offset of the links.
    const isBottomDirection = direction === 'B';
    const directionFactor = isBottomDirection ? -1 : 1;
    
    const sourceBBox = sourceElement.getBBox();
    const sourceCenter = isBottomDirection ? sourceBBox.bottomMiddle() : sourceBBox.topMiddle();
    const sortedLinks = util.sortBy(links, (link) => link.getTargetElement().position().x);
    const leftLinks = [];
    const rightLinks = [];
    
    sortedLinks.forEach((link) => {
        const target = link.getTargetElement();
        // If the target is exactly on the middle of the source, we put it in the left group
        if (target.getBBox().center().x <= sourceCenter.x) {
            leftLinks.unshift(link);
        }
        else {
            rightLinks.push(link);
        }
    });
    
    const leftLinkCount = leftLinks.length;
    const rightLinkCount = rightLinks.length;
    
    // An ideal gap between individual links
    const idealGap = 10;
    // The minimal gap around the bundle of links.
    // A space between edge of the element and the first/last link.
    const minBundleGap = 10;
    const bundleParentGap = 10;
    
    // The actual gap between links.
    const gap = Math.min(idealGap, Math.floor((tree.get('parentGap') - bundleParentGap * 2) / Math.max(leftLinkCount, rightLinkCount)), // vertical check
    (sourceBBox.width - minBundleGap * 2) / (linkCount - 1) // horizontal check
    );
    
    // The x coordinate of the first left link. Every link to the right side is in the rightLinks array.
    const firstLeftLinkX = sourceBBox.width / 2 + sourceBBox.x + gap * (leftLinkCount - rightLinkCount - 1) / 2;
    
    const [firstLeftLink] = leftLinks;
    let isFirstLinkStraight = (firstLeftLink)
        ? sourceCenter.x === firstLeftLink.getTargetElement().getBBox().center().x
        : false;
    
    leftLinks.forEach((link, index) => {
        
        const targetBBox = link.getTargetElement().getBBox();
        const targetCenter = isBottomDirection ? targetBBox.topMiddle() : targetBBox.bottomMiddle();
        const midY = targetCenter.y + (isBottomDirection ? -bundleParentGap : bundleParentGap);
        
        // Note: the left links are sorted in reverse order.
        // i.e. the first left link is on the right side of the bundle.
        const dx = -index * gap;
        const dy = directionFactor * (index - (isFirstLinkStraight ? 1 : 0)) * gap;
        link.vertices([
            {
                x: firstLeftLinkX + dx,
                y: midY + dy
            },
            {
                x: targetCenter.x,
                y: midY + dy,
            }
        ]);
    });
    
    rightLinks.forEach((link, index) => {
        
        const targetBBox = link.getTargetElement().getBBox();
        const targetCenter = isBottomDirection ? targetBBox.topMiddle() : targetBBox.bottomMiddle();
        const midY = targetCenter.y + (isBottomDirection ? -bundleParentGap : bundleParentGap);
        
        // Note: there is the first left link on the 0*gap position.
        const dx = (index + 1) * gap;
        const dy = directionFactor * (index) * gap;
        link.vertices([
            {
                x: firstLeftLinkX + dx,
                y: midY + dy
            },
            {
                x: targetCenter.x,
                y: midY + dy,
            }
        ]);
    });
}

function getTree(graph, element) {
    const elements = [element];
    graph.search(element, (cell) => {
        if (cell === element)
            return true;
        if (cell.get('busElement'))
            return false;
        elements.push(cell);
        return true;
    }, { outbound: true });
    return elements;
}

function getConnectedBusLinks(graph, element, outbound) {
    return graph
        .getConnectedLinks(element, { [outbound ? 'outbound' : 'inbound']: true })
        .filter((link) => link.get('busLink'));
}

function addBusElementAfter(graph, element) {
    
    let newId = null;
    
    if (!element) {
        newId = artificialIntelligenceTimeline.unshiftBusElement();
    }
    else {
        newId = artificialIntelligenceTimeline.addBusElementAfter(element.id);
    }
    const nextMilestone = Milestone.create(newId);
    graph.addCell(nextMilestone);
    return nextMilestone;
}

export function removeElement(tree, element, removeBranch = true) {
    const graph = tree.get('graph');
    const isBusElement = element.get('busElement');
    
    const path = getPath(graph, element);
    
    if (isBusElement || removeBranch) {
        const elements = getTree(graph, element);
        graph.removeCells(elements);
    }
    else {
        tree.removeElement(element, { layout: false });
    }
    
    artificialIntelligenceTimeline.removeByPath(path);
}

export function getPath(graph, element) {
    const path = [element.id];
    
    const ancestor = graph.getConnectedLinks(element, { inbound: true }).filter((link) => !link.get('busLink'))[0];
    if (!ancestor)
        return path;
    return [...getPath(graph, ancestor.getSourceElement()), ...path];
}

export function makeLink(parentElementLabel = util.uniqueId(), childElementLabel = util.uniqueId()) {
    return new shapes.standard.Link({
        source: { id: parentElementLabel },
        target: { id: childElementLabel },
        connector: { name: 'rounded' },
        z: -1,
        attrs: {
            line: {
                strokeWidth: 2,
                targetMarker: null
            }
        }
    });
}

function updateBus(graph) {
    const busElements = artificialIntelligenceTimeline.getBusElements();
    busElements.forEach((id, index) => {
        const source = graph.getCell(id);
        
        source.position(100 + index * 300, 200);
        source.set('busElement', true);
        source.set('layout', 'B-T');
        
        if (index === busElements.length - 1)
            return;
        let outboundLinks = graph.getConnectedLinks(source, { outbound: true });
        if (outboundLinks.length > 0) {
            outboundLinks = outboundLinks.filter((link) => {
                const target = link.getTargetCell();
                if (target.get('busElement') && target.id !== busElements[index + 1]) {
                    link.remove();
                    return false;
                }
                return true;
            });
        }
        // Check if we already have a link to the next bus element
        const hasLinkToNextBus = outboundLinks.some(link => {
            const target = link.getTargetCell();
            return target.get('busElement') && target.id === busElements[index + 1];
        });
        
        // Only create a new link if we don't already have one
        if (!hasLinkToNextBus) {
            const target = graph.getCell(busElements[index + 1]);
            const link = makeLink(source.id, target.id);
            
            link.attr('line', {
                strokeWidth: 2,
                strokeDasharray: '3,6',
                strokeDashoffset: '-3',
                stroke: BUS_COLOR,
                strokeLinecap: 'round'
            });
            
            link.set('busLink', true);
            graph.addCell(link);
        }
    });
}

export function addBusElementTools(tree, paperScroller, selection) {
    const paper = paperScroller.options.paper;
    const graph = paper.model;
    
    const minDistance = 120;
    
    graph.getElements().forEach((element) => {
        if (element.get('type') !== 'timeline.Milestone')
            return;
        const elementView = element.findView(paper);
        elementView.removeTools();
        const tools = [];
        
        if (getConnectedBusLinks(graph, element, false).length === 0) {
            
            const { x } = tree.getLayoutBBox();
            const relX = Math.min(x - element.position().x + BUTTON_WIDTH / 2, -minDistance);
            
            const addPrevButton = new elementTools.Button({
                className: 'add-milestone-button',
                attributes: {
                    cursor: 'pointer'
                },
                markup: util.svg /* xml */ `
                    <path d="M 0 0 ${-relX} 0" stroke="${BUS_COLOR}" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round" />
                    <rect rx="6" ry="6" width="${BUTTON_WIDTH}" height="26" fill="${BUTTON_FILL}" stroke="${BUTTON_STROKE_COLOR}" x="${-BUTTON_WIDTH / 2}" y="-13" />
                    <path d="M -5 0 5 0 M 0 -5 0 5" stroke="${ADD_SIGN_COLOR}" stroke-width="2.5" stroke-linecap="round" />
                `,
                x: relX,
                y: '50%',
                action: () => {
                    const el = addBusElementAfter(graph, null);
                    selection.collection.reset([el]);
                    layoutDiagram(tree, paperScroller, selection);
                },
            });
            tools.push(addPrevButton);
        }
        if (getConnectedBusLinks(graph, element, true).length === 0) {
            
            const { x, width } = tree.getLayoutBBox();
            const relX = Math.max((x + width) - element.position().x - BUTTON_WIDTH / 2, minDistance + element.size().width);
            
            const addNextButton = new elementTools.Button({
                className: 'add-milestone-button',
                attributes: {
                    cursor: 'pointer'
                },
                x: relX,
                y: '50%',
                markup: util.svg /* xml */ `
                    <path d="M 0 0 ${-relX} 0" stroke="${BUS_COLOR}" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round" />
                    <rect rx="6" ry="6" width="30" height="26" fill="${BUTTON_FILL}" stroke="${BUTTON_STROKE_COLOR}" x="-15" y="-13" />
                    <path d="M -5 0 5 0 M 0 -5 0 5" stroke="${ADD_SIGN_COLOR}" stroke-width="2" stroke-linecap="round" />
                `,
                distance: '50%',
                action: () => {
                    const el = addBusElementAfter(graph, element);
                    selection.collection.reset([el]);
                    layoutDiagram(tree, paperScroller, selection);
                },
            });
            tools.push(addNextButton);
        }
        if (tools.length === 0)
            return;
        const toolsView = new dia.ToolsView({ tools, layer: dia.Paper.Layers.BACK });
        elementView.addTools(toolsView);
    });
}

export function layoutDiagram(tree, paperScroller, selection) {
    const paper = paperScroller.options.paper;
    updateBus(paper.model);
    layoutWithParallelRouting(paper.model, tree);
    addBusLinkTools(tree, paperScroller, selection);
    addBusElementTools(tree, paperScroller, selection);
    
    const visibleArea = paperScroller.getVisibleArea();
    
    const eventHeight = 228;
    const busHeight = 38;
    const parentGap = 40;
    const categoryHeight = 48;
    const inset = 114;
    const totalHeight = 2 * eventHeight + 2 * categoryHeight + busHeight + 4 * parentGap;
    
    paperScroller.adjustPaper();
    
    const scale = (paperScroller.el.clientHeight - inset) / (totalHeight + inset);
    paperScroller.zoomToRect({
        x: visibleArea.x,
        y: -(2 * parentGap + categoryHeight + eventHeight),
        width: paperScroller.getVisibleArea().width,
        height: totalHeight
    }, {
        useModelGeometry: true,
        minScale: scale,
        maxScale: scale
    });
}

export function addBusLinkTools(tree, paperScroller, selection) {
    const paper = paperScroller.options.paper;
    const graph = paper.model;
    
    graph.getLinks().forEach((link) => {
        if (!link.get('busLink'))
            return;
        const source = link.getSourceElement();
        const target = link.getTargetElement();
        
        const yearA = Number(source.id);
        const yearB = Number(target.id);
        
        if (yearB - yearA === 1)
            return;
        
        const linkView = link.findView(paper);
        if (linkView.hasTools())
            return;
        const toolsView = new dia.ToolsView({
            tools: [
                new linkTools.Button({
                    className: 'add-milestone-button',
                    attributes: {
                        cursor: 'pointer'
                    },
                    markup: util.svg /* xml */ `
                        <rect rx="6" ry="6" width="${BUTTON_WIDTH}" height="26" fill="${BUTTON_FILL}" stroke="${BUTTON_STROKE_COLOR}" x="${-BUTTON_WIDTH / 2}" y="-13" />
                        <path d="M -5 0 5 0 M 0 -5 0 5" stroke="${ADD_SIGN_COLOR}" stroke-width="2.5" stroke-linecap="round" />
                    `,
                    distance: '50%',
                    action: () => {
                        const el = addBusElementAfter(graph, link.getSourceElement());
                        selection.collection.reset([el]);
                        layoutDiagram(tree, paperScroller, selection);
                    },
                })
            ]
        });
        linkView.addTools(toolsView);
    });
}

export function layoutWithParallelRouting(graph, treeLayout) {
    treeLayout.layout();
    
    let x = BUS_MARGIN;
    artificialIntelligenceTimeline.getBusElements().forEach((id) => {
        const element = graph.getCell(id);
        const layoutArea = treeLayout.getLayoutArea(id);
        const treeSpan = Math.max(MIN_BUS_ELEMENT_SPAN, layoutArea.width);
        // Note: tree is always center-aligned
        const cx = x + treeSpan / 2 - element.size().width / 2;
        treeLayout.positionTree(element, cx, BUS_Y);
        // offset for next tree root
        x += treeSpan + BUS_TREE_MARGIN;
    });
    
    graph.getElements().forEach((el) => {
        
        const links = graph.getConnectedLinks(el, { outbound: true });
        const topLinks = [];
        const bottomLinks = [];
        links.forEach((link) => {
            if (link.get('busLink'))
                return;
            const target = link.getTargetElement();
            if (target.get('direction') === 'B') {
                link.attr('line/stroke', BOTTOM_LINK_COLOR);
                bottomLinks.push(link);
            }
            else {
                link.attr('line/stroke', TOP_LINK_COLOR);
                topLinks.push(link);
            }
        });
        
        routeOneDirection(treeLayout, el, topLinks, 'T');
        routeOneDirection(treeLayout, el, bottomLinks, 'B');
        
    });
}

const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');

export function measureTextSize(text, fontSize, fontFamily) {
    if (!context)
        return { width: 0, height: 0 };
    context.font = `${fontSize}px ${fontFamily}`;
    const lines = text.split('\n');
    const maxWidth = Math.max(...lines.map(line => context.measureText(line).width));
    const lineHeight = lines.length * (fontSize * 1.2); // 1.2 is a common line height multiplier
    return {
        width: maxWidth,
        height: lineHeight
    };
}
