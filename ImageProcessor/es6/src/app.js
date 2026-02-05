import { anchors, connectors, dia, highlighters, shapes, ui } from '@joint/plus';
import { StencilService } from './stencil/stencil-service';
import { Processor } from './processor/processor';
import { Connection } from './connection/connection';
import { Node, NodeView } from './nodes/node';
import { createNodeShape } from './nodes/node-helper';
import { Display, DisplayView } from './nodes/basic/display';
import { TextInput, TextInputView } from './nodes/inputs/text-input';
import { Grayscale } from './nodes/filters/grayscale';
import { Blur } from './nodes/filters/blur';
import { NumberInput, NumberInputView } from './nodes/inputs/number-input';
import { InspectorService } from './inspector/inspector-service';
import { ToolbarService } from './toolbar/toolbar-service';
import * as joint from '@joint/plus';
import { Upload, UploadView } from './nodes/basic/upload-image';
import { Invert } from './nodes/filters/invert';
import { Sepia } from './nodes/filters/sepia';
import { BooleanInput, BooleanInputView } from './nodes/inputs/boolean-input';
import { Mirror } from './nodes/transform/mirror';
import * as cv from '@techstark/opencv-js';
import { CVService } from './cv/cv-service';
import { Blend } from './nodes/transform/blend';
import { Clip } from './nodes/transform/clip';
import { Resize } from './nodes/transform/resize';
import { Crop } from './nodes/transform/crop';
import { ColorInput, ColorInputView } from './nodes/inputs/color-input';
import { Tint } from './nodes/filters/tint';
import { Properties } from './nodes/basic/properties';
import { Overlay } from './nodes/transform/overlay';
import { loadExample } from './file/file';
import { Threshold } from './nodes/transform/threshold';
import { Addition } from './nodes/math/addition';
import { Multiplication } from './nodes/math/multiplication';
import { Division } from './nodes/math/division';
import { Subtraction } from './nodes/math/subtraction';
import { FillContours } from './nodes/transform/fill-contours';
import { NavigatorService } from './navigator/navigator-service';

joint.setTheme('light');

export const zoomSettings = {
    min: 0.2,
    max: 5
};
export class App {
    
    constructor() {
        
        this.appShapes = Object.assign({ processor: {
                Node,
                NodeView,
                Display,
                DisplayView,
                TextInput,
                TextInputView,
                Grayscale,
                NumberInput,
                NumberInputView,
                Blur,
                Upload,
                UploadView,
                Invert,
                Sepia,
                BooleanInput,
                BooleanInputView,
                Mirror,
                Blend,
                Clip,
                Resize,
                Crop,
                ColorInput,
                ColorInputView,
                Tint,
                Properties,
                Overlay,
                Addition,
                Multiplication,
                Division,
                Subtraction,
                Threshold,
                FillContours
            } }, shapes);
        this.paperElement = document.querySelector('.paper-container');
        this.stencilElement = document.querySelector('.stencil-container');
        this.toolbarElement = document.querySelector('.toolbar-container');
        this.inspectorElement = document.querySelector('.inspector-container');
        this.navigatorElement = document.querySelector('.navigator-container');
        
        this.graph = new dia.Graph({}, { cellNamespace: this.appShapes });
        
        App.processor = new Processor(this.graph);
        
        this.paper = new dia.Paper({
            model: this.graph,
            gridSize: 10,
            background: { color: 'transparent' },
            moveThreshold: 5,
            clickThreshold: 10,
            magnetThreshold: 'onleave',
            drawGrid: true,
            drawGridSize: 10,
            async: true,
            sorting: dia.Paper.sorting.APPROX,
            cellViewNamespace: this.appShapes,
            linkPinning: false,
            snapLinks: { radius: 10 },
            validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet) => {
                if (!targetMagnet)
                    return false;
                if (sourceView === targetView)
                    return false;
                
                const targetGroup = targetView.findAttribute('port-group', targetMagnet);
                const sourceGroup = sourceView.findAttribute('port-group', sourceMagnet);
                
                if (targetGroup === sourceGroup)
                    return false;
                
                const sourcePort = sourceView.findAttribute('port', sourceMagnet);
                const targetPort = targetView.findAttribute('port', targetMagnet);
                
                const sourceConnectedLinks = this.graph.getConnectedLinks(sourceView.model).filter(link => link.source().port === sourcePort || link.target().port === sourcePort);
                const targetConnectedLinks = this.graph.getConnectedLinks(targetView.model).filter(link => link.source().port === targetPort || link.target().port === targetPort);
                
                if (sourceConnectedLinks.some(l => targetConnectedLinks.includes(l)))
                    return false;
                
                return true;
            },
            defaultLink: (_cellView, magnet) => {
                const sourceDirection = magnet.getAttribute('port-group') === 'out' ?
                    connectors.curve.TangentDirections.RIGHT : connectors.curve.TangentDirections.LEFT;
                
                const targetDirection = sourceDirection === connectors.curve.TangentDirections.LEFT ?
                    connectors.curve.TangentDirections.RIGHT : connectors.curve.TangentDirections.LEFT;
                
                const link = new this.appShapes.standard.Link({
                    z: 0,
                    connectionSource: null,
                    connectionTarget: null,
                    attrs: {
                        line: {
                            strokeWidth: 3,
                            targetMarker: null,
                        }
                    },
                    connector: {
                        name: 'curve',
                        args: {
                            direction: connectors.curve.Directions.HORIZONTAL,
                            targetDirection: targetDirection === connectors.curve.TangentDirections.RIGHT ? { x: 1, y: 0 } : targetDirection,
                            sourceDirection: sourceDirection
                        }
                    }
                });
                
                return link;
            },
            defaultConnectionPoint: { name: 'anchor' },
            defaultAnchor: (view, magnet, ...rest) => {
                const group = view.findAttribute('port-group', magnet);
                const anchorFn = group === 'in' ? anchors.left : anchors.right;
                return anchorFn(view, magnet, ...rest);
            },
            elementView: NodeView
        });
        
