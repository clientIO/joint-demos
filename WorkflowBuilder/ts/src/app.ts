import { ui } from '@joint/plus';
import { Diagram } from './diagram';
// Controllers
import {
    SystemController,
    DiagramController,
    NodesController,
    KeyboardController,
    SelectionController,
    ToolbarController
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
}from './configs';
// Actions
import { loadDiagram } from './actions/diagram-actions';
import { closeDialog } from './actions/dialog-actions';
import { closeInspector } from './actions/inspector-actions';
import { setToolbarDiagramName } from './actions/toolbar-actions';
// Features
import { enableFileDrop } from './features/file-drop';
import Navigator from './features/Navigator';

import type { mvc } from '@joint/plus';
import type { DiagramFileJSON } from './diagram/types';
import type { Controller } from './system/controllers';
import type { AppConfig } from './types';
import type { Model } from './diagram/types';

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
     * All controllers used in the application.
     */
    controllers: Controller<[App]>[];

    // Container elements
    paperContainerEl: HTMLElement;
    toolbarContainerEl: HTMLElement;
    navigatorContainerEl: HTMLElement;
    inspectorContainerEl: HTMLElement;

    // Current diagram name
    private diagramName: string = '';

    constructor(public el: HTMLElement, public config: AppConfig) {
        super(paperOptions);
        this.paperContainerEl = this.el.querySelector('.paper-container') as HTMLElement;
        this.toolbarContainerEl = this.el.querySelector('.toolbar-container') as HTMLElement;
        this.inspectorContainerEl = this.el.querySelector('.inspector-container') as HTMLElement;
        this.navigatorContainerEl = this.el.querySelector('.navigator-container') as HTMLElement;

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
        this.setDiagramName();
        this.toolbarContainerEl.appendChild(toolbar.el);

        // Navigator
        this.navigator = new Navigator({
            ...navigatorOptions,
            containerEl: this.navigatorContainerEl,
            paperScroller: this.scroller,
            iconUrl: 'assets/icons/navigator'
        });

        // Call this function to render the placeholder content
        closeInspector(this);

        // Controllers
        this.controllers = [
            new SystemController(this),
            new DiagramController(this),
            new ToolbarController(this),
            new KeyboardController(this),
            new NodesController(this),
            new SelectionController(this),
        ];
        this.controllers.forEach(controller => controller.startListening());

        // Features

        enableFileDrop(this.paper, {
            dropTarget: this.paperContainerEl,
            format: 'json',
        });
    }

    setDiagramName(name?: string) {
        const diagramName = name || appConfig.defaultDiagramName;

        this.diagramName = diagramName;
        // Update toolbar input value
        setToolbarDiagramName(this, diagramName);
    }

    getDiagramName(): string {
        return this.diagramName;
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
        this.keyboard.disable();
    }

    public loadDiagram(json: DiagramFileJSON) {
        loadDiagram(this, json);
    }
}
