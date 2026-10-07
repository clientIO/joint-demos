import { ui } from '@joint/plus';
import { Diagram } from './diagram';
// Controllers
import {
    SystemController,
    DiagramController,
    NetlistController,
    KeyboardController,
    SelectionController,
    ToolbarController,
    StencilController
} from './controllers';
// Configs
import {
    appConfig,
    paperOptions,
    tooltipOptions,
    toolbarOptions,
    selectionOptions,
    scrollerOptions,
    navigatorOptions
} from './configs';
// Actions
import { loadYosysJSON } from './actions/diagram-actions';
import { closeDialog } from './actions/dialog-actions';
import { closeInspector } from './actions/inspector-actions';
import { setToolbarDiagramName } from './actions/toolbar-actions';
import { updateJSONPanel } from './actions/json-actions';
// Yosys
import { diagramToYosys } from './yosys/export';
// Features
import { enableFileDrop } from './features/file-drop';
import Navigator from './features/Navigator';
import JsonPanel from './features/JsonPanel';
import { createStencil } from './features/Stencil';
import { startAvoidRouter } from './features/avoid-router';

import type { mvc } from '@joint/plus';
import type { RouterService } from '@joint/router-avoid';
import type { Controller } from './system/controllers';
import type { AppConfig } from './types';
import type { Model } from './diagram/types';
import type { YosysJSON } from './yosys/types';

export class App extends Diagram {

    /**
     * A general-purpose state map for storing arbitrary application state.
     */
    state: Map<string, unknown> = new Map();

    /**
     * Joint UI PaperScroller instance for enabling zooming and scrolling.
     * @see https://docs.jointjs.com/api/ui/PaperScroller
     * @tutorial https://docs.jointjs.com/learn/features/zoom-and-scroll
     */
    scroller: ui.PaperScroller;

    /**
     * Joint UI Tooltip instance.
     * @see https://docs.jointjs.com/api/ui/Tooltip
     * @tutorial https://docs.jointjs.com/learn/features/tooltips
     */
    tooltip: ui.Tooltip;

    /**
     * Joint UI Keyboard instance.
     * @see https://docs.jointjs.com/api/ui/Keyboard
     * @tutorial https://docs.jointjs.com/learn/features/keyboard-shortcuts
     */
    keyboard: ui.Keyboard;

    /**
     * Joint UI Selection instance.
     * @see https://docs.jointjs.com/api/ui/Selection
     * @tutorial https://docs.jointjs.com/learn/features/selection
     */
    selection: ui.Selection<mvc.Collection<Model>>;

    /**
     * Joint UI Toolbar instance.
     * @see https://docs.jointjs.com/api/ui/Toolbar
     * @tutorial https://docs.jointjs.com/learn/features/toolbar
     */
    toolbar: ui.Toolbar;

    /**
     * A custom navigator (a minimap + toolbar) for the diagram.
     * @see https://docs.jointjs.com/api/ui/Navigator (minimap part)
     * @tutorial https://docs.jointjs.com/learn/features/minimap
     */
    navigator: Navigator;

    /**
     * A read-only panel displaying the Yosys JSON of the diagram.
     */
    jsonPanel: JsonPanel;

    /**
     * Joint UI Stencil instance with the shapes to drag and drop onto the paper.
     * @see https://docs.jointjs.com/api/ui/Stencil
     * @tutorial https://docs.jointjs.com/learn/features/stencil
     */
    stencil: ui.Stencil;

    /**
     * The avoid router service routing the wires (resolved once the libavoid module is loaded).
     * @see https://www.npmjs.com/package/@joint/router-avoid
     */
    routerReady: Promise<RouterService>;

    /**
     * All controllers used in the application.
     */
    controllers: Controller<[App]>[];

    // Container elements
    paperContainerEl: HTMLElement;
    toolbarContainerEl: HTMLElement;
    navigatorContainerEl: HTMLElement;
    inspectorContainerEl: HTMLElement;
    jsonContainerEl: HTMLElement;
    stencilContainerEl: HTMLElement;

    // The name of the edited module
    private moduleName: string = appConfig.defaultModuleName;

    // The loaded Yosys document (the other modules are exported unchanged)
    private yosysDocument: YosysJSON | null = null;

