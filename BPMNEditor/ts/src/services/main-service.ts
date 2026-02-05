import type { g } from '@joint/plus';
import { dia, ui, shapes, highlighters } from '@joint/plus';
import { setupFileImport } from '../import';
import ViewController from '../controllers/view-controller';
import EditController from '../controllers/edit-controller';
import KeyboardController from '../controllers/keyboard-controller';
import type ToolbarService from './toolbar-service';
import type StencilService from './stencil-service';
import type NavigatorService from './navigator-service';
import type HaloService from './halo-service';
import type InspectorService from './inspector-service';
import type LinkToolsService from './link-tools-service';
import type FreeTransformService from './free-transform-service';
import type { AppShape } from '../shapes/shapes-typing';
import { ShapeTypes, type AppElement } from '../shapes/shapes-typing';
import { BPMNLinkView } from '../shapes/placeholder/placeholder-shapes';
import { LabelElementView } from '../shapes/shape-view';
import { canElementExistOutsidePool, getBoundaryPoint } from '../utils';
import { MAIN_COLOR } from '../configs/theme';

interface secondaryServices {
    toolbarService: ToolbarService;
    stencilService: StencilService;
    navigatorService: NavigatorService;
    haloService: HaloService;
    inspectorService: InspectorService;
    linkToolsService: LinkToolsService;
    freeTransformService: FreeTransformService;
}

export default class MainService {

    graph: dia.Graph;
    paper: dia.Paper;
    paperScroller: ui.PaperScroller;
    commandManager: dia.CommandManager;
    tooltip: ui.Tooltip;
    keyboard: ui.Keyboard;
    selection: ui.Selection;
    clipboard: ui.Clipboard;
    snaplines: ui.Snaplines;

    viewController: ViewController;
    editController: EditController;
    keyboardController: KeyboardController;

    cleanupFileImport: (() => void) | null = null;

