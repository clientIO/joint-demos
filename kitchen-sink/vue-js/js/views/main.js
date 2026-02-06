/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

var App = window.App || {};

const ZOOM_SETTINGS = {
    min: 0.2,
    max: 2
};
const HIGHLIGHT_COLOR = '#F4F7FB';

(function(joint, config) {

    'use strict';

    App.MainView = joint.mvc.View.extend({

        className: 'app',

        events: {
            'mouseup input[type="range"]': 'removeTargetFocus',
            'mousedown': 'removeFocus',
            'touchstart': 'removeFocus'
        },

        pageBreakSettings: {
            color: '#353535',
            width: 1000,
            height: 1000
        },

        defaultPaperSize: {
            width: 1000,
            height: 1000
        },

        init() {
            this.initializePaper();
            this.initializeStencil();
            this.initializeNavigator();
            this.initializeKeyboardShortcuts();
            this.initializeSelection();
            this.initializeToolbar();
            this.initializeTooltips();
            this.initializeTools();
            this.initializeInspector();
        },

        changeSnapLines(checked) {

            if (checked) {
                this.snaplines.enable();
            } else {
                this.snaplines.disable();
            }
        },

        // Create a graph, paper and wrap the paper in a PaperScroller.
        initializePaper() {

            const graph = this.graph = new joint.dia.Graph({}, {
                cellNamespace: joint.shapes
            });

            this.commandManager = new joint.dia.CommandManager({
                graph: graph,
                cmdBeforeAdd: (cmdName, _cellView, _value, { ignoreUndoRedo } = { ignoreUndoRedo: false }) => {
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
                cellViewNamespace: joint.shapes,
                defaultLink: new joint.shapes.app.Link(),
                defaultConnectionPoint: joint.shapes.app.Link.connectionPoint,
                routerNamespace: {
                    'normal': joint.routers.normal,
                    'orthogonal': joint.routers.orthogonal,
                    // Redefine the rightAngle router to use vertices.
                    'rightAngle': function(vertices, opt, linkView) {
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

            const paperContainer = document.querySelector('.paper-container');
            let removePageBreaks = null;

            graph.on({
                'change:paperColor': (_, color) => paper.drawBackground({ color }),
                'change:infinitePaper': (_, borderless) => {
                    const { options } = paperScroller;

                    if (borderless) {
                        options.borderless = true;
                        options.baseWidth = 100;
                        options.baseHeight = 100;

                        if (removePageBreaks) removePageBreaks();

                        paperContainer.classList.remove('bordered');
                    } else {
                        const { width: paperWidth, height: paperHeight } = this.defaultPaperSize;

                        options.borderless = false;
                        options.baseWidth = paperWidth;
                        options.baseHeight = paperHeight;

                        removePageBreaks = this.addPageBreaks();

                        paperContainer.classList.add('bordered');
                    }

                    paperScroller.adjustPaper();
                },
                'change:dotGrid': (_, showDotGrid) => paper.setGrid(showDotGrid),
                'change:snaplines': (_, allowSnaplines) => this.changeSnapLines(allowSnaplines),
                'change:gridSize': (_, gridSize) => paper.setGridSize(gridSize),
            });

            paperContainer.appendChild(paperScroller.el);
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
        },

        // Create and populate stencil.
        initializeStencil() {
            const tooltipGraph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
            const tooltipPaper = new joint.dia.Paper({
                model: tooltipGraph,
                cellViewNamespace: joint.shapes,
                width: 140,
                height: 120,
                async: true,
                autoFreeze: true,
                overflow: true,
                sorting: joint.dia.Paper.sorting.NONE
            });

            function createFromStencilElement(el) {
                const clone = el.clone();

                clone.prop(clone.get('targetAttributes'));
                clone.removeProp('targetAttributes');

                return clone;
            }

            function buildTooltipContent(cell) {
                // Add a copy of the cell to the tooltip graph
                // Note: We don't have to care about the position of the cell
                // because the tooltip paper will be transformed to fit the cell
                tooltipGraph.resetCells([cell.clone()]);

                const shapeNameEl = document.createElement('span');
                shapeNameEl.append(document.createTextNode(cell.get('name')));

                const documentFragment = document.createDocumentFragment();
                documentFragment.append(tooltipPaper.el, shapeNameEl);

                tooltipPaper.transformToFitContent({
                    padding: 5,
                    contentArea: cell.getBBox(),
                    verticalAlign: 'middle',
                    horizontalAlign: 'middle'
                });

                return documentFragment;
            }

            const stencilContainer = this.el.querySelector('.stencil-container');

            const stencil = this.stencil = new joint.ui.Stencil({
                paper: this.paperScroller,
                snaplines: this.snaplines,
                width: 240,
                height: null,
                // Define groups
                groups: config.stencil.groups,
                dropAnimation: true,
                groupsToggleButtons: true,
                paperOptions: function() {
                    return {
                        model: new joint.dia.Graph({}, {
                            cellNamespace: joint.shapes
                        }),
                        cellViewNamespace: joint.shapes
                    };
                },
                search: {
                    '*': ['type', 'name']
                },
                layout: {
                    columns: 4,
                    marginX: 10,
                    marginY: 24,
                    columnGap: 20,
                    rowGap: 24,
                    rowHeight: 24,
                    columnWidth: 36,
                    resizeToFit: true
                },
                dragStartClone: (cell) => {
                    const clone = createFromStencilElement(cell);
                    clone.attr({
                        label: {
                            text: cell.get('name')
                        }
                    });
                    clone.unset('name');
                    return clone;
                },
                el: stencilContainer
            });

            stencil.render();
            // Edit `js/config/stencil.js` in order to change stencil groups and shapes
            // populate stencil with elements
            stencil.load(config.stencil.shapes);

            const shapeTooltip = new joint.ui.Tooltip({
                target: '[model-id]',
                rootTarget: stencil.el,
                // Tooltip container denotes the area where the tooltip can be shown
                // It's adding a padding on the top and the bottom of the paper area.
                container: stencilContainer,
                content: (el) => {

                    const groups = Object.keys(config.stencil.groups);

                    const graphs = groups.map(group => this.stencil.getGraph(group));
                    let stencilElement = null;

                    for (const graph of graphs) {
                        const foundElement = graph.getCell(el.getAttribute('model-id'));
                        if (!foundElement) continue;

                        stencilElement = foundElement;
                    }

                    if (!stencilElement) {
                    // The element should be always found
                        return false;
                    }

                    return buildTooltipContent(createFromStencilElement(stencilElement));
                },
                position: 'left',
                positionSelector: '.stencil-container',
                padding: 10,
                animation: {
                    duration: '250ms'
                }
            });

            this.stencil.on({
                'group:element:mouseenter': (_, elementView) => {
                    App.StencilBackground.add(elementView, 'root', 'stencil-highlight', {
                        padding: 4,
                        width: 36,
                        height: 36,
                        color: HIGHLIGHT_COLOR
                    });
                },
                'group:element:mouseleave': (groupPaper) => {
                    App.StencilBackground.removeAll(groupPaper);
                },
                // Remove all highlights when the user starts dragging an element
                'group:element:pointerdown': (groupPaper) => {
                    App.StencilBackground.removeAll(groupPaper);
                }
            });

            stencil.on({
                // We need to track the dragging state to prevent showing the tooltip when dragging an element
                'element:dragstart': () => {
                    shapeTooltip.disable();
                    this.tooltip.disable();
                },
                'element:dragend': () => {
                    shapeTooltip.enable();
                    this.tooltip.enable();
                },
                'element:drop': (elementView) => this.selection.collection.reset([elementView.model]),
            });
        },

        initializeSelection() {
            this.clipboard = new joint.ui.Clipboard();
            // Edit `config/selection.js` to add/remove selection handles
            this.selection = new joint.ui.Selection({
                boxContent: null,
                paper: this.paperScroller,
                useModelGeometry: true,
                translateConnectedLinks: joint.ui.Selection.ConnectedLinksTranslation.SUBGRAPH,
                handles: config.selection.handles,
                frames: new joint.ui.HTMLSelectionFrameList({
                    rotate: true
                })
            });

            this.selection.collection.on('reset add remove', () => this.onSelectionChange());

            // Initiate selecting when the user grabs the blank area of the paper while the Shift key is pressed.
            // Otherwise, initiate paper pan.
            this.paper.on('blank:pointerdown', (evt, _x, _y) => {

                if (this.keyboard.isActive('shift', evt)) {
                    this.selection.startSelecting(evt);
                } else {
                    this.selection.collection.reset([]);
                    this.paperScroller.startPanning(evt);
                    this.paper.removeTools();
                }
            });

            // Initiate selecting when the user grabs a cell while shift is pressed.
            this.paper.on('cell:pointerdown element:magnet:pointerdown', (cellView, evt) => {

                if (this.keyboard.isActive('shift', evt)) {
                    cellView.preventDefaultInteraction(evt);
                    this.selection.startSelecting(evt);
                }

            });

            this.paper.on('element:pointerdown', (elementView, evt) => {

                // Select an element if CTRL/Meta key is pressed while the element is clicked.
                if (this.keyboard.isActive('ctrl meta', evt)) {
                    this.selection.collection.add(elementView.model);
                }

            });

            this.graph.on('remove', (cell) => {

                // If element is removed from the graph, remove from the selection too.
                if (this.selection.collection.has(cell)) {
                    this.selection.collection.reset(this.selection.collection.models.filter(c => c !== cell));
                }

            });

            this.selection.on('selection-box:pointerdown', (elementView, evt) => {

                // Unselect an element if the CTRL/Meta key is pressed while a selected element is clicked.
                if (this.keyboard.isActive('ctrl meta', evt)) {
                    this.selection.collection.remove(elementView.model);
                }

            }, this);

            this.selection.on('selection-box:pointerup', (_, evt) => {
                if (evt.button === 2) {
                    evt.stopPropagation();
                    this.renderContextToolbar({ x: evt.clientX, y: evt.clientY }, this.selection.collection.toArray());
                }

            }, this);
        },

        initializeNavigator() {

            const element = document.querySelector('.navigator-container');
            const navigatorBaseUrl = 'assets/navigator';
            let transitionCanceled = false;

            const navigator = this.navigator = new joint.ui.Navigator({
                paperScroller: this.paperScroller,
                width: 340,
                height: 130,
                padding: 10,
                zoom: false,
                useContentBBox: true,
                paperOptions: {
                    async: true,
                    autoFreeze: true,
                    sorting: joint.dia.Paper.sorting.APPROX,
                    elementView: joint.shapes.app.NavigatorElementView,
                    cellViewNamespace: {},
                    viewManagement: {
                        disposeHidden: true,
                    },
                    // Don't render links in the navigator
                    cellVisibility: (cell) => !cell.isLink(),
                    background: {
                        color: 'transparent'
                    }
                }
            });

            function isMinimapVisible() {
                return !navigator.el.classList.contains('hidden');
            }

            function fitToScreen() {
                this.paperScroller.zoomToFit({ useModelGeometry: true, padding: 20 });
            }

            function toggleFullscreen() {
                const fullScreenEl = navigatorToolbar.getWidgetByName('fullscreen').el;

                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                    fullScreenEl.classList.add('active');
                } else if (document.exitFullscreen) {
                    document.exitFullscreen();
                    fullScreenEl.classList.remove('active');
                }
            }

            function showMinimap() {
                navigator.el.classList.remove('hidden');
                transitionCanceled = false;
            }

            function hideMiniMap() {
                navigator.el.classList.add('hidden');
            }

            function toggleMinimap() {
                const minimapEl = navigatorToolbar.getWidgetByName('minimap').el;

                if (isMinimapVisible()) {
                    hideMiniMap();
                    minimapEl.classList.remove('active');
                } else {
                    showMinimap();
                    minimapEl.classList.add('active');
                }
                updateToolbarButtons();
            }

            function updateToolbarButtons() {
                // Minimap
                const minimapButton = navigatorToolbar.getWidgetByName('minimap');
                if (isMinimapVisible()) {
                    minimapButton.setTooltip('Hide minimap');
                } else {
                    minimapButton.setTooltip('Show minimap');
                }
                // Full screen
                const fullscreenButton = navigatorToolbar.getWidgetByName('fullscreen');
                if (document.fullscreenElement) {
                    fullscreenButton.setIcon(`${navigatorBaseUrl}/exit-fullscreen.svg`);
                    fullscreenButton.setTooltip('Exit full screen');
                } else {
                    fullscreenButton.setIcon(`${navigatorBaseUrl}/request-fullscreen.svg`);
                    fullscreenButton.setTooltip('Toggle full screen');
                }
            }

            const navigatorToolbar = new joint.ui.Toolbar({
                autoToggle: true,
                references: {
                    paperScroller: this.paperScroller
                },
                tools: [
                    {
                        type: 'icon-button',
                        name: 'fullscreen'
                        /* icon and tooltip are set in updateToolbarButtons() */
                    },
                    {
                        type: 'icon-button',
                        name: 'fit-to-screen',
                        icon: `${navigatorBaseUrl}/fit-to-screen.svg`,
                        tooltip: 'Fit to screen'
                    },
                    {
                        type: 'zoom-slider',
                        min: ZOOM_SETTINGS.min * 100,
                        max: ZOOM_SETTINGS.max * 100,
                        step: 10,
                        attrs: { input: { 'data-tooltip': 'Slide to zoom' }}
                    },
                    { type: 'separator' },
                    {
                        type: 'icon-button',
                        name: 'minimap',
                        icon: `${navigatorBaseUrl}/minimap.svg`,
                    }
                ],
                widgetNamespace: joint.ui.widgets
            });

            navigatorToolbar.render();
            updateToolbarButtons();
            element.appendChild(navigatorToolbar.el);

            navigatorToolbar.on('fit-to-screen:pointerclick', () => fitToScreen.call(this));
            navigatorToolbar.on('fullscreen:pointerclick', () => toggleFullscreen());
            navigatorToolbar.on('minimap:pointerclick', () => toggleMinimap());

            document.addEventListener('fullscreenchange', () => updateToolbarButtons());

            navigator.el.addEventListener('transitionend', () => {
                if (transitionCanceled) return;
                navigator.updateCurrentView();
            });

            navigator.el.addEventListener('transitioncancel', () => {
                transitionCanceled = true;
            });

            element.prepend(navigator.el);
            navigator.render();
            navigatorToolbar.getWidgetByName('minimap').el.classList.add('active');
        },

        initializeToolbar() {
            const fileTools = [
                {
                    action: 'new',
                    content: 'New file'
                },
                {
                    action: 'load',
                    content: 'Load file'
                },
                {
                    action: 'save',
                    content: 'Save file'
                }
            ];

            const shareTools = [
                {
                    action: 'exportPNG',
                    content: 'Export as PNG'
                },
                {
                    action: 'exportSVG',
                    content: 'Export as SVG'
                },
                {
                    action: 'print',
                    content: 'Print'
                }
            ];

            const layoutTools = [
                {
                    action: 'layout-tb',
                    content: 'Top to bottom'
                },
                {
                    action: 'layout-bt',
                    content: 'Bottom to top'
                },
                {
                    action: 'layout-lr',
                    content: 'Left to right'
                },
                {
                    action: 'layout-rl',
                    content: 'Right to left'
                }
            ];

            // Keep track of open dropdowns
            const openDropdowns = {
                file: false,
                layout: false,
                settings: false,
                share: false
            };

            // See `config/toolbars.js` in order to add/remove toolbar buttons
            // The button actions are defined later in this method.
            const toolbar = this.toolbar = new joint.ui.Toolbar({
                groups: config.toolbar.groups,
                tools: config.toolbar.tools,
                autoToggle: true,
                references: {
                    paperScroller: this.paperScroller,
                    commandManager: this.commandManager
                },
                el: this.el.querySelector('.toolbar-container')
            });

            this.toolbar.render();

            toolbar.on({
                'select-file:pointerclick': () => {
                    if (openDropdowns.file) {
                        joint.ui.ContextToolbar.close();
                        return;
                    }

                    openDropdowns.file = true;

                    const contextToolbar = new joint.ui.ContextToolbar({
                        target: toolbar.getWidgetByName('select-file').el,
                        root: this.toolbar.el,
                        padding: 0,
                        vertical: true,
                        position: 'bottom-left',
                        anchor: 'top-left',
                        tools: fileTools
                    });

                    contextToolbar.on('action:load', () => {
                        joint.ui.ContextToolbar.close();

                        const fileInput = document.createElement('input');
                        fileInput.setAttribute('type', 'file');
                        fileInput.setAttribute('accept', '.json');

                        fileInput.click();

                        fileInput.onchange = () => {
                            const file = fileInput.files[0];
                            const reader = new FileReader();

                            reader.onload = (evt) => {
                                const str = evt.target.result;
                                this.graph.fromJSON(JSON.parse(str));
                                this.commandManager.reset();
                            };

                            reader.readAsText(file);
                        };
                    });

                    contextToolbar.on('action:save', () => {
                        joint.ui.ContextToolbar.close();
                        const str = JSON.stringify(this.graph.toJSON());
                        const bytes = new TextEncoder().encode(str);
                        const blob = new Blob([bytes], { type: 'application/json' });
                        const el = window.document.createElement('a');
                        el.href = window.URL.createObjectURL(blob);
                        el.download = 'kitchensink.json';
                        document.body.appendChild(el);
                        el.click();
                        document.body.removeChild(el);
                    });

                    contextToolbar.on('action:new', () => {
                        joint.ui.ContextToolbar.close();
                        this.graph.resetCells([]);
                        this.commandManager.reset();
                    });

                    // Update openDropdowns state when the contextToolbar is closed
                    contextToolbar.once('close', () => openDropdowns.file = false);

                    contextToolbar.render();
                },
                'select-share:pointerclick': () => {
                    if (openDropdowns.share) {
                        joint.ui.ContextToolbar.close();
                        return;
                    }

                    openDropdowns.share = true;

                    const contextToolbar = new joint.ui.ContextToolbar({
                        target: toolbar.getWidgetByName('select-share').el,
                        root: toolbar.el,
                        padding: 0,
                        vertical: true,
                        position: 'bottom-right',
                        anchor: 'top-right',
                        tools: shareTools
                    });

                    contextToolbar.on({
                        'action:exportPNG': () => {
                            this.openAsPNG();
                            joint.ui.ContextToolbar.close();
                        },
                        'action:exportSVG': () => {
                            this.openAsSVG();
                            joint.ui.ContextToolbar.close();
                        },
                        'action:print': () => {
                            joint.format.print(this.paper, { grid: true });
                            joint.ui.ContextToolbar.close();
                        }
                    });

                    // Update openDropdowns state when the contextToolbar is closed
                    contextToolbar.once('close', () => openDropdowns.share = false);

                    contextToolbar.render();
                },
                'select-layout:pointerclick': () => {
                    if (openDropdowns.layout) {
                        joint.ui.ContextToolbar.close();
                        return;
                    }

                    openDropdowns.layout = true;

                    const contextToolbar = new joint.ui.ContextToolbar({
                        target: this.toolbar.getWidgetByName('select-layout').el,
                        root: toolbar.el,
                        padding: 0,
                        vertical: true,
                        position: 'bottom-left',
                        anchor: 'top-left',
                        tools: layoutTools
                    });

                    contextToolbar.on({
                        'action:layout-tb': () => {
                            this.layoutDirectedGraph('TB');
                            joint.ui.ContextToolbar.close();
                        },
                        'action:layout-bt': () => {
                            this.layoutDirectedGraph('BT');
                            joint.ui.ContextToolbar.close();
                        },
                        'action:layout-lr': () => {
                            this.layoutDirectedGraph('LR');
                            joint.ui.ContextToolbar.close();
                        },
                        'action:layout-rl': () => {
                            this.layoutDirectedGraph('RL');
                            joint.ui.ContextToolbar.close();
                        }
                    });

                    // Update openDropdowns state when the contextToolbar is closed
                    contextToolbar.once('close', () => openDropdowns.layout = false);

                    contextToolbar.render();
                },
                'select-canvas-settings:pointerclick': () => {
                    const { inputs } = config.settingsInspector;

                    if (openDropdowns.settings) {
                        joint.ui.Popup.close();
                        return;
                    }

                    openDropdowns.settings = true;

                    const settingsInspector = new joint.ui.Inspector({
                        cell: this.graph,
                        className: 'settings-inspector',
                        inputs
                    }).render();

                    const settingsPopup = new joint.ui.Popup({
                        content: settingsInspector.el,
                        target: this.toolbar.getWidgetByName('select-canvas-settings').el,
                        root: this.toolbar.el,
                        padding: 0,
                        position: 'bottom-right',
                        anchor: 'top-right',
                        autoResize: true,
                        arrowPosition: 'none'
                    }).render();

                    settingsPopup.once('close', () => {
                        settingsInspector.updateCell();
                        // Update openDropdowns state when the popup is closed
                        openDropdowns.settings = false;
                    });
                }
            });
        },

        initializeKeyboardShortcuts() {

            this.keyboard = new joint.ui.Keyboard();
            this.keyboard.on({

                'ctrl+c': () => {
                    // Copy all selected elements and their associated links.
                    this.clipboard.copyElements(this.selection.collection, this.graph);
                },

                'ctrl+v': () => {
                    const pastedCells = this.clipboard.pasteCells(this.graph);
                    const elements = pastedCells.filter((cell) => cell.isElement());
                    // Make sure pasted elements get selected immediately. This makes the UX better as
                    // the user can immediately manipulate the pasted elements.
                    this.selection.collection.reset(elements);
                },

                'ctrl+x shift+delete': () => {
                    this.clipboard.cutElements(this.selection.collection, this.graph);
                },

                'delete backspace': (evt) => {
                    evt.preventDefault();
                    this.graph.removeCells(this.selection.collection.toArray());
                },

                'ctrl+z': () => {
                    this.commandManager.undo();
                    this.selection.collection.reset([]);
                },

                'ctrl+y': () => {
                    this.commandManager.redo();
                    this.selection.collection.reset([]);
                },

                'ctrl+a': () => {
                    this.selection.collection.reset(this.graph.getElements());
                },

                'ctrl+plus': (evt) => {
                    evt.preventDefault();
                    this.paperScroller.zoom(0.2, { max: 5, grid: 0.2 });
                },

                'ctrl+minus': (evt) => {
                    evt.preventDefault();
                    this.paperScroller.zoom(-0.2, { min: 0.2, grid: 0.2 });
                },

                'keydown:shift': () => {
                    this.paperScroller.setCursor('crosshair');
                },

                'keyup:shift': () => {
                    this.paperScroller.setCursor('grab');
                }
            });
        },

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
        },

        initializeTools() {
            this.paper.on('cell:pointerup', (cellView) => {
                const cell = cellView.model;
                const { collection } = this.selection;
                if (collection.includes(cell)) { return; }
                collection.reset([cell]);
            });

            this.paper.on('link:mouseenter', (linkView) => {

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

            this.paper.on('link:mouseleave', (linkView) => {

                // Remove only the hover tool, not the pointerdown tool
                if (linkView.hasTools('link-hover')) {
                    linkView.removeTools();
                }
            });

            this.graph.on('change', (cell, opt) => {

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
        },

        initializeInspector() {
            document.querySelector('.open-groups-btn').addEventListener('click', () => this.inspector.openGroups());
            document.querySelector('.close-groups-btn').addEventListener('click', () => this.inspector.closeGroups());
        },

        // Read the inspector config based on the cell type and display the inspector.
        openInspector(cell) {
            const HIDDEN_HEADER_CLASS = 'hidden';
            this.el.querySelector('.inspector-header').classList.remove(HIDDEN_HEADER_CLASS);

            const type = cell.get('type');
            // Edit `config/inspector.js` to adjust the property editor.
            const inspectorConfig = config.inspector[type];
            if (!inspectorConfig) {
                console.warn(`The inspector configuration for '${type}' type should be added to the 'config/inspector.js' file`);
            }
            const inspector = joint.ui.Inspector.create('.inspector-content', {
                ...inspectorConfig,
                container: document.querySelector('.inspector-container'),
                cell,
                renderFieldContent: (options, path, _value, inspector) => {
                    if (options.type === 'image-picker') {
                        const label = document.createElement('label');
                        label.textContent = options.label;

                        const input = document.createElement('input');

                        input.type = 'file';
                        input.accept = 'image/x-png,image/gif,image/jpeg';

                        const field = document.createElement('div');
                        field.appendChild(label);
                        field.appendChild(input);

                        input.addEventListener('change', function() {
                            inspector.updateCell(field, path, options);
                        });

                        return field;
                    }

                    // Use the default field renderer.
                    return null;
                },
                getFieldValue: (field, type) => {
                    if (type === 'image-picker') {
                        const file = field.querySelector('input').files.item(0);
                        return { value: file ? URL.createObjectURL(file) : '' };
                    }

                    // Use the default field value getter.
                    return null;
                }
            });

            if (this.inspector !== inspector) {
                inspector.on('close', () => {
                    this.el.querySelector('.inspector-header').classList.add(HIDDEN_HEADER_CLASS);
                });
                this.inspector = inspector;
            }

            return inspector;
        },

        renderContextToolbar(point, selectedCells = []) {
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
        },

        onSelectionChange() {
            const { paper, selection } = this;
            const selectedCells = selection.collection.toArray();
            paper.removeTools();
            joint.ui.Halo.clear(paper);
            joint.ui.FreeTransform.clear(paper);
            joint.ui.Inspector.close();
            if (selectedCells.length === 1) {
                const [primaryCell] = selectedCells;
                const primaryCellView = paper.findViewByModel(primaryCell);
                selection.destroySelectionBox(primaryCell);
                this.selectPrimaryCell(primaryCellView);
            } else if (selectedCells.length === 2) {
                selectedCells.forEach((cell) => selection.createSelectionBox(cell));
            }
        },

        selectPrimaryCell(cellView) {
            const cell = cellView.model;
            if (cell.isElement()) {
                this.selectPrimaryElement(cellView);
            } else {
                this.selectPrimaryLink(cellView);
            }
            this.openInspector(cell);
        },

        selectPrimaryElement(elementView) {
            const element = elementView.model;
            // Tools to resize & rotate the element
            const freeTransform = new joint.ui.FreeTransform({
                cellView: elementView,
                allowRotation: false,
                preserveAspectRatio: !!element.get('preserveAspectRatio'),
                allowOrthogonalResize: element.get('allowOrthogonalResize') !== false,
                useBordersToResize: true
            });
            freeTransform.render();
            // Other tool buttons spread around the element
            // See `js/config/halo.js`, to add/remove handles.
            const halo = new joint.ui.Halo({
                cellView: elementView,
                boxContent: null,
                handles: config.halo.handles,
                useModelGeometry: true
            });
            halo.render();
        },

        selectPrimaryLink(linkView) {

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
        },

        sendToFront() {
            this.graph.startBatch('selection');
            this.selection.collection.toArray().forEach(cell => cell.toFront());
            this.graph.stopBatch('selection');
        },

        sendToBack() {
            this.graph.startBatch('selection');
            this.selection.collection.toArray().forEach(cell => cell.toBack());
            this.graph.stopBatch('selection');
        },

        toggleSnaplines(checked) {
            if (checked) {
                this.snaplines.enable();
            } else {
                this.snaplines.disable();
            }
        },

        openAsSVG() {
            const { paper } = this;
            paper.hideTools();
            joint.format.toSVG(paper, (svg, error) => {
                if (error) {
                    console.error(error.message);
                }
                const lightbox = new joint.ui.Lightbox({
                    image: 'data:image/svg+xml,' + encodeURIComponent(svg),
                    downloadable: true,
                    fileName: 'joint-plus'
                });
                lightbox.open();
                paper.showTools();
            }, {
                preserveDimensions: true,
                convertImagesToDataUris: true,
                useComputedStyles: false,
                grid: true,
                stylesheet: config.fontStyleSheet
            });
        },

        openAsPNG() {
            const { paper } = this;
            paper.hideTools();
            joint.format.toPNG(paper, (dataURL, error) => {
                if (error) {
                    console.error(error.message);
                }
                const lightbox = new joint.ui.Lightbox({
                    image: dataURL,
                    downloadable: true,
                    fileName: 'joint-plus'
                });
                lightbox.open();
                paper.showTools();
            }, {
                padding: 10,
                useComputedStyles: false,
                grid: true,
                stylesheet: config.fontStyleSheet
            });
        },

        layoutDirectedGraph(direction) {
            // Position the graph elements and links with a directed graph layout algorithm
            joint.layout.DirectedGraph.layout(this.graph, {
                setLinkVertices: true,
                rankDir: direction,
                marginX: 100,
                marginY: 100
            });
            // Center the graph content in the viewport
            this.paperScroller.centerContent({ useModelGeometry: true });
        },

        removeTargetFocus(evt) {
            evt.target.blur();
        },

        removeFocus(evt) {
            // do not lose focus on right-click
            if (evt.button === 2) return;
            // do not lose focus if clicking current element for a second time
            const activeElement = document.activeElement;
            const target = evt.target;
            // do not lose focus if clicking an element inside the current element
            if (activeElement.contains(target)) return;
            activeElement.blur();
            window.getSelection().removeAllRanges();
        },

        addPageBreaks() {
            const { paper, pageBreakSettings } = this;
            const { color, width, height } = pageBreakSettings;

            const pageBreaksVEl = joint.V('path', {
                stroke: color,
                fill: 'none',
                strokeDasharray: '5,5'
            });

            paper.layers.prepend(pageBreaksVEl.node);

            let lastArea = null;

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
    });

})(joint, App.config);
