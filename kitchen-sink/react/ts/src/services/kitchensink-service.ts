import * as joint from '@joint/plus';
import type { StencilService } from './stencil-service';
import type { ToolbarService } from './toolbar-service';
import type { InspectorService } from './inspector-service';
import type { HaloService } from './halo-service';
import type { KeyboardService } from './keyboard-service';
import * as appShapes from '../shapes/app-shapes';
import type { NavigatorService } from './navigator-service';
import { ZOOM_SETTINGS } from './navigator-service';

type Services = {
    stencilService: StencilService,
    toolbarService: ToolbarService,
    inspectorService: InspectorService,
    haloService: HaloService,
    keyboardService: KeyboardService,
    navigatorService: NavigatorService
}

class KitchenSinkService {

    el: HTMLElement;

    graph: joint.dia.Graph;
    paper: joint.dia.Paper;
    paperScroller: joint.ui.PaperScroller;
    pageBreakSettings: { color: string, width: number, height: number } = { color: '#353535', width: 1000, height: 1000 };
    defaultPaperSize: { width: number, height: number } = { width: 1000, height: 1000 };

    commandManager: joint.dia.CommandManager;
    snaplines: joint.ui.Snaplines;
    clipboard: joint.ui.Clipboard;
    selection: joint.ui.Selection;
    navigator: joint.ui.Navigator;
    tooltip: joint.ui.Tooltip;

    stencilService: StencilService;
    toolbarService: ToolbarService;
    inspectorService: InspectorService;
    haloService: HaloService;
    keyboardService: KeyboardService;
    navigatorService: NavigatorService;

    constructor(
        el: HTMLElement,
        private readonly paperContainer: HTMLElement,
        {
            stencilService,
            toolbarService,
            inspectorService,
            haloService,
            keyboardService,
            navigatorService
        }: Services
    ) {
        this.stencilService = stencilService;
        this.toolbarService = toolbarService;
        this.inspectorService = inspectorService;
        this.haloService = haloService;
        this.keyboardService = keyboardService;
        this.navigatorService = navigatorService;

        // apply current joint js theme
        joint.setTheme('light');

        const view = new joint.mvc.View({ el });
        view.delegateEvents({
            'mouseup input[type="range"]': (evt) => evt.target.blur()
        });
    }

    startRappid() {


        this.initializePaper();
        this.initializeStencil();
        this.initializeSelection();
        this.initializeToolsAndInspector();
        this.initializeNavigator();
        this.initializeToolbar();
        this.initializeKeyboardShortcuts();
        this.initializeTooltips();
    }

