import {
    dia,
    ui,
    shapes,
    mvc,
    highlighters,
    elementTools,
    linkTools,
    setTheme
} from '@joint/plus';
import './styles.scss';

const STENCIL_WIDTH = 100;

const STENCIL_SHAPES = [
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            root: {
                highlighterSelector: 'body'
            },
            body: {
                stroke: '#80ff95',
                fill: 'transparent'
            }
        }
    },
    {
        type: 'standard.Ellipse',
        size: { width: 80, height: 60 },
        attrs: {
            root: {
                highlighterSelector: 'body'
            },
            body: {
                stroke: '#ff9580',
                fill: 'transparent'
            }
        }
    },
    {
        type: 'standard.Path',
        size: { width: 80, height: 60 },
        attrs: {
            root: {
                highlighterSelector: 'body'
            },
            body: {
                d: 'M calc(w/2) 0 calc(w) calc(h/2) calc(w/2) calc(h) 0 calc(h/2) Z',
                stroke: '#9580ff',
                fill: 'transparent'
            }
        }
    }
];

class Controller extends mvc.Listener {
    get application() {
        const [app] = this.callbackArguments;
        return app;
    }

    startListening() { }

    highlightCell(elementView, options = {}) {
        const { color = '#FEB663', selector = 'root', padding = 2 } = options;
        highlighters.mask.add(elementView, selector, 'selection', {
            layer: dia.Paper.Layers.FRONT,
            padding,
            attrs: {
                stroke: color,
                'stroke-width': 3,
                'stroke-linecap': 'butt',
                'stroke-linejoin': 'miter'
            }
        });
    }

    unhighlightAll() {
        const { paper } = this.application.components;
        highlighters.mask.removeAll(paper);
        paper.removeTools();
    }
}

class CommonController extends Controller {
    startListening() {
        this.stopListening();
        const { application } = this;
        const { toolbar, paper } = application.components;
        // Toolbar
        this.listenTo(
            toolbar,
            {
                'mode:pointerclick': this.onToolbarModePointerClick
            },
            this
        );
        // Paper
        this.listenTo(
            paper,
            {
                'blank:pointerdown': this.onPaperBlankPointerdown,
                'paper:pan': this.onPaperPan,
                'paper:pinch': this.onPaperPinch
            },
            this
        );
    }

    onToolbarModePointerClick(app) {
        const { scroller } = app.components;
        if (app.editable) {
            app.startViewMode();
            scroller.el.scrollLeft -= STENCIL_WIDTH;
        } else {
            app.startEditMode();
            scroller.el.scrollLeft += STENCIL_WIDTH;
        }
    }

    onPaperBlankPointerdown(app, evt) {
        const { scroller } = app.components;
        scroller.startPanning(evt);
        this.unhighlightAll();
    }

    onPaperPan(app, evt, tx, ty) {
        const { scroller } = app.components;
        evt.preventDefault();
        scroller.el.scrollLeft += tx;
        scroller.el.scrollTop += ty;
    }

    onPaperPinch(app, evt, ox, oy, scale) {
        const { scroller } = app.components;
        scroller.zoom(scale - 1, { min: 0.2, max: 5, ox, oy });
        ui.Popup.close();
    }
}

class ViewController extends Controller {
    startListening() {
        this.stopListening();
        const { application } = this;
        const { paper } = application.components;
        // Paper
        this.listenTo(
            paper,
            {
                'element:pointerclick': this.onPaperElementPointerClick
            },
            this
        );
    }

    onPaperElementPointerClick(app, elementView) {
        this.selectElement(app, elementView);
    }

    selectElement(app, elementView, evt) {
        const { scroller, paper } = app.components;
        const { model: element } = elementView;
        ui.Popup.close();
        // Selection Frame
        this.unhighlightAll();
        this.highlightCell(elementView, {
            selector: 'body',
            color: element.attr('body/stroke')
        });
        // Popup
        const scale = scroller.zoom();
        const { x, y } = element.position();
        const { width, height } = element.size();
        const popup = new ui.Popup({
            content: /*xml*/ `
                  <table>
                      <tr>
                        <td>id</td>
                        <td colspan="2">${element.id}</td>
                      </tr>
                      <tr>
                        <td>type</td>
                        <td colspan="2">${element.get('type')}</td>
                      </tr>
                      <tr>
                        <td>position</td>
                        <td>x=${x}</td>
                        <td>y=${y}</td>
                      </tr>
                      <tr>
                        <td>size</td>
                        <td>width=${width}</td>
                        <td>height=${height}</td>
                      </tr>
                  </table>
              `,
            target: elementView.el,
            position: 'top',
            anchor: 'bottom',
            padding: 15 * scale,
            scale,
            root: paper.el
        });
        popup.render();
        popup.on('close', () => {
            this.unhighlightAll();
        });
    }
}

