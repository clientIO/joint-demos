import { ui } from '@joint/plus';
import { Diagram } from './diagram';
// Controllers
import { SystemController, DiagramController, NodesController, KeyboardController, SelectionController, ToolbarController } from './controllers';
// Configs
import { paperOptions, tooltipOptions, toolbarOptions, selectionOptions, scrollerOptions, navigatorOptions } from './configs';
// Actions
import { loadDiagram } from './actions/diagram-actions';
import { closeDialog } from './actions/dialog-actions';
import { closeInspector } from './actions/inspector-actions';
// Features
import { enableFileDrop } from './features/file-drop';
import Navigator from './features/Navigator';

export class App extends Diagram {
    el;
    config;
    
    /**
     * A general-purpose state map for storing arbitrary application state.
     */
    state = new Map();
    
    /**
     * Joint UI PaperScroller instance for enabling zooming and scrolling.
     * @see https://docs.jointjs.com/api/ui/PaperScroller
     * @tutorial https://docs.jointjs.com/learn/features/zoom-and-scroll
     */
    scroller;
    
    /**
     * Joint UI Tooltip instance.
     * @see https://docs.jointjs.com/api/ui/Tooltip
     * @tutorial https://docs.jointjs.com/learn/features/tooltips
     */
    tooltip;
    
    /**
     * Joint UI Keyboard instance.
     * @see https://docs.jointjs.com/api/ui/Keyboard
     * @tutorial https://docs.jointjs.com/learn/features/keyboard-shortcuts
     */
    keyboard;
    
    /**
     * Joint UI Selection instance.
     * @see https://docs.jointjs.com/api/ui/Selection
     * @tutorial https://docs.jointjs.com/learn/features/selection
     */
    selection;
    
    /**
     * Joint UI Toolbar instance.
     * @see https://docs.jointjs.com/api/ui/Toolbar
     * @tutorial https://docs.jointjs.com/learn/features/toolbar
     */
    toolbar;
    
    /**
     * A custom navigator (a minimap + toolbar) for the diagram.
     * @see https://docs.jointjs.com/api/ui/Navigator (minimap part)
     * @tutorial https://docs.jointjs.com/learn/features/minimap
     */
    navigator;
    
    /**
     * All controllers used in the application.
     */
    controllers;
    
    // Container elements
    paperContainerEl;
    toolbarContainerEl;
    navigatorContainerEl;
    inspectorContainerEl;
    
    constructor(el, config) {
        super(paperOptions);
        this.el = el;
        this.config = config;
        this.paperContainerEl = this.el.querySelector('.paper-container');
        this.toolbarContainerEl = this.el.querySelector('.toolbar-container');
        this.inspectorContainerEl = this.el.querySelector('.inspector-container');
        this.navigatorContainerEl = this.el.querySelector('.navigator-container');
        
        // Paper Scroller
        this.scroller = new ui.PaperScroller({
            ...scrollerOptions,
            paper: this.paper,
        });
        this.paperContainerEl.appendChild(this.scroller.el);
        
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
        
        // Navigator
        this.navigator = new Navigator({
            ...navigatorOptions,
            containerEl: this.navigatorContainerEl,
            paperScroller: this.scroller,
            iconUrl: 'assets/icons/navigator',
        });
        
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
    
    loadDiagram(json) {
        loadDiagram(this, json);
    }
}
