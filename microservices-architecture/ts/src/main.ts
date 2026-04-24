import { dia, ui, highlighters } from '@joint/plus';
import { ContainerModel, ServiceModel, DBModel, GroupModel, LinkModel, cellNamespace } from './models';
import { layoutContainers } from './layout';
import { addContainerTools } from './containers';
import { createExampleDiagram } from './example';
import { NavigatorElementView } from './views';
import { groupAwareAnchor, groupAwareRouter } from './link-routing';
import { colors, icons } from './theme';
import { openTextEditor } from './text-editor';
import './styles.css';

/** Initializes the microservices architecture demo: graph, paper, tools, stencil, and example diagram. */
export const init = () => {

    const canvasEl = document.getElementById('canvas')!;
    const stencilEl = document.getElementById('stencil')!;
    const navigatorEl = document.getElementById('navigator')!;

    // --- Graph ---
    const graph = new dia.SearchGraph({}, { cellNamespace });

    // --- Paper ---
    const paper = new dia.Paper({
        model: graph,
        width: 1,
        height: 1,
        gridSize: 10,
        async: true,
        autoFreeze: true,
        viewManagement: {
            lazyInitialize: true,
            disposeHidden: true
        },
        cellViewNamespace: cellNamespace,
        overflow: true,
        frontParentOnly: false,
        interactive: (cellView: dia.CellView) => {
            if (ContainerModel.isContainer(cellView.model as dia.Element)) {
                return false;
            }
            return true;
        },
        embeddingMode: true,
        findParentBy: 'bbox',
        clickThreshold: 10,
        moveThreshold: 10,
        validateEmbedding: (childView: dia.CellView, parentView: dia.CellView) => {
            const child = childView.model as dia.Element;
            const parent = parentView.model as dia.Element;
            const childIsContainer = ContainerModel.isContainer(child);
            const parentIsContainer = ContainerModel.isContainer(parent);
            const childIsGroup = GroupModel.isGroup(child);
            const parentIsGroup = GroupModel.isGroup(parent);
            // Containers can't be embedded into anything
            if (childIsContainer) return false;
            // Groups can only be embedded into containers
            if (childIsGroup) return parentIsContainer;
            // Elements (Rect, Circle) can be embedded into containers or groups
            return parentIsContainer || parentIsGroup;
        },
        validateUnembedding: () => false,
        linkPinning: false,
        validateConnection: (_cellViewS: dia.CellView, _magnetS: SVGElement, cellViewT: dia.CellView) => {
            const target = cellViewT.model as dia.Element;
            if (!target.isElement()) return false;
            if (ContainerModel.isContainer(target)) return false;
            if (GroupModel.isGroup(target)) return false;
            return true;
        },
        defaultLink: () => new LinkModel(),
        defaultAnchor: groupAwareAnchor,
        defaultConnectionPoint: {
            name: 'anchor',
        },
        defaultRouter: groupAwareRouter,
        defaultConnector: {
            name: 'rounded'
        },
        highlighting: {
            embedding: {
                name: 'mask',
                options: {
                    padding: 3,
                    attrs: {
                        stroke: colors.primaryHighlight,
                        strokeWidth: 2,
                        strokeLinejoin: 'round'
                    }
                }
            },
            connecting: {
                name: 'mask',
                options: {
                    padding: 3,
                    attrs: {
                        stroke: colors.primaryHighlight,
                        strokeWidth: 2,
                    }
                }
            }
        }
    });

    // Make sure the links are updated when a group changes size.
    // The links are in fact not connected to the group, but to the elements
    // inside the group. See the `groupAwareAnchor` in `views.ts` for details.
    graph.on('change:size', (cell: dia.Cell) => {
        if (!GroupModel.isGroup(cell as dia.Element)) return;
        const links = graph.getConnectedLinks(cell as dia.Element, {
            // When a group changes size, we need to update all links connected to the
            // elements inside the group.
            deep: true,
            // Internal links between elements of the same group don't need to be updated,
            // because they are anchored to the elements, not the group.
            includeEnclosed: false
        });
        links.forEach(link => {
            const linkView = link.findView(paper) as dia.LinkView | null;
            linkView?.requestConnectionUpdate();
        });
    });

    // Make sure the links are updated when an element is moved to another group or
    // re-embedded to the same group.
    // Similar to above, we need to update all links connected.
    graph.on('change:parent', (cell: dia.Cell) => {
        if (GroupModel.isGroup(cell as dia.Element)) return;
        // Only Rects, Circles
        const links = graph.getConnectedLinks(cell as dia.Element);
        links.forEach(link => {
            const linkView = link.findView(paper) as dia.LinkView | null;
            linkView?.requestConnectionUpdate();
        });
    });

    paper.on('link:connect', () => {
        // Make sure the new link is highlighted if connected to a selected element
        selection.collection.reset(selection.collection.toArray());
    });

    // --- Snaplines ---
    const snaplines = new ui.Snaplines({ paper });

    // --- PaperScroller ---
    const scroller = new ui.PaperScroller({
        paper,
        cursor: 'grab',
        contentOptions: {
            allowNewOrigin: 'any',
            useModelGeometry: true,
        }
    });

    canvasEl.appendChild(scroller.el);
    scroller.render().center();

    // --- Navigator ---
    const navigator = new ui.Navigator({
        paperScroller: scroller,
        width: 200,
        height: 150,
        padding: 10,
        zoom: false,
        useContentBBox: { useModelGeometry: true },
        dynamicZoom: true,
        paperOptions: {
            async: true,
            viewManagement: {
                lazyInitialize: true,
                disposeHidden: true
            },
            elementView: NavigatorElementView,
            cellVisibility: (cell: dia.Cell) => !cell.isLink(),
            background: {
                color: 'transparent'
            }
        },
        el: navigatorEl
    });
    navigator.render();

    // --- CommandManager ---
    const commandManager = new dia.CommandManager({
        graph,
        cmdBeforeAdd: (_cmdName: string, _cell: dia.Cell, _graph: dia.Graph, options: Record<string, unknown> = {}) => {
            return !options.ignoreCommandManager;
        }
    });

    // Run layout on every stack change (undo/redo/new command)
    commandManager.on('stack', () => {
        layoutContainers(graph);
        scroller.adjustPaper();
    });

    // --- Selection ---
    const selection = new ui.Selection({
        paper: scroller,
        useModelGeometry: true,
        allowTranslate: false,
        boxContent: null,
        filter: (cell: dia.Cell) => {
            if (!cell.isElement()) return true;
            return ContainerModel.isContainer(cell as dia.Element);
        },
        frames: new ui.HighlighterSelectionFrameList({
            highlighter: highlighters.stroke,
            selector: 'body',
            options: {
                padding: -2,
                attrs: {
                    stroke: colors.selectionStroke,
                    strokeWidth: 3
                }
            }
        })
    });

    selection.removeHandle('resize');
    selection.removeHandle('rotate');
    selection.changeHandle('remove', { icon: icons.remove, attrs: { '.handle': { title: 'Remove' }}});

    selection.on('action:group:pointerup', () => {
        const elements = selection.collection
            .toArray()
            .filter(c => c.isElement()) as dia.Element[];
        if (elements.length < 2) return;
        const containerId = elements[0].parent();
        if (!containerId) return;
        const container = graph.getCell(containerId) as dia.Element;
        if (!container) return;
        const group = new GroupModel({ attrs: { label: { text: 'Group' }}});
        graph.startBatch('group');
        group.addTo(graph);
        container.embed(group);
        group.embed(elements, { reparent: true });
        group.fitContent();
        graph.stopBatch('group');
        selection.collection.reset([group]);
    });

    // React to selection changes — show halos and highlight connected links
    selection.collection.on('reset add remove', () => {
        ui.Halo.clear(paper);
        ui.FreeTransform.clear(paper);
        highlighters.addClass.removeAll(paper, 'related-link');
        highlighters.addClass.removeAll(paper, 'related-neighbor');
        const cells = selection.collection.toArray();

        // Show "group" handle only when all selected elements share the same
        // container parent and none of them is a group or container.
        selection.removeHandle('group');
        if (cells.length >= 2 && cells.every(c => {
            if (!c.isElement()) return false;
            const el = c as dia.Element;
            return !ContainerModel.isContainer(el) && !GroupModel.isGroup(el);
        })) {
            const firstParent = (cells[0] as dia.Element).parent();
            if (firstParent) {
                const parent = graph.getCell(firstParent);
                if (parent && ContainerModel.isContainer(parent as dia.Element)
                    && cells.every(c => (c as dia.Element).parent() === firstParent)) {
                    selection.addHandle({ name: 'group', position: ui.Selection.HandlePosition.SW, icon: icons.group, attrs: { '.handle': { title: 'Group' }}});
                }
            }
        }

        if (cells.length === 1) {
            const cell = cells[0];
            const view = cell.findView(paper);
            if (!view) return;
            if (cell.isElement()) {
                graph.getConnectedLinks(cell as dia.Element).forEach(link => {
                    const linkView = link.findView(paper);
                    if (linkView) {
                        link.toFront({ ignoreCommandManager: true });
                        highlighters.addClass.add(linkView, 'line', 'related-link', {
                            className: 'related-link'
                        });
                    }
                });
                graph.getNeighbors(cell as dia.Element).forEach(neighbor => {
                    const neighborView = neighbor.findView(paper);
                    if (neighborView) {
                        highlighters.addClass.add(neighborView, 'body', 'related-neighbor', {
                            className: 'related-neighbor'
                        });
                    }
                });
            }
            if (ContainerModel.isContainer(cell as dia.Element)) {
                const containerCount = graph.getElements().filter(el => ContainerModel.isContainer(el)).length;
                const halo = new ui.Halo({
                    cellView: view,
                    useModelGeometry: true,
                    boxContent: null,
                    clearOnBlankPointerdown: false,
                    tinyThreshold: 0,
                    smallThreshold: 0,
                });
                halo.removeHandle('resize');
                halo.removeHandle('rotate');
                halo.removeHandle('clone');
                halo.removeHandle('fork');
                halo.removeHandle('unlink');
                halo.removeHandle('link');
                if (containerCount <= 1) {
                    halo.removeHandle('remove');
                } else {
                    halo.changeHandle('remove', { icon: icons.remove, attrs: { '.handle': { title: 'Remove' }}});
                }
                halo.render();
            } else {
                const isGroup = GroupModel.isGroup(cell as dia.Element);
                const halo = new ui.Halo({
                    cellView: view,
                    useModelGeometry: true,
                    boxContent: null,
                    clearOnBlankPointerdown: false,
                    tinyThreshold: 0,
                    smallThreshold: 0,
                    clone: (cell) => {
                        return cell.clone({ deep: true });
                    }
                });
                halo.removeHandle('rotate');
                halo.removeHandle('resize');
                if (isGroup) {
                    halo.removeHandle('fork');
                    halo.removeHandle('link');
                    halo.removeHandle('unlink');
                    halo.addHandle({ name: 'ungroup', position: 'sw', icon: icons.ungroup, attrs: { '.handle': { title: 'Ungroup' }}});
                    halo.on('action:ungroup:pointerup', () => {
                        const group = cell as dia.Element;
                        const containerId = group.parent();
                        if (!containerId) return;
                        const container = graph.getCell(containerId) as dia.Element;
                        if (!container) return;
                        const children = group.getEmbeddedCells().filter(c => c.isElement()) as dia.Element[];
                        graph.startBatch('ungroup');
                        children.forEach(child => container.embed(child, { reparent: true }));
                        group.remove();
                        graph.stopBatch('ungroup');
                        selection.collection.reset(children);
                    });
                }
                halo.changeHandle('remove', { icon: icons.remove, attrs: { '.handle': { title: 'Remove' }}});
                halo.changeHandle('clone', { icon: icons.clone, attrs: { '.handle': { title: 'Clone' }}});
                if (!isGroup) {
                    halo.changeHandle('fork', { icon: icons.fork, attrs: { '.handle': { title: 'Fork' }}});
                    halo.changeHandle('link', { icon: icons.link, position: 'se', attrs: { '.handle': { title: 'Link' }}});
                    halo.changeHandle('unlink', { icon: icons.unlink, position: 'sw', attrs: { '.handle': { title: 'Unlink' }}});
                    halo.on('action:unlink:pointerdown', (evt) => {
                        highlighters.addClass.removeAll(paper, 'related-neighbor');
                    });
                }
                halo.render();
                if (isGroup) {
                    ui.FreeTransform.clear(paper);
                    const freeTransform = new ui.FreeTransform({
                        cellView: view,
                        allowRotation: false,
                        theme: 'material',
                    });
                    freeTransform.render();
                }
            }
        }
    });

    // --- Keyboard shortcuts ---
    const keyboard = new ui.Keyboard();

    keyboard.on('ctrl+z command+z', () => {
        commandManager.undo();
    });

    keyboard.on('shift+ctrl+z shift+command+z', () => {
        commandManager.redo();
    });

    keyboard.on('delete backspace', () => {
        const cells = selection.collection.toArray();
        if (cells.length === 0) return;
        // Don't delete the last container
        const containerCount = graph.getElements().filter(el => ContainerModel.isContainer(el)).length;
        const containersToRemove = cells.filter(c => c.isElement() && ContainerModel.isContainer(c as dia.Element));
        if (containerCount - containersToRemove.length < 1) return;
        graph.removeCells(cells);
        selection.collection.reset([]);
    });

    // --- Stencil ---
    const stencil = new ui.Stencil({
        paper: scroller,
        width: 200,
        height: undefined,
        dropAnimation: true,
        scaleClones: true,
        layout: false,
        cellCursor: 'grab',
        snaplines,
        paperOptions: () => ({
            model: new dia.Graph({}, { cellNamespace: cellNamespace }),
            cellViewNamespace: cellNamespace,
        }),
        el: stencilEl
    });

    stencil.render();
    stencil.load([
        new ServiceModel({ position: { x: 25, y: 20 }, attrs: { label: { text: 'Service' }}}),
        new DBModel({ position: { x: 125, y: 20 }, attrs: { label: { text: 'DB' }}}),
        new GroupModel({ position: { x: 25, y: 90 }, attrs: { label: { text: 'Group' }}})
    ]);

    // --- Click selection: set selection.collection ---
    paper.on('element:pointerclick', (elementView: dia.ElementView, evt: dia.Event) => {
        const element = elementView.model;
        if (keyboard.isActive('ctrl meta', evt)) {
            if (ContainerModel.isContainer(element)) return;
            // Clear any selected containers before cherry-picking elements
            const hasContainers = selection.collection.toArray().some((cell: dia.Cell) =>
                cell.isElement() && ContainerModel.isContainer(cell as dia.Element)
            );
            if (hasContainers) selection.collection.reset([]);
            if (selection.collection.has(element)) {
                selection.collection.remove(element);
            } else {
                selection.collection.add(element);
            }
        } else {
            selection.collection.reset([element]);
        }
    });

    paper.on('element:pointerdblclick', (elementView: dia.ElementView) => {
        openTextEditor(paper, elementView.model);
    });

    paper.on('blank:pointerdown', (evt: dia.Event) => {
        if (keyboard.isActive('shift', evt)) {
            selection.startSelecting(evt);
        } else {
            selection.collection.reset([]);
            scroller.startPanning(evt);
        }
    });

    paper.on('element:pointerdown', (elementView: dia.ElementView, evt: dia.Event) => {
        if (ContainerModel.isContainer(elementView.model)) {
            if (keyboard.isActive('shift', evt)) {
                elementView.preventDefaultInteraction(evt);
                selection.startSelecting(evt);
            } else {
                scroller.startPanning(evt);
            }
        }
    });

    paper.on('blank:pointerclick', () => {
        selection.collection.reset([]);
    });

    // --- Track container order on add ---
    graph.on('add', (cell: dia.Cell) => {
        if (cell.isElement() && ContainerModel.isContainer(cell as dia.Element)) {
            const view = cell.findView(paper);
            if (view && !view.hasTools()) {
                addContainerTools(view as dia.ElementView);
            }
        }
    });

    // --- Panning and zooming via mouse wheel ---
    paper.on('paper:pan', (evt: dia.Event, tx: number, ty: number) => {
        evt.preventDefault();
        scroller.el.scrollLeft += tx;
        scroller.el.scrollTop += ty;
    });

    paper.on('paper:pinch', (evt: dia.Event, _ox: number, _oy: number, scale: number) => {
        evt.preventDefault();
        scroller.zoom(scale - 1, {
            min: 0.1,
            max: 4,
        });
    });

    // --- Create initial diagram ---
    commandManager.stopListening();
    createExampleDiagram(graph);
    commandManager.listen();

    layoutContainers(graph);
    scroller.adjustPaper();
    scroller.positionPoint(graph.getBBox()!.topLeft(), 50, 50);
};

init();
