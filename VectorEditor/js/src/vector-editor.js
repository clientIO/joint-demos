/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

var app = app || {};

app.Path = joint.dia.Element.define('Path', {
    attrs: {
        path: {
            strokeMiterlimit: 4,
            strokeLinejoin: 'miter',
            strokeLinecap: 'butt',
            strokeOpacity: 1,
            strokeDasharray: 'none',
            fillOpacity: 1,
            fillRule: 'nonzero',
            cursor: 'move'
        }
    }
}, {

    useCSSSelectors: true,
    markup: 'path',

    updateBBox: function(bbox, opt) {

        this.position(bbox.x, bbox.y, opt);
        this.resize(bbox.width || 1, bbox.height || 1, opt);
    },

    updatePathData: function(paper) {

        var view = this.findView(paper);
        var path = view.vel.findOne('path');
        var untransformedBBox = path.getBBox({ target: view.el });
        var transformedBBox = path.getBBox({ target: paper.layers });
        var position = transformedBBox.center().difference(untransformedBBox.center().difference(untransformedBBox.topLeft()));
        this.attr('path/refD', path.attr('d'), {
            nextBBox: new g.Rect(position.x, position.y, untransformedBBox.width, untransformedBBox.height),
            prevBBox: this.getBBox()
        });
    }
}, {

    createFromNode: function(pathNode, paper) {

        var bbox = V.transformRect(pathNode.getBBox(), paper.matrix().inverse());
        var p = new this({
            position: { x: bbox.x, y: bbox.y },
            size: { width: bbox.width, height: bbox.height },
            attrs: { path: { refD: pathNode.getAttribute('d') }}
        });

        return p;
    }
});