    constructor(paperElement: HTMLDivElement, private readonly secondaryServices: secondaryServices) {

        this.graph = new dia.Graph({}, {
            cellNamespace: shapes
        });

        this.paper = new dia.Paper({
            model: this.graph,
            cellViewNamespace: shapes,
            gridSize: 10,
            sorting: dia.Paper.sorting.APPROX,
            width: 2000,
            height: 2000,
            async: true,
            frozen: true,
            snapLinks: true,
            drawGrid: true,
            background: { color: '#FDFDFD' },
            embeddingMode: true,
            markAvailable: true,
            clickThreshold: 10,
            labelsLayer: true,
            interactive: function(view) {
                const { model } = view;
                // Prevent swimlane move to pool/show ghost
                const isSwimlane = shapes.bpmn2.Swimlane.isSwimlane(model);

                let stopDelegation = true;

                if (isSwimlane) {
                    const pool = model.getParentCell() as shapes.bpmn2.CompositePool;
                    stopDelegation = pool.getSwimlanes().length > 1;
                }

                return {
                    stopDelegation,
                    labelMove: false
                };
            },
            findParentBy: (elementView, evt) => {
                const parentView = elementView.getTargetParentView(evt);
                // Enable easier snapping for boundary elements by bbox
                const useBBox = !parentView || (parentView && !shapes.bpmn2.Swimlane.isSwimlane(parentView.model));
                const searchBy = useBBox ? 'bbox' : 'center';

                return this.graph.findElementsUnderElement(elementView.model, { searchBy });
            },
            highlighting: {
                [dia.CellView.Highlighting.CONNECTING]: {
                    name: 'stroke',
                    options: {
                        padding: 0,
                        attrs: {
                            stroke: MAIN_COLOR,
                            strokeWidth: 3
                        }
                    }
                },
                // Handled separately in ViewController
                [dia.CellView.Highlighting.EMBEDDING]: false
            },
            defaultAnchor: (endView: dia.ElementView, endMagnet: SVGElement, anchorReference: g.Point | SVGElement, _args: object) => {
                let reference = anchorReference;

                if (reference instanceof SVGElement) {
                    const refBBox = reference.getBoundingClientRect();
                    const cx = refBBox.x + refBBox.width / 2;
                    const cy = refBBox.y + refBBox.height / 2;

                    reference = this.paper.clientToLocalPoint({ x: cx, y: cy });
                }

                const bbox = endView.model.getBBox();
                const closestSide = bbox.sideNearestToPoint(reference);

                switch (closestSide) {
                    case 'top':
                        return bbox.topMiddle();
                    case 'right':
                        return bbox.rightMiddle();
                    case 'bottom':
                        return bbox.bottomMiddle();
                    case 'left':
                        return bbox.leftMiddle();
                }
            },
            connectionStrategy: function(end, view, _, coords) {

                const { model } = view;

                if (model.isElement()) {
                    const { x, y } = getBoundaryPoint(view.model as AppElement, coords);

                    end.anchor = {
                        name: 'topLeft',
                        args: {
                            dx: x,
                            dy: y
                        }
                    };
                } else {
                    end.anchor = {
                        name: 'connectionLength',
                        args: {
                            length: (view as dia.LinkView).getClosestPointLength(coords)
                        }
                    };
                }

                return end;
            },
            elementView: LabelElementView as typeof dia.ElementView,
            linkView: BPMNLinkView as typeof dia.LinkView,
            validateConnection: (sourceView, _, targetView) => {
                const source = sourceView.model;
                const target = targetView.model;

                return (source as AppShape).validateConnection(target);
            },
            allowLink: (cellView) => {
                // Link has source and target elements
                return !!(cellView.model.source().id) && !!(cellView.model.target().id);
            },
            validateEmbedding: (childView, parentView) => {
                const child = childView.model as AppElement;

                return child.validateEmbedding(parentView.model, childView?.paper?.model === this.graph);
            },
            validateUnembedding: (childView) => {
                const isPoolPresent = this.graph.getElements().some(element => element.get('shapeType') === ShapeTypes.POOL);

                const child = childView.model as AppElement;

                // If there is a pool present, only allow unembedding of elements that are valid outside of pools
                if (isPoolPresent && !canElementExistOutsidePool(child) && !shapes.bpmn2.Swimlane.isSwimlane(child)) return false;

                return !(child.validateUnembedding) || child.validateUnembedding();
            }
        });

        this.paperScroller = new ui.PaperScroller({
            paper: this.paper,
            autoResizePaper: true,
            cursor: 'grab',
            width: 2000,
            height: 2000,
            contentOptions: {
                allowNewOrigin: 'any',
                padding: 50
            }
        });

        this.commandManager = new dia.CommandManager({
            graph: this.graph,
            cmdBeforeAdd: (_cmdName, _cell, _value, { ignoreHistory } = { ignoreHistory: false }) => {
                return !ignoreHistory;
            }
        });

        this.tooltip = new ui.Tooltip({
            rootTarget: document.body,
            target: '[data-tooltip]',
            direction: ui.Tooltip.TooltipArrowPosition.Auto,
            padding: 12,
            animation: {
                delay: '250ms'
            }
        });

        this.keyboard = new ui.Keyboard();

        this.clipboard = new ui.Clipboard();

        this.selection = new ui.Selection({
            boxContent: null,
            paper: this.paperScroller,
            useModelGeometry: true,
            allowCellInteraction: true,
            handles: [
                {
                    name: 'rotate',
                    position: ui.Selection.HandlePosition.SW,
                    events: {
                        pointerdown: 'startRotating',
                        pointermove: 'doRotate',
                        pointerup: 'stopBatch'
                    }
                },
                {
                    name: 'resize',
                    position: ui.Selection.HandlePosition.SE,
                    events: {
                        pointerdown: 'startResizing',
                        pointermove: 'doResize',
                        pointerup: 'stopBatch'
                    }
                }
            ],
            wrapper: new ui.HTMLSelectionWrapper({
                margin: 8,
                visibility(selection) {
                    return selection.collection.length > 1;
                },
                style: {
                    border: `1px solid ${MAIN_COLOR}`
                }
            }),
            frames: new ui.HighlighterSelectionFrameList({
                highlighter: highlighters.mask,
                selector(cell, _frameList) {
                    return cell.isElement() ? cell.attr(['root', 'highlighterSelector']) : null;
                },
                options: (cell, _frameList) => {
                    const defaultOptions: dia.HighlighterView.Options = {
                        padding: 2,
                        attrs: {
                            stroke: MAIN_COLOR,
                            strokeWidth: 2,
                        }
                    };

                    if (shapes.bpmn2.Swimlane.isSwimlane(cell)) {
                        defaultOptions.layer = dia.Paper.Layers.FRONT;
                    }

                    return defaultOptions;
                }
            })
        });

        this.snaplines = new ui.Snaplines({
            paper: this.paper,
            canSnap: (elementView) => {
                // Do not snap pools, swimlanes and boundary events
                const model = elementView.model;
                return !shapes.bpmn2.Swimlane.isSwimlane(model)
                    && !shapes.bpmn2.CompositePool.isPool(model)
                    && !(model instanceof shapes.event.IntermediateBoundary);
            }
        });

        this.viewController = new ViewController({
            paper: this.paper,
            paperScroller: this.paperScroller,
            selection: this.selection,
            keyboard: this.keyboard,
            inspectorService: this.secondaryServices.inspectorService
        });

        this.editController = new EditController({
            graph: this.graph,
            paper: this.paper,
            selection: this.selection,
            haloService: this.secondaryServices.haloService,
            inspectorService: this.secondaryServices.inspectorService,
            linkToolsService: this.secondaryServices.linkToolsService,
            freeTransformService: this.secondaryServices.freeTransformService,
            keyboard: this.keyboard
        });

        this.keyboardController = new KeyboardController({
            graph: this.graph,
            paper: this.paper,
            paperScroller: this.paperScroller,
            keyboard: this.keyboard,
            selection: this.selection,
            commandManager: this.commandManager,
            clipboard: this.clipboard
        });

        paperElement.appendChild(this.paperScroller.render().el);

        this.createServices();
    }

    createServices() {
        const { toolbarService, stencilService, navigatorService } = this.secondaryServices;

        toolbarService.create(this.paper, this.paperScroller, this.commandManager);
        stencilService.create(this.paperScroller, this.selection, this.snaplines);
        navigatorService.create(this.paperScroller);
    }

    start() {
        this.paper.unfreeze();
        this.viewController.startListening();
        this.editController.startListening();
        this.keyboardController.startListening();
        // Setup drag and drop file import
        this.cleanupFileImport = setupFileImport(this.paperScroller, this.commandManager);
    }

    stop() {
        this.paper.freeze();
        this.viewController.stopListening();
        this.editController.stopListening();
        this.keyboardController.stopListening();

        // Clean up the file import event listeners
        if (this.cleanupFileImport) {
            this.cleanupFileImport();
            this.cleanupFileImport = null;
        }
    }
}