class EditController extends Controller {
    startListening() {
        this.stopListening();
        const { application } = this;
        const { paper, stencil } = application.components;
        // Paper
        this.listenTo(
            paper,
            {
                'element:pointerclick': this.onPaperElementPointerClick,
                'link:pointerclick': this.onPaperLinkPointerClick
            },
            this
        );
        // Stencil
        this.listenTo(
            stencil,
            {
                'element:drop': this.onStencilElementDrop
            },
            this
        );
    }

    onPaperElementPointerClick(app, elementView) {
        this.selectElement(app, elementView);
    }

    onPaperLinkPointerClick(app, linkView) {
        this.selectLink(app, linkView);
    }

    onStencilElementDrop(app, elementView) {
        this.selectElement(app, elementView);
    }

    selectElement(app, elementView) {
        // Selection Frame
        this.unhighlightAll();
        this.highlightCell(elementView, { selector: 'body' });
        // Edit Tools
        this.editElement(elementView);
    }

    selectLink(app, linkView) {
        // Selection Frame
        this.unhighlightAll();
        this.highlightCell(linkView, { selector: 'line', padding: 5 });
        // Edit Tools
        this.editLink(linkView);
    }

    editElement(elementView) {
        const connectTool = new elementTools.Connect({
            scale: 1.5,
            y: 'calc(h+25)',
            x: 'calc(w/2)'
        });
        const removeTool = new elementTools.Remove({
            scale: 1.5,
            y: -20,
            x: 'calc(w + 20)'
        });
        const toolsView = new dia.ToolsView({
            tools: [connectTool, removeTool]
        });
        elementView.addTools(toolsView);
    }

    editLink(linkView) {
        const removeTool = new linkTools.Remove({
            scale: 1.5,
            distance: '50%',
            offset: 20
        });
        const toolsView = new dia.ToolsView({
            tools: [removeTool]
        });
        linkView.addTools(toolsView);
    }
}

class Application {
    constructor(el) {
        this.editable = true;
        this.el = el;
        this.controllers = {
            common: new CommonController(this),
            view: new ViewController(this),
            edit: new EditController(this)
        };
        this.components = {};
        this.graph = new dia.Graph({}, { cellNamespace: shapes });
        this.createGraphComponents();
    }

    start() {
        setTheme('dark');
        this.createCommonComponents();
        if (this.editable) {
            this.startEditMode();
        } else {
            this.startViewMode();
        }
    }

    stop() {
        this.destroyCommonComponents();
        if (this.editable) {
            this.destroyEditComponents();
        } else {
            this.destroyViewComponents();
        }
    }

    startViewMode() {
        this.el.classList.remove('editable');
        // off
        this.destroyEditComponents();
        this.controllers.edit.stopListening();
        // on
        this.createViewComponents();
        this.controllers.view.startListening();
        this.controllers.common.startListening();
        this.editable = false;
        this.updateCommonComponents();
    }

    startEditMode() {
        this.el.classList.add('editable');
        // off
        this.destroyViewComponents();
        this.controllers.view.stopListening();
        // on
        this.createEditComponents();
        this.controllers.edit.startListening();
        this.controllers.common.startListening();
        this.editable = true;
        this.updateCommonComponents();
    }

    createCommonComponents() {
        // Paper
        const paper = new dia.Paper({
            model: this.graph,
            cellViewNamespace: shapes,
            gridSize: 20,
            async: true,
            sorting: dia.Paper.sorting.APPROX,
            clickThreshold: 10,
            background: { color: '#18191b' },
            defaultConnectionPoint: { name: 'boundary' },
            linkPinning: false,
            defaultLink: () =>
                new shapes.standard.Link({
                    z: -1,
                    attrs: {
                        line: {
                            stroke: '#eaff80'
                        }
                    }
                }),
            highlighting: {
                default: {
                    name: 'mask'
                }
            }
        });
        this.components.paper = paper;
        // Scroller
        const scroller = new ui.PaperScroller({
            paper,
            baseWidth: 500,
            baseHeight: 500,
            autoResizePaper: true
        });
        scroller.render();
        this.el.querySelector('.paper-container').appendChild(scroller.el);
        scroller.adjustPaper();
        this.components.scroller = scroller;
        // Toolbar
        const toolbar = new ui.Toolbar({
            autoToggle: true,
            tools: [
                { type: 'button', name: 'mode' },
                'zoom-in',
                'zoom-out',
                'zoom-to-fit',
                { type: 'undo', name: 'undo' },
                { type: 'redo', name: 'redo' }
            ],
            references: {
                paperScroller: scroller,
                commandManager: this.history
            }
        });
        toolbar.render();
        this.el.querySelector('.toolbar-container').appendChild(toolbar.el);
        this.components.toolbar = toolbar;
    }

    destroyCommonComponents() {
        this.components.paper?.remove();
        delete this.components.paper;
        this.components.scroller?.remove();
        delete this.components.scroller;
        this.components.toolbar?.remove();
        delete this.components.toolbar;
    }