    initializePaper() {

        const graph = this.graph = new joint.dia.Graph({}, {
            cellNamespace: appShapes
        });

        this.commandManager = new joint.dia.CommandManager({
            graph: graph,
            cmdBeforeAdd: (cmdName: string, _cellView, _value, { ignoreUndoRedo } = { ignoreUndoRedo: false }) => {
                const [, property] = cmdName.split(':');
                const ignoredChanges = ['infinitePaper', 'dotGrid', 'snaplines', 'gridSize'];
                return !ignoreUndoRedo && !ignoredChanges.some(change => change === property);
            }
        });

        const paper = this.paper = new joint.dia.Paper({
            width: 1000,
            height: 1000,
            gridSize: 10,
            drawGrid: true,
            model: graph,
            cellViewNamespace: appShapes,
            defaultLink: <joint.dia.Link>new appShapes.app.Link(),
            defaultConnectionPoint: appShapes.app.Link.connectionPoint,
            routerNamespace: {
                'normal': joint.routers.normal,
                'orthogonal': joint.routers.orthogonal,
                // Redefine the rightAngle router to use vertices.
                'rightAngle': function(vertices: joint.g.Point[], opt: Record<string, any>, linkView: joint.dia.LinkView) {
                    opt.useVertices = true;
                    return joint.routers.rightAngle.call(this, vertices, opt, linkView);
                }
            },
            interactive: { linkMove: false },
            async: true,
            sorting: joint.dia.Paper.sorting.APPROX
        });

        paper.on('blank:contextmenu', ({ clientX, clientY }, x, y) => {
            const selectionBBox = this.graph.getCellsBBox(this.selection.collection.toArray());

            const selectedCells = selectionBBox?.containsPoint({ x, y }) ? this.selection.collection.toArray() : [];

            this.renderContextToolbar({ x: clientX, y: clientY }, selectedCells);
        });

        paper.on('cell:contextmenu', (cellView, evt) => {
            this.renderContextToolbar({ x: evt.clientX, y: evt.clientY }, [cellView.model]);
        });

        this.snaplines = new joint.ui.Snaplines({ paper: paper });

        const paperScroller = this.paperScroller = new joint.ui.PaperScroller({
            paper,
            autoResizePaper: true,
            scrollWhileDragging: true,
            borderless: true,
            cursor: 'grab'
        });

        let removePageBreaks: () => void | null = null;

        graph.on({
            'change:paperColor': (_, color: string) => paper.drawBackground({ color }),
            'change:infinitePaper': (_, borderless: boolean) => {
                const { options } = paperScroller;

                if (borderless) {
                    options.borderless = true;
                    options.baseWidth = 100;
                    options.baseHeight = 100;

                    if (removePageBreaks) removePageBreaks();

                    this.paperContainer.classList.remove('bordered');
                } else {
                    const { width: paperWidth, height: paperHeight } = this.defaultPaperSize;

                    options.borderless = false;
                    options.baseWidth = paperWidth;
                    options.baseHeight = paperHeight;

                    removePageBreaks = this.addPageBreaks();

                    this.paperContainer.classList.add('bordered');
                }

                paperScroller.adjustPaper();
            },
            'change:dotGrid': (_, showDotGrid: boolean) => paper.setGrid(showDotGrid),
            'change:snaplines': (_, allowSnaplines: boolean) => this.changeSnapLines(allowSnaplines),
            'change:gridSize': (_, gridSize: number) => paper.setGridSize(gridSize),
        });

        this.paperContainer.appendChild(paperScroller.el);
        paperScroller.center();

        paper.on('paper:pan', (evt, tx, ty) => {
            evt.preventDefault();
            paperScroller.el.scrollLeft += tx;
            paperScroller.el.scrollTop += ty;
        });

        paper.on('paper:pinch', (_evt, ox, oy, scale) => {
            // the default is already prevented
            const zoom = paperScroller.zoom();
            paperScroller.zoom(zoom * scale, { min: ZOOM_SETTINGS.min, max: ZOOM_SETTINGS.max, ox, oy, absolute: true });
        });
    }

    initializeStencil() {

        const { stencilService, paperScroller, snaplines } = this;
        stencilService.create(paperScroller, snaplines);
        stencilService.setShapes();

        stencilService.stencil.on({
            'element:drop': (elementView: joint.dia.ElementView) => this.selection.collection.reset([elementView.model]),
            // We need to track the dragging state to prevent showing the tooltip when dragging an element
            'element:dragstart': () => this.tooltip.disable(),
            'element:dragend': () => this.tooltip.enable(),
        });
    }

    initializeSelection() {

        this.clipboard = new joint.ui.Clipboard();
        this.selection = new joint.ui.Selection({
            boxContent: null,
            paper: this.paperScroller,
            useModelGeometry: true,
            translateConnectedLinks: joint.ui.Selection.ConnectedLinksTranslation.SUBGRAPH,
            handles: [
                {
                    ...joint.ui.Selection.getDefaultHandle('rotate'),
                    position: joint.ui.Selection.HandlePosition.SW,
                },
                {
                    ...joint.ui.Selection.getDefaultHandle('resize'),
                    position: joint.ui.Selection.HandlePosition.SE,
                }
            ],
            frames: new joint.ui.HTMLSelectionFrameList({
                rotate: true
            })
        });

        this.selection.collection.on('reset add remove', () => this.onSelectionChange());

        const keyboard = this.keyboardService.keyboard;

        // Initiate selecting when the user grabs the blank area of the paper while the Shift key is pressed.
        // Otherwise, initiate paper pan.
        this.paper.on('blank:pointerdown', (evt: joint.dia.Event, _x: number, _y: number) => {

            if (keyboard.isActive('shift', evt)) {
                this.selection.startSelecting(evt);
            } else {
                this.selection.collection.reset([]);
                this.paperScroller.startPanning(evt);
                this.paper.removeTools();
            }
        });

        // Initiate selecting when the user grabs a cell while shift is pressed.
        this.paper.on('cell:pointerdown element:magnet:pointerdown', (cellView: joint.dia.CellView, evt: joint.dia.Event) => {

            if (keyboard.isActive('shift', evt)) {
                cellView.preventDefaultInteraction(evt);
                this.selection.startSelecting(evt);
            }

        });

        this.paper.on('element:pointerdown', (elementView: joint.dia.ElementView, evt: joint.dia.Event) => {

            // Select an element if CTRL/Meta key is pressed while the element is clicked.
            if (keyboard.isActive('ctrl meta', evt)) {
                this.selection.collection.add(elementView.model);
            }

        });

        this.graph.on('remove', (cell: joint.dia.Cell) => {

            // If element is removed from the graph, remove from the selection too.
            if (this.selection.collection.has(cell)) {
                this.selection.collection.reset(this.selection.collection.models.filter(c => c !== cell));
            }

        });

        this.selection.on('selection-box:pointerdown', (elementView: joint.dia.ElementView, evt: joint.dia.Event) => {

            // Unselect an element if the CTRL/Meta key is pressed while a selected element is clicked.
            if (keyboard.isActive('ctrl meta', evt)) {
                this.selection.collection.remove(elementView.model);
            }

        }, this);

        this.selection.on('selection-box:pointerup', (_, evt: joint.dia.Event) => {
            if (evt.button === 2) {
                evt.stopPropagation();
                this.renderContextToolbar({ x: evt.clientX, y: evt.clientY }, this.selection.collection.toArray());
            }

        }, this);
    }