app.AppView = joint.mvc.View.extend({

    el: '#app',

    className: 'vector-editor',

    options: {
        paperWidth: 800,
        paperHeight: 400,
        paperScrollerAutoResize: true,
        paperScrollerWidth: 800,
        paperScrollerHeight: 400,
        paperScrollerPadding: 20,
        paperContentPadding: 50,
        pathFill: '#ffffff',
        pathStroke: '#000000',
        pathStrokeWidth: 1,
        initialPaths: null,
        initialZoom: 1,
        enableCurves: true
    },

    events: {
        'click #btn-undo': 'undo',
        'click #btn-redo': 'redo',
        'click #btn-clear': 'clear',
        'click #btn-example': 'loadExample',
        'click #btn-zoom-in': 'zoomIn',
        'click #btn-zoom-out': 'zoomOut',
        'click #btn-download': 'download'
    },

    init: function() {

        this.initPlugins();
        this.initControllers();
        this.loadExample();
    },

    initPlugins: function() {

        var options = this.options;

        var graph = this.graph = new joint.dia.Graph;

        var paper = this.paper = new joint.dia.Paper({
            el: this.el.querySelector('#paper'),
            width: options.paperWidth,
            height: options.paperHeight,
            model: graph
        });

        var paperScroller = this.paperScroller = new joint.ui.PaperScroller({
            paper: paper,
            padding: options.paperScrollerPadding,
            autoResizePaper: options.paperScrollerAutoResize,
            contentOptions: {
                allowNewOrigin: 'any',
                padding: options.paperContentPadding
            }
        });

        paperScroller.setCursor('crosshair');
        paperScroller.el.style.width = `${options.paperScrollerWidth}px`;
        paperScroller.el.style.height = `${options.paperScrollerHeight}px`;
        this.el.querySelector('#paper-scroller').appendChild(paperScroller.el);

        this.snaplines = new joint.ui.Snaplines({ paper: paper });
        this.cm = new joint.dia.CommandManager({
            graph: graph,
            applyOptionsList: ['propertyPath', 'nextBBox'],
            revertOptionsList: ['propertyPath', 'prevBBox']
        });
        this.keyboard = new joint.ui.Keyboard();
    },

    initControllers: function() {

        this.paper.on({
            'cell:pointerdown': function(cellView) {
                this.removeOverlays();
                // we want inspector to be showing even when moving cells
                this.addInspector(cellView);
            },
            'cell:pointerup': function(cellView) {
                // it is possible to move objects around with pointer down
                // only show editor overlay after pointer is released
                this.addEditor(cellView);
                // keep inspector from cell:pointerdown
            },
            'cell:pointerdblclick': function(cellView) {
                this.removeEditor();
                this.addFreeTransform(cellView);
                // keep inspector from cell:pointerdown
            },
            'blank:pointerdown': function(evt) {
                if (evt.altKey && evt.which <= 1) {
                    // if the user is holding alt and left-clicking (or touching), start panning
                    this.panning = true;
                    this.paperScroller.startPanning(evt);
                } else if (this.pathEditor || this.pathDrawer || this.freeTransform) {
                    // if an overlay is active, deactivate it
                    this.removeOverlays();
                    this.removeInspector();
                } else if (evt.which <= 1) {
                    // if no overlay is active and left button (or touch) was pressed, start drawing
                    this.addDrawer(evt);
                }
            },
            'blank:pointerup': function(evt) {
                if (evt.altKey) {
                    this.paperScroller.stopPanning(evt);
                    this.panning = false;
                }
            },
            'transform': function() {
                this.update();
            }
        }, this);

        this.graph.on({
            'remove reset': function() {
                this.removeOverlays();
                // inspector removed automatically
            },
            'change:attrs': function(cell, attrs, opt) {
                if (opt.propertyPath === 'attrs/path/refD') {
                    var bbox = opt[(opt.revert) ? 'prevBBox' : 'nextBBox'];
                    if (bbox) {
                        cell.updateBBox(bbox, { dry: true });
                    }
                }
            }
        }, this);

        this.keyboard.on({
            'keydown:alt': function() {
                this.paperScroller.setCursor('grab');
            },
            'keyup:alt': function(evt) {
                this.paperScroller.setCursor('crosshair');
                if (this.panning) {
                    this.paperScroller.stopPanning(evt);
                    this.panning = false;
                }
            },
            'esc': function(evt) {
                evt.preventDefault();
                this.removeOverlays(); // also abors user actions
                this.removeInspector();
            },
            'backspace': function(evt) {
                // delete currently selected cell
                evt.preventDefault();
                if (this.cellView) {
                    this.cellView.model.remove();
                    this.cellView = null;
                }
                // overlays removed by this.graph's remove listener
            },
            'ctrl+z command+z': function(evt) {
                evt.preventDefault();
                this.undo();
            },
            'ctrl+y ctrl+shit+z command+y command+shift+z': function(evt) {
                evt.preventDefault();
                this.redo();
            }
        }, this);
    },

    clear: function() {

        this.removeOverlays();
        this.graph.clear();
        this.cm.reset(); // prevent undo buttton from reverting beyond this
    },

    update: function() {

        var cellView = this.cellView;
        if (cellView && cellView.model.graph) {

            if (this.pathEditor) {
                var controlPointLockedStates = this.pathEditor.getControlPointLockedStates();
                this.removeEditor();
                this.addEditor(cellView);
                this.pathEditor.setControlPointLockedStates(controlPointLockedStates);
            }

            if (this.freeTransform) {
                this.removeFreeTransform();
                this.addFreeTransform(cellView);
            }
        }
    },

    undo: function() {

        this.cm.undo({ revert: true });
        this.update();
        if (this.pathEditor) this.pathEditor.render();
    },

    redo: function() {

        this.cm.redo({ revert: false });
        this.update();
        if (this.pathEditor) this.pathEditor.render();
    },

    loadExample: function() {

        this.clear();

        var paths = this.options.initialPaths;
        var numPaths = (paths) ? paths.length : 0;
        for (var i = 0; i < numPaths; i++) {
            paths[i].clone().addTo(this.graph);
        }

        this.resetZoom();
        this.center();
        this.cm.reset(); // prevent undo button from reverting beyond this
    },

    zoomIn: function() {

        this.zoom *= 1.1;
        this.updateZoom();
    },

    zoomOut: function() {

        this.zoom /= 1.1;
        this.updateZoom();
    },

    download: function() {

        var paper = this.paper;
        var graph = this.graph;

        if (graph.getElements().length > 0) {
            // only download if there are elements in the graph

            this.removeOverlays(); // overlay elements should not be downloaded

            var downloadArea = graph.getBBox().inflate(20);

            joint.format.toSVG(paper, function(svg) {
                var data = 'data:image/svg+xml,' + encodeURIComponent(svg);
                var fileName = 'VectorEditor download.svg';
                joint.util.downloadDataUri(data, fileName);
            }.bind(this), {
                area: downloadArea,
                preserveDimensions: true,
                useComputedStyles: false,
                stylesheet: [
                    'svg { background-color: #ffffff }'
                ].join('')
            });
        }
    },

    center: function() {

        this.paperScroller.centerContent();
    },

    removeOverlays: function() {

        this.removeEditor();
        this.removeDrawer();
        this.removeFreeTransform();
    },

    resetZoom: function() {

        this.zoom = this.options.initialZoom;
        this.updateZoom();
    },

    updateZoom: function() {

        this.removeDrawer();
        this.paperScroller.zoom(this.zoom, { absolute: true });
    },

    addDrawer: function(evt) {

        if (!this.pathDrawer) { // if path drawer doesn't exist

            var paper = this.paper;
            var options = this.options;

            // make a new path drawer
            var pathDrawer = this.pathDrawer = new joint.ui.PathDrawer({
                target: paper.svg,
                pathAttributes: {
                    'fill': options.pathFill,
                    'stroke': options.pathStroke,
                    'stroke-width': options.pathStrokeWidth
                },
                enableCurves: options.enableCurves
            });

            pathDrawer.on({
                'path:finish': function(pathNode) {
                    var path = this.closeDrawer(pathNode);
                    var pathView = path.findView(this.paper);
                    this.removeDrawer();
                    this.addEditor(pathView);
                    this.addInspector(pathView);
                },
                'path:abort': function() {
                    this.removeDrawer();
                }
            }, this);

            // pass the mouse event down to the drawer
            // starts drawing at the location of user click
            pathDrawer.onPointerDown(evt);

            this.cellView = null;
        }
    },

    closeDrawer: function(pathNode) {

        var options = this.options;
        var p = app.Path.createFromNode(pathNode, this.paper).attr({
            path: {
                fill: options.pathFill,
                stroke: options.pathStroke,
                strokeWidth: options.pathStrokeWidth
            }
        });
        return p.addTo(this.graph);
    },

    removeDrawer: function() {

        if (this.pathDrawer) {
            this.pathDrawer.remove();
            this.pathDrawer = this.cellView = null;
        }
    },

    addFreeTransform: function(cellView) {

        if (!this.freeTransform) {
            var freeTransform = this.freeTransform = new joint.ui.FreeTransform({
                cell: cellView.model,
                paper: this.paper,
                graph: this.graph,
                allowRotation: true
            });
            freeTransform.render();
            this.cellView = cellView;
        }
    },

    removeFreeTransform: function() {

        if (this.freeTransform) {
            this.freeTransform.remove();
            this.freeTransform = this.cellView = null;
        }
    },

    addEditor: function(cellView) {

        if (!this.pathEditor) {

            var pathEditor = this.pathEditor = new joint.ui.PathEditor({
                pathElement: cellView.el.querySelector('path')
            });

            pathEditor.on({
                'path:edit': function(path) {
                    this.cellView.model.updatePathData(this.paper);
                    this.update();
                },
                'path:invalid': function() {
                    this.cellView.model.remove();
                    this.removeEditor();
                }
            }, this);

            // adding additional user interaction options to pathEditor
            pathEditor.delegate('contextmenu', '.anchor-point', function(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                // first click only (if this was part of a double click)
                if (evt.originalEvent.detail > 1) return;
                this.addClosePathSegment(evt);
            }.bind(pathEditor));

            pathEditor.delegate('contextmenu', '.segment-path', function(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                // first click only (if this was part of a double click)
                if (evt.originalEvent.detail > 1) return;
                this.convertSegmentPath(evt);
            }.bind(pathEditor));

            this.cellView = cellView;
        }
    },

    removeEditor: function() {

        if (this.pathEditor) {
            this.pathEditor.remove();
            this.pathEditor = null;
            this.cellView = null;
        }
    },

    addInspector: function(cellView) {

        var options = this.options;
        var palette = [...new Set([
            '#f6f6f6',
            '#dcd7d7',
            '#8f8f8f',
            '#c6c7e2',
            '#feb663',
            '#fe854f',
            '#b75d32',
            '#31d0c6',
            '#7c68fc',
            '#61549C',
            '#6a6c8a',
            '#4b4a67',
            '#3c4260',
            '#33334e',
            '#222138',
            options.pathFill,
            options.pathStroke
        ])];

        this.inspector = joint.ui.Inspector.create('#inspector', {
            cellView: cellView,
            theme: 'default',
            stateKey: function(model) {
                return model.get('type');
            },
            inputs: {
                attrs: {
                    path: {
                        'fill': {
                            type: 'color-palette',
                            options: palette,
                            group: 'presentation',
                            label: 'Fill'
                        },
                        'stroke': {
                            type: 'color-palette',
                            options: palette,
                            group: 'presentation',
                            label: 'Stroke'
                        },
                        'strokeWidth': {
                            type: 'number',
                            group: 'presentation',
                            min: 0,
                            label: 'Stroke Width'
                        },
                        'strokeDasharray': {
                            type: 'select-box',
                            options: [
                                { value: 'none', content: 'Solid' },
                                { value: '2,5', content: 'Dotted' },
                                { value: '10,5', content: 'Dashed' }
                            ],
                            group: 'presentation',
                            label: 'Stroke Style'
                        },
                        'fillOpacity': {
                            type: 'range',
                            group: 'opacity',
                            label: 'Fill Opacity',
                            min: 0,
                            max: 1,
                            step: 0.1
                        },
                        'strokeOpacity': {
                            type: 'range',
                            group: 'opacity',
                            label: 'Stroke Opacity',
                            min: 0,
                            max: 1,
                            step: 0.1
                        },
                        'fillRule': {
                            type: 'select-box',
                            theme: 'default',
                            options: ['nonzero', 'evenodd'],
                            group: 'advanced',
                            label: 'Fill Rule'
                        },
                        'strokeLinecap': {
                            type: 'select-box',
                            theme: 'default',
                            options: ['butt', 'round', 'square'],
                            group: 'advanced',
                            label: 'Stroke Linecap'
                        },
                        'strokeLinejoin': {
                            type: 'select-box',
                            theme: 'default',
                            options: ['miter', 'round', 'bevel'],
                            group: 'advanced',
                            label: 'Stroke Linejoin'
                        },
                        'strokeMiterlimit': {
                            type: 'number',
                            group: 'advanced',
                            label: 'Stroke Miterlimit',
                            min: 1
                        }
                    }
                },
                z: {
                    type: 'number',
                    group: 'stackingOrder',
                    label: 'Z-index'
                }
            },
            groups: {
                presentation: {
                    label: 'Presentation',
                    closed: false,
                    index: 1
                },
                opacity: {
                    label: 'Opacity',
                    closed: true,
                    index: 2
                },
                stackingOrder: {
                    label: 'Stacking Order',
                    closed: true,
                    index: 3
                },
                advanced: {
                    label: 'Advanced',
                    closed: true,
                    index: 4
                }
            }
        });
    },

    removeInspector: function() {

        joint.ui.Inspector.close();
    }
});