        this.scroller = new ui.PaperScroller({
            paper: this.paper,
            autoResizePaper: true,
            contentOptions: {
                padding: 100,
                allowNewOrigin: 'any',
                allowNegativeBottomRight: true,
                useModelGeometry: true
            },
            scrollWhileDragging: true,
            cursor: 'grab',
            baseWidth: 1000,
            baseHeight: 1000
        });
        this.paperElement.appendChild(this.scroller.el);
        this.scroller.render().center();
        
        const commands = ['change:position', 'remove', 'add'];
        
        this.cmd = new dia.CommandManager({
            graph: this.graph,
            cmdBeforeAdd: (cmdName, _cell, _graph, options = {}) => {
                if (options.inspector || options.input)
                    return true;
                
                if (options.file)
                    return false;
                
                if (commands.includes(cmdName)) {
                    return true;
                }
                
                return false;
            }
        });
        
        this.stencilService = new StencilService(this.stencilElement, this.scroller, this.appShapes);
        
        App.inspectorService = new InspectorService(this.inspectorElement);
        
        this.toolbarService = new ToolbarService(this.toolbarElement, this.cmd, this.graph);
        
        this.navigatorService = new NavigatorService(this.navigatorElement, this.scroller);
        
        this.clipboard = new ui.Clipboard();
        
        this.selection = new ui.Selection({
            paper: this.paper,
            useModelGeometry: true,
            boxContent: false,
            allowCellInteraction: true
        });
        
        const onSelectionChange = () => {
            App.inspectorService.close();
            
            const collection = this.selection.collection;
            
            if (collection.length === 1) {
                const primaryCell = collection.first();
                if (primaryCell.isElement()) {
                    App.inspectorService.open(primaryCell);
                }
            }
        };
        
        this.selection.collection.on('reset add remove', () => onSelectionChange());
        
        this.selection.removeHandle('resize');
        this.selection.removeHandle('rotate');
        
        this.keyboard = new ui.Keyboard();
        
        this.setInteractivity();
        this.setContextToolbar();
        