    renderContextToolbar(point: joint.dia.Point, selectedCells: joint.dia.Cell[] = []) {
        this.selection.collection.reset(selectedCells);
        const isSelectionEmpty = selectedCells.length === 0;

        const contextToolbar = new joint.ui.ContextToolbar({
            target: point,
            root: this.paper.el,
            padding: 0,
            vertical: true,
            anchor: 'top-left',
            tools: [
                {
                    action: 'delete',
                    content: 'Delete',
                    attrs: {
                        disabled: isSelectionEmpty
                    }
                },
                {
                    action: 'copy',
                    content: 'Copy',
                    attrs: {
                        disabled: isSelectionEmpty
                    }
                },
                {
                    action: 'paste',
                    content: 'Paste',
                    attrs: {
                        disabled: this.clipboard.isEmpty()
                    }
                },
                {
                    action: 'send-to-front',
                    content: 'Send to front',
                    attrs: {
                        disabled: isSelectionEmpty
                    }
                },
                {
                    action: 'send-to-back',
                    content: 'Send to back',
                    attrs: {
                        disabled: isSelectionEmpty
                    }
                }
            ]
        });

        contextToolbar.on('action:delete', () => {
            contextToolbar.remove();
            this.graph.removeCells(selectedCells);
        });

        contextToolbar.on('action:copy', () => {
            contextToolbar.remove();

            this.clipboard.copyElements(selectedCells, this.graph);
        });

        contextToolbar.on('action:paste', () => {
            contextToolbar.remove();
            const pastedCells = this.clipboard.pasteCellsAtPoint(this.graph, this.paper.clientToLocalPoint(point));

            const elements = pastedCells.filter(cell => cell.isElement());

            // Make sure pasted elements get selected immediately. This makes the UX better as
            // the user can immediately manipulate the pasted elements.
            this.selection.collection.reset(elements);
        });

        contextToolbar.on('action:send-to-front', () => {
            contextToolbar.remove();
            selectedCells.forEach(cell => cell.toFront());
        });

        contextToolbar.on('action:send-to-back', () => {
            contextToolbar.remove();
            selectedCells.forEach(cell => cell.toBack());
        });

        contextToolbar.render();
    }

    onSelectionChange() {
        const { paper, selection } = this;
        const { collection } = selection;
        paper.removeTools();
        joint.ui.Halo.clear(paper);
        joint.ui.FreeTransform.clear(paper);
        joint.ui.Inspector.close();
        if (collection.length === 1) {
            const primaryCell: joint.dia.Cell = collection.first();
            const primaryCellView = paper.findViewByModel(primaryCell);
            selection.destroySelectionBox(primaryCell);
            this.selectPrimaryCell(primaryCellView);
        } else if (collection.length === 2) {
            collection.each(function(cell: joint.dia.Cell) {
                selection.createSelectionBox(cell);
            });
        }
    }

    selectPrimaryCell(cellView: joint.dia.CellView) {
        const cell = cellView.model;
        if (cell.isElement()) {
            this.selectPrimaryElement(<joint.dia.ElementView>cellView);
        } else {
            this.selectPrimaryLink(<joint.dia.LinkView>cellView);
        }

        this.inspectorService.create(cell);
    }

    selectPrimaryElement(elementView: joint.dia.ElementView) {

        const element = elementView.model;

        new joint.ui.FreeTransform({
            cellView: elementView,
            allowRotation: false,
            preserveAspectRatio: !!element.get('preserveAspectRatio'),
            allowOrthogonalResize: element.get('allowOrthogonalResize') !== false,
            useBordersToResize: true
        }).render();

        this.haloService.create(elementView);
    }

