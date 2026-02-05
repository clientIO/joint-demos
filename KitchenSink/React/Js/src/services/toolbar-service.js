var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as joint from '@joint/plus';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { fontsStyleSheet } from '../config/font-style-sheet';
export class ToolbarService {
    constructor(element) {
        this.element = element;
        // Keep track of open dropdowns
        this.openDropdowns = {
            file: false,
            layout: false,
            settings: false,
            share: false
        };
    }
    create(commandManager, paperScroller, graph, paper) {
        const { tools, groups } = this.getToolbarConfig();
        this.toolbar = new joint.ui.Toolbar({
            groups,
            tools,
            autoToggle: true,
            references: {
                paperScroller: paperScroller,
                commandManager: commandManager
            },
            el: this.element,
        });
        this.toolbar.render();
        this.fileTools = [
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
        this.shareTools = [
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
        this.layoutTools = [
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
        this.toolbar.on({
            'select-file:pointerclick': () => this.openFileSelect(commandManager, graph),
            'select-share:pointerclick': () => this.openShareSelect(paper),
            'select-layout:pointerclick': () => this.openLayoutSelect(graph, paperScroller),
            'select-canvas-settings:pointerclick': () => this.openSettingsPopup(graph)
        });
    }
    getToolbarConfig() {
        return {
            groups: {
                left: {
                    index: 1,
                    align: joint.ui.Toolbar.Align.Left
                },
                right: {
                    index: 2,
                    align: joint.ui.Toolbar.Align.Right
                },
            },
            tools: [
                {
                    type: 'button',
                    name: 'select-file',
                    group: 'left',
                    attrs: {
                        button: {
                            'data-tooltip': 'File',
                            'data-tooltip-position': 'top',
                            'data-tooltip-position-selector': '.toolbar-container'
                        }
                    }
                },
                {
                    type: 'separator',
                    group: 'left',
                },
                {
                    type: 'undo',
                    name: 'undo',
                    group: 'left',
                    attrs: {
                        button: {
                            'data-tooltip': 'Undo',
                            'data-tooltip-position': 'top',
                            'data-tooltip-position-selector': '.toolbar-container'
                        }
                    }
                },
                {
                    type: 'redo',
                    name: 'redo',
                    group: 'left',
                    attrs: {
                        button: {
                            'data-tooltip': 'Redo',
                            'data-tooltip-position': 'top',
                            'data-tooltip-position-selector': '.toolbar-container'
                        }
                    }
                },
                {
                    type: 'separator',
                    group: 'left',
                },
                {
                    type: 'button',
                    name: 'select-layout',
                    group: 'left',
                    text: 'Layout'
                },
                {
                    type: 'button',
                    text: 'Canvas settings',
                    name: 'select-canvas-settings',
                    group: 'right'
                },
                {
                    type: 'separator',
                    group: 'right',
                },
                {
                    type: 'button',
                    name: 'select-share',
                    group: 'right',
                    attrs: {
                        button: {
                            'data-tooltip': 'Share',
                            'data-tooltip-position': 'top',
                            'data-tooltip-position-selector': '.toolbar-container'
                        }
                    }
                }
            ],
        };
    }
    getSettingsInspectorConfig() {
        return {
            inputs: {
                paperColor: {
                    type: 'color',
                    label: 'Paper color'
                },
                snaplines: {
                    type: 'toggle',
                    label: 'Snaplines'
                },
                infinitePaper: {
                    type: 'toggle',
                    label: 'Infinite paper',
                },
                dotGrid: {
                    type: 'toggle',
                    label: 'Dot grid',
                },
                gridSize: {
                    type: 'range',
                    label: 'Grid size',
                    min: 1,
                    max: 50,
                    step: 1
                }
            }
        };
    }
    layoutDirectedGraph(rankDir, graph, paperScroller) {
        DirectedGraph.layout(graph, {
            setVertices: true,
            rankDir,
            marginX: 100,
            marginY: 100
        });
        paperScroller.centerContent({ useModelGeometry: true });
    }
    exportPNG(paper) {
        return __awaiter(this, void 0, void 0, function* () {
            paper.hideTools();
            joint.format.toPNG(paper, (dataURL) => {
                new joint.ui.Lightbox({
                    image: dataURL,
                    downloadable: true,
                    fileName: 'joint-plus',
                }).open();
                paper.showTools();
            }, {
                padding: 10,
                useComputedStyles: false,
                grid: true,
                stylesheet: yield fontsStyleSheet()
            });
        });
    }
    exportSVG(paper) {
        return __awaiter(this, void 0, void 0, function* () {
            paper.hideTools();
            joint.format.toSVG(paper, (svg) => {
                new joint.ui.Lightbox({
                    image: 'data:image/svg+xml,' + encodeURIComponent(svg),
                    downloadable: true,
                    fileName: 'joint-plus'
                }).open();
                paper.showTools();
            }, {
                preserveDimensions: true,
                convertImagesToDataUris: true,
                useComputedStyles: false,
                grid: true,
                stylesheet: yield fontsStyleSheet()
            });
        });
    }
    openFileSelect(commandManager, graph) {
        if (this.openDropdowns.file) {
            joint.ui.ContextToolbar.close();
            return;
        }
        this.openDropdowns.file = true;
        const contextToolbar = new joint.ui.ContextToolbar({
            target: this.toolbar.getWidgetByName('select-file').el,
            root: this.toolbar.el,
            padding: 0,
            vertical: true,
            position: 'bottom-left',
            anchor: 'top-left',
            tools: this.fileTools
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
                    let str = evt.target.result;
                    graph.fromJSON(JSON.parse(str));
                    commandManager.reset();
                };
                reader.readAsText(file);
            };
        });
        contextToolbar.on('action:save', () => {
            joint.ui.ContextToolbar.close();
            const str = JSON.stringify(graph.toJSON());
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
            graph.resetCells([]);
            commandManager.reset();
        });
        // Update openDropdowns state when the contextToolbar is closed
        contextToolbar.once('close', () => this.openDropdowns.file = false);
        contextToolbar.render();
    }
    openLayoutSelect(graph, paperScroller) {
        if (this.openDropdowns.layout) {
            joint.ui.ContextToolbar.close();
            return;
        }
        this.openDropdowns.layout = true;
        const contextToolbar = new joint.ui.ContextToolbar({
            target: this.toolbar.getWidgetByName('select-layout').el,
            root: this.toolbar.el,
            padding: 0,
            vertical: true,
            position: 'bottom-left',
            anchor: 'top-left',
            tools: this.layoutTools
        });
        contextToolbar.on({
            'action:layout-tb': () => {
                this.layoutDirectedGraph('TB', graph, paperScroller);
                joint.ui.ContextToolbar.close();
            },
            'action:layout-bt': () => {
                this.layoutDirectedGraph('BT', graph, paperScroller);
                joint.ui.ContextToolbar.close();
            },
            'action:layout-lr': () => {
                this.layoutDirectedGraph('LR', graph, paperScroller);
                joint.ui.ContextToolbar.close();
            },
            'action:layout-rl': () => {
                this.layoutDirectedGraph('RL', graph, paperScroller);
                joint.ui.ContextToolbar.close();
            }
        });
        // Update openDropdowns state when the contextToolbar is closed
        contextToolbar.once('close', () => this.openDropdowns.layout = false);
        contextToolbar.render();
    }
    openSettingsPopup(graph) {
        const { inputs } = this.getSettingsInspectorConfig();
        if (this.openDropdowns.settings) {
            joint.ui.Popup.close();
            return;
        }
        this.openDropdowns.settings = true;
        const settingsInspector = new joint.ui.Inspector({
            cell: graph,
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
            // Update openDropdowns state when the settingsPopup is closed
            this.openDropdowns.settings = false;
        });
    }
    openShareSelect(paper) {
        if (this.openDropdowns.share) {
            joint.ui.ContextToolbar.close();
            return;
        }
        this.openDropdowns.share = true;
        const contextToolbar = new joint.ui.ContextToolbar({
            target: this.toolbar.getWidgetByName('select-share').el,
            root: this.toolbar.el,
            padding: 0,
            vertical: true,
            position: 'bottom-right',
            anchor: 'top-right',
            tools: this.shareTools
        });
        contextToolbar.on({
            'action:exportPNG': () => {
                this.exportPNG(paper);
                joint.ui.ContextToolbar.close();
            },
            'action:exportSVG': () => {
                this.exportSVG(paper);
                joint.ui.ContextToolbar.close();
            },
            'action:print': () => {
                joint.format.print(paper, { grid: true });
                joint.ui.ContextToolbar.close();
            }
        });
        // Update openDropdowns state when the contextToolbar is closed
        contextToolbar.once('close', () => this.openDropdowns.share = false);
        contextToolbar.render();
    }
}