        cv.onRuntimeInitialized = () => {
            App.cvService = new CVService(() => {
                loadExample(this.graph, 'token-generator').then(() => {
                    this.cmd.reset();
                });
            });
        };
    }
    
    setInteractivity() {
        const { paper, graph, keyboard, scroller, selection, cmd, clipboard } = this;
        
        let cellViewStack = [];
        
        const currentCellView = () => {
            if (cellViewStack[0]) {
                return cellViewStack[0];
            }
            return null;
        };
        
        const onElementHover = (elementView) => {
            if (elementView instanceof NodeView) {
                elementView.el.classList.add('node-hover');
            }
            return;
        };
        
        const onElementHoverEnd = (elementView) => {
            if (elementView instanceof NodeView) {
                elementView.el.classList.remove('node-hover');
            }
            return;
        };
        
        const onLinkHover = (linkView) => {
            linkView.el.classList.add('connection-hover');
        };
        
        const onLinkHoverEnd = (linkView) => {
            linkView.el.classList.remove('connection-hover');
        };
        
        this.keyboard.on({
            'ctrl+c': function () {
                clipboard.copyElements(selection.collection, graph);
            },
            'ctrl+v': function () {
                const pastedCells = clipboard.pasteCells(graph);
                
                const elements = pastedCells.filter(cell => cell.isElement());
                
                selection.collection.reset(elements);
            },
            'delete backspace': (_evt) => {
                if (selection.collection.length) {
                    this.graph.removeCells(selection.collection.toArray());
                }
            },
            'ctrl+z': function () {
                cmd.undo();
                selection.collection.reset([]);
            },
            'ctrl+y': function () {
                cmd.redo();
                selection.collection.reset([]);
            },
        });
        
        paper.on('paper:pinch', (evt, ox, oy, scale) => {
            evt.preventDefault();
            scroller.zoom(scale - 1, { min: zoomSettings.min, max: zoomSettings.max, ox, oy });
        });
        
        paper.on('paper:pan', (evt, tx, ty) => {
            evt.preventDefault();
            scroller.el.scrollLeft += tx;
            scroller.el.scrollTop += ty;
        });
        
        paper.on('cell:mouseenter', (cellView, _evt) => {
            const current = currentCellView();
            if (current) {
                if (current.model.isElement()) {
                    onElementHoverEnd(current);
                }
                
                if (current.model.isLink()) {
                    onLinkHoverEnd(current);
                }
            }
            
            cellViewStack.push(cellView);
            
            if (cellView.model.isElement()) {
                onElementHover(cellView);
            }
            
            if (cellView.model.isLink()) {
                onLinkHover(cellView);
            }
        });
        
        paper.on('cell:mouseleave', (cellView, _evt) => {
            if (cellView.model.isElement()) {
                onElementHoverEnd(cellView);
            }
            
            if (cellView.model.isLink()) {
                onLinkHoverEnd(cellView);
            }
            
            cellViewStack = cellViewStack.filter(cv => cv !== cellView);
            const current = currentCellView();
            if (current) {
                if (current.model.isElement()) {
                    onElementHover(current);
                }
                
                if (current.model.isLink()) {
                    onLinkHover(current);
                }
            }
        });
        
        this.paper.on('blank:pointerdown', (evt) => {
            if (keyboard.isActive('shift', evt)) {
                selection.startSelecting(evt);
                document.activeElement.blur();
            }
            else {
                selection.collection.reset([]);
                document.activeElement.blur();
                scroller.startPanning(evt);
                paper.removeTools();
            }
        });
        
        // Initiate selecting when the user grabs a cell while shift is pressed.
        paper.on('cell:pointerdown', (cellView, evt) => {
            if (keyboard.isActive('shift', evt)) {
                cellView.preventDefaultInteraction(evt);
                selection.startSelecting(evt);
                return;
            }
        });
        
        paper.on('cell:pointerclick', (cellView, evt) => {
            if (evt.target.tagName === 'INPUT') {
                return;
            }
            selection.collection.reset([cellView.model]);
        });
        
        // Create Connection for the processor when the link is connected
        paper.on('link:connect', (linkView) => {
            var _a;
            
            const source = linkView.model.source();
            const target = linkView.model.target();
            
            const sourceModel = linkView.model.getSourceElement();
            const targetModel = linkView.model.getTargetElement();
            
            const sourceView = paper.findViewByModel(sourceModel);
            const targetView = paper.findViewByModel(targetModel);
            
            const sourceMagnet = sourceView.findPortNode(source.port);
            const targetMagnet = targetView.findPortNode(target.port);
            const targetGroup = targetMagnet.getAttribute('port-group');
            
            let inputIndex;
            let outputIndex;
            let inputNode;
            let outputNode;
            if (targetGroup === 'in') {
                inputNode = targetModel;
                outputNode = sourceModel;
                
                inputIndex = Number(targetMagnet.getAttribute('port-index'));
                outputIndex = Number(sourceMagnet.getAttribute('port-index'));
            }
            else {
                inputNode = sourceModel;
                outputNode = targetModel;
                
                inputIndex = Number(sourceMagnet.getAttribute('port-index'));
                outputIndex = Number(targetMagnet.getAttribute('port-index'));
            }
            
            const connectionSource = {
                nodeId: outputNode.id,
                outputIndex: outputIndex
            };
            const connectionTarget = {
                nodeId: inputNode.id,
                inputIndex: inputIndex
            };
            
            const existingConnection = (_a = App.processor.inboundConnections[connectionTarget.nodeId]) === null || _a === void 0 ? void 0 : _a.find(c => c.target.inputIndex === connectionTarget.inputIndex);
            if (existingConnection) {
                graph.removeCells([existingConnection.linkModel]);
            }
            
            const newLink = linkView.model.clone();
            const connection = new Connection(newLink, connectionSource, connectionTarget);
            
            newLink.set('connectionSource', connectionSource);
            newLink.set('connectionTarget', connectionTarget);
            
            linkView.model.remove();
            newLink.addTo(graph);
            
            const error = App.processor.addConnection(connection);
            if (error === 'type-error') {
                highlighters.addClass.add(paper.findViewByModel(newLink), 'line', 'hgl-connection-error', { className: 'connection-error' });
            }
        });
        
        scroller.el.addEventListener('dragover', (evt) => {
            evt.preventDefault();
        });
        scroller.el.addEventListener('dragenter', (evt) => {
            evt.preventDefault();
            scroller.el.classList.add('drag-n-drop');
        });
        scroller.el.addEventListener('dragleave', (evt) => {
            evt.preventDefault();
            scroller.el.classList.remove('drag-n-drop');
        });
        scroller.el.addEventListener('drop', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            
            const shift = 100;
            let { x, y } = paper.clientToLocalPoint(evt.clientX, evt.clientY);
            
            const files = Array.from(evt.dataTransfer.files);
            
            files.forEach((file, i) => {
                const imageURL = URL.createObjectURL(file);
                
                const upload = createNodeShape(new Upload());
                upload.position(x, y + shift * i);
                upload.setProperty('url', imageURL);
                
                this.graph.addCell(upload);
                App.processor.process(upload.id);
            });
        });
    }
    
    setContextToolbar() {
        this.paper.on('blank:contextmenu', (evt) => {
            render({ x: evt.clientX, y: evt.clientY });
        });
        
        this.paper.on('cell:contextmenu', (cellView, evt) => {
            if (cellView.model.isLink()) {
                render({ x: evt.clientX, y: evt.clientY });
                return;
            }
            
            if (this.selection.collection.length) {
                render({ x: evt.clientX, y: evt.clientY }, this.selection.collection.toArray());
            }
            else {
                render({ x: evt.clientX, y: evt.clientY }, [cellView.model]);
            }
        });
        
        const render = (point, cells = []) => {
            this.selection.collection.reset(cells);
            
            let tools = [
                {
                    action: 'copy',
                    content: 'Copy',
                    attrs: {
                        'disabled': cells.length === 0
                    }
                },
                {
                    action: 'paste',
                    content: 'Paste',
                    attrs: {
                        'disabled': this.clipboard.isEmpty()
                    }
                },
                {
                    action: 'sendToFront',
                    content: 'Send To Front',
                    attrs: {
                        'disabled': cells.length === 0
                    }
                },
                {
                    action: 'sendToBack',
                    content: 'Send To Back',
                    attrs: {
                        'disabled': cells.length === 0
                    }
                }
            ];
            
            let contextToolbar;
            let node;
            
            if (cells.length === 1) {
                node = cells[0];
                tools = tools.concat(node.getContextToolbarItems());
            }
            
            contextToolbar = new ui.ContextToolbar({
                target: point,
                root: this.paper.el,
                padding: 0,
                vertical: true,
                anchor: 'top-left',
                tools: tools
            });
            
            if (node) {
                node.setContextToolbarEvents(contextToolbar);
            }
            
            contextToolbar.on('action:copy', () => {
                contextToolbar.remove();
                
                this.clipboard.copyElements(cells, this.graph);
            });
            
            contextToolbar.on('action:paste', () => {
                contextToolbar.remove();
                const pastedCells = this.clipboard.pasteCellsAtPoint(this.graph, this.paper.clientToLocalPoint(point));
                
                const elements = pastedCells.filter(cell => cell.isElement());
                
                // Make sure pasted elements get selected immediately. This makes the UX better as
                // the user can immediately manipulate the pasted elements.
                this.selection.collection.reset(elements);
            });
            
            contextToolbar.on('action:sendToFront', () => {
                contextToolbar.remove();
                
                cells.forEach(c => c.toFront());
            });
            
            contextToolbar.on('action:sendToBack', () => {
                contextToolbar.remove();
                
                cells.forEach(c => c.toBack());
            });
            contextToolbar.render();
        };
    }
}