    selectPrimaryLink(linkView: joint.dia.LinkView) {

        const ns = joint.linkTools;
        const tools = [
            new ns.Vertices(),
            new ns.SourceAnchor(),
            new ns.TargetAnchor(),
            new ns.SourceArrowhead(),
            new ns.TargetArrowhead(),
            new ns.Segments({
                visibility: function(linkView) {
                    return linkView.model.router().name === 'normal';
                }
            }),
            new ns.Boundary({ padding: 15 }),
            new ns.Remove({ offset: -20, distance: 40 })
        ];

        const toolsView = new joint.dia.ToolsView({
            name: 'link-pointerdown',
            tools
        });

        linkView.addTools(toolsView);
    }

    initializeToolsAndInspector() {

        this.paper.on('cell:pointerup', (cellView: joint.dia.CellView) => {
            const cell = cellView.model;
            const { collection } = this.selection;
            if (collection.includes(cell)) { return; }
            collection.reset([cell]);
        });

        this.paper.on('link:mouseenter', (linkView: joint.dia.LinkView) => {

            // Open tool only if there is none yet
            if (linkView.hasTools()) { return; }

            const ns = joint.linkTools;
            const toolsView = new joint.dia.ToolsView({
                name: 'link-hover',
                tools: [
                    new ns.Vertices({ vertexAdding: false }),
                    new ns.SourceArrowhead(),
                    new ns.TargetArrowhead()
                ]
            });

            linkView.addTools(toolsView);
        });

        this.paper.on('link:mouseleave', (linkView: joint.dia.LinkView) => {

            // Remove only the hover tool, not the pointerdown tool
            if (linkView.hasTools('link-hover')) {
                linkView.removeTools();
            }
        });

        this.graph.on('change', (cell: joint.dia.Cell, opt: any) => {

            if (cell instanceof joint.dia.Graph || !cell.isLink() || !opt.inspector) { return; }

            const ns = joint.linkTools;
            const toolsView = new joint.dia.ToolsView({
                name: 'link-inspected',
                tools: [
                    new ns.Boundary({ padding: 15 }),
                ]
            });

            cell.findView(this.paper).addTools(toolsView);
        });
    }

    initializeNavigator() {

        this.navigatorService.create(this.paperScroller);
    }

    initializeToolbar() {

        this.toolbarService.create(this.commandManager, this.paperScroller, this.graph, this.paper);
    }

    applyOnSelection(method: string) {
        this.graph.startBatch('selection');
        this.selection.collection.models.forEach(function(model: joint.dia.Cell) { (model as any)[method](); });
        this.graph.stopBatch('selection');
    }

    changeSnapLines(checked: boolean) {

        if (checked) {
            this.snaplines.enable();
        } else {
            this.snaplines.disable();
        }
    }

    initializeKeyboardShortcuts() {

        this.keyboardService.create(
            this.graph, this.clipboard, this.selection, this.paperScroller, this.commandManager);
    }

    initializeTooltips() {

        this.tooltip = new joint.ui.Tooltip({
            rootTarget: document.body,
            target: '[data-tooltip]',
            direction: joint.ui.Tooltip.TooltipArrowPosition.Auto,
            padding: 12,
            animation: {
                delay: '250ms'
            }
        });
    }

    addPageBreaks() {
        const { paper, pageBreakSettings } = this;
        const { color, width, height } = pageBreakSettings;

        const pageBreaksVEl = joint.V('path', {
            stroke: color,
            fill: 'none',
            strokeDasharray: '5,5'
        });

        paper.layers.prepend(pageBreaksVEl.node);

        let lastArea: joint.g.Rect = null;

        function updatePageBreaks() {
            const area = paper.getArea();
            // Do not update if the area is the same
            if (area.equals(lastArea)) return;
            lastArea = area;
            let d = '';
            // Draw vertical lines
            // Do not draw the first and last lines
            for (let x = width; x < area.width; x += width) {
                d += `M ${area.x + x} ${area.y} v ${area.height}`;
            }
            // Draw horizontal lines
            // Do not draw the first and last lines
            for (let y = height; y < area.height; y += height) {
                d += ` M ${area.x} ${area.y + y} h ${area.width}`;
            }
            pageBreaksVEl.attr('d', d || null);
        }

        updatePageBreaks();

        paper.on('translate resize', updatePageBreaks);

        return () => {
            paper.off('translate resize', updatePageBreaks);
            pageBreaksVEl.remove();
        };
    }
}

export default KitchenSinkService;