    updateCommonComponents() {
        const { toolbar, paper } = this.components;
        dia.HighlighterView.removeAll(paper);
        paper.removeTools();
        if (this.editable) {
            toolbar.getWidgetByName('mode').el.textContent = 'View';
            toolbar.getWidgetByName('undo').el.style.display = '';
            toolbar.getWidgetByName('redo').el.style.display = '';
            paper.setInteractivity({ linkMove: false });
        } else {
            toolbar.getWidgetByName('mode').el.textContent = 'Edit';
            toolbar.getWidgetByName('undo').el.style.display = 'none';
            toolbar.getWidgetByName('redo').el.style.display = 'none';
            paper.setInteractivity(false);
        }
    }

    createViewComponents() { }

    destroyViewComponents() { }

    createEditComponents() {
        const { scroller } = this.components;
        // Stencil
        const stencil = new ui.Stencil({
            paper: scroller,
            usePaperGrid: true,
            width: STENCIL_WIDTH,
            height: '100%',
            paperOptions: () => {
                return {
                    model: new dia.Graph({}, { cellNamespace: shapes }),
                    cellViewNamespace: shapes
                };
            },
            layout: {
                columns: 1,
                rowHeight: 'compact',
                rowGap: 10,
                columnWidth: 100,
                marginY: 10,
                // reset defaults
                resizeToFit: false,
                dx: 0,
                dy: 0
            }
        });
        stencil.render();
        this.el.querySelector('.stencil-container').appendChild(stencil.el);
        stencil.load(STENCIL_SHAPES);
        this.components.stencil = stencil;
    }

    destroyEditComponents() {
        this.components.stencil?.remove();
        delete this.components.stencil;
    }

    createGraphComponents() {
        // History
        this.history = new dia.CommandManager({ graph: this.graph });
        // Validator
        // ...
    }

    destroyGraphComponents() {
        this.history.stopListening();
        this.history = null;
    }
}

const app = new Application(document.getElementById('app'));
app.start();

// Example Graph
app.graph.fromJSON({
    cells: [
        {
            type: 'standard.Rectangle',
            position: {
                x: 200,
                y: 60
            },
            size: {
                width: 80,
                height: 60
            },
            angle: 0,
            id: '3e5de6e0-50d7-4543-a587-bee1a6a546bd',
            z: 1,
            attrs: {
                body: {
                    stroke: '#80ff95',
                    fill: 'transparent'
                },
                root: {
                    highlighterSelector: 'body'
                }
            }
        },
        {
            type: 'standard.Path',
            position: {
                x: 200,
                y: 200
            },
            size: {
                width: 80,
                height: 60
            },
            angle: 0,
            id: 'b75fea41-1582-4658-a786-a3572d6ef879',
            z: 3,
            attrs: {
                body: {
                    stroke: '#9580ff',
                    fill: 'transparent',
                    d: 'M calc(w/2) 0 calc(w) calc(h/2) calc(w/2) calc(h) 0 calc(h/2) Z'
                },
                root: {
                    highlighterSelector: 'body'
                }
            }
        },
        {
            type: 'standard.Link',
            source: {
                id: '3e5de6e0-50d7-4543-a587-bee1a6a546bd'
            },
            target: {
                id: 'b75fea41-1582-4658-a786-a3572d6ef879'
            },
            id: 'b2935d7b-4657-4126-9273-92b85ab8ed58',
            z: -1,
            attrs: {
                line: {
                    stroke: '#eaff80'
                }
            }
        },
        {
            type: 'standard.Ellipse',
            position: {
                x: 120,
                y: 320
            },
            size: {
                width: 80,
                height: 60
            },
            angle: 0,
            id: '12838f0c-f220-495c-b224-e6b48dd07b03',
            z: 5,
            attrs: {
                body: {
                    stroke: '#ff9580',
                    fill: 'transparent'
                },
                root: {
                    highlighterSelector: 'body'
                }
            }
        },
        {
            type: 'standard.Ellipse',
            position: {
                x: 280,
                y: 320
            },
            size: {
                width: 80,
                height: 60
            },
            angle: 0,
            id: '591edf2a-7764-4add-9c3e-964dfa70fd8d',
            z: 6,
            attrs: {
                body: {
                    stroke: '#ff9580',
                    fill: 'transparent'
                },
                root: {
                    highlighterSelector: 'body'
                }
            }
        },
        {
            type: 'standard.Link',
            source: {
                id: 'b75fea41-1582-4658-a786-a3572d6ef879'
            },
            target: {
                id: '12838f0c-f220-495c-b224-e6b48dd07b03'
            },
            id: '86d42dff-28b5-43f9-b206-093399b4baba',
            z: -1,
            attrs: {
                line: {
                    stroke: '#eaff80'
                }
            }
        },
        {
            type: 'standard.Link',
            source: {
                id: 'b75fea41-1582-4658-a786-a3572d6ef879'
            },
            target: {
                id: '591edf2a-7764-4add-9c3e-964dfa70fd8d'
            },
            id: 'a2de26ec-e58b-444a-94d8-aa112b8f7827',
            z: -1,
            attrs: {
                line: {
                    stroke: '#eaff80'
                }
            }
        }
    ]
});