    constructor(public el: HTMLElement, public config: AppConfig) {
        super(paperOptions);
        this.paperContainerEl = this.el.querySelector('.paper-container') as HTMLElement;
        this.toolbarContainerEl = this.el.querySelector('.toolbar-container') as HTMLElement;
        this.inspectorContainerEl = this.el.querySelector('.inspector-container') as HTMLElement;
        this.navigatorContainerEl = this.el.querySelector('.navigator-container') as HTMLElement;
        this.jsonContainerEl = this.el.querySelector('.json-container') as HTMLElement;
        this.stencilContainerEl = this.el.querySelector('.stencil-container') as HTMLElement;

        // Paper Scroller
        this.scroller = new ui.PaperScroller({
            ...scrollerOptions,
            paper: this.paper,
        });
        this.paperContainerEl.appendChild(this.scroller.el);

        // initialize the paper size based on the scroller options
        this.scroller.adjustPaper();

        // Selection
        this.selection = new ui.Selection({
            ...selectionOptions,
            paper: this.paper,
        });

        // Tooltip
        this.tooltip = new ui.Tooltip({
            rootTarget: el,
            ...tooltipOptions,
        });

        // Keyboard
        this.keyboard = new ui.Keyboard();

        // Toolbar
        const toolbar = this.toolbar = new ui.Toolbar({
            ...toolbarOptions,
            references: {
                paperScroller: this.scroller,
                commandManager: this.history,
            },
        });
        toolbar.render();
        this.toolbarContainerEl.appendChild(toolbar.el);
        setToolbarDiagramName(this, this.moduleName);

        // Navigator
        this.navigator = new Navigator({
            ...navigatorOptions,
            containerEl: this.navigatorContainerEl,
            paperScroller: this.scroller,
            iconUrl: 'assets/icons/navigator'
        });

        // JSON Panel
        this.jsonPanel = new JsonPanel({
            containerEl: this.jsonContainerEl,
            title: 'Yosys JSON',
            collapsed: true
        });

        // Stencil
        this.stencil = createStencil({
            containerEl: this.stencilContainerEl,
            paperScroller: this.scroller,
        });

        // Wire routing
        this.routerReady = startAvoidRouter(this.graph);

        // Call this function to render the placeholder content
        closeInspector(this);

        // Controllers
        this.controllers = [
            new SystemController(this),
            new DiagramController(this),
            new ToolbarController(this),
            new KeyboardController(this),
            new NetlistController(this),
            new SelectionController(this),
            new StencilController(this),
        ];
        this.controllers.forEach(controller => controller.startListening());

        // Features

        enableFileDrop(this.paper, {
            dropTarget: this.paperContainerEl,
            format: 'json',
        });
    }

    /**
     * Set the Yosys document the edited module comes from.
     */
    setYosysDocument(document: YosysJSON | null, moduleName: string) {
        this.yosysDocument = document;
        this.setModuleName(moduleName);
    }

    setModuleName(name?: string) {
        const moduleName = (name || '').trim() || appConfig.defaultModuleName;
        if (moduleName !== this.moduleName && this.yosysDocument?.modules[this.moduleName]) {
            // Rename the module in the document
            const { [this.moduleName]: module, ...modules } = this.yosysDocument.modules;
            this.yosysDocument = { ...this.yosysDocument, modules: { ...modules, [moduleName]: module }};
        }
        this.moduleName = moduleName;
        // Update toolbar input value
        setToolbarDiagramName(this, moduleName);
        updateJSONPanel(this);
    }

    getModuleName(): string {
        return this.moduleName;
    }

    /**
     * Get the Yosys JSON of the current diagram.
     */
    getYosysJSON(): YosysJSON {
        return diagramToYosys(this.diagramData.toJSON(), this.yosysDocument, this.moduleName);
    }

    destroy() {
        // Close any opened UI components
        closeInspector(this);
        closeDialog(this);
        // Destroy controllers
        this.controllers.forEach(controller => controller.stopListening());
        // Remove JointJS instances
        this.paper.remove();
        this.scroller.remove();
        this.tooltip.remove();
        this.selection.remove();
        this.toolbar.remove();
        this.navigator.remove();
        this.jsonPanel.remove();
        this.stencil.remove();
        this.routerReady.then(routerService => routerService.destroy());
        this.keyboard.disable();
    }

    public loadYosysJSON(json: YosysJSON) {
        loadYosysJSON(this, json);
    }
}
