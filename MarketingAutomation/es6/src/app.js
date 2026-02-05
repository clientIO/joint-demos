import { ui } from '@joint/plus';
import { Diagram } from './diagram';
// Controllers
import { SystemController, DiagramController, NodesController, KeyboardController, SelectionController, ToolbarController } from './controllers';
// Configs
import { appConfig, paperOptions, tooltipOptions, toolbarOptions, selectionOptions, scrollerOptions, navigatorOptions } from './configs';
// Actions
import { loadDiagram } from './actions/diagram-actions';
import { closeDialog } from './actions/dialog-actions';
import { closeInspector } from './actions/inspector-actions';
import { setToolbarDiagramName } from './actions/toolbar-actions';
// Features
import { enableFileDrop } from './features/file-drop';
import Navigator from './features/Navigator';

export class App extends Diagram {
    
    constructor(el, config) {
        super(paperOptions);
        this.el = el;
        this.config = config;
        
        /**
         * A general-purpose state map for storing arbitrary application state.
         */
        this.state = new Map();
        
        /**
         * Diagram name that is set as the name of exported diagram file.
         */
        this.diagramName = '';
        this.paperContainerEl = this.el.querySelector('.paper-container');
        this.toolbarContainerEl = this.el.querySelector('.toolbar-container');
        this.inspectorContainerEl = this.el.querySelector('.inspector-container');
        this.navigatorContainerEl = this.el.querySelector('.navigator-container');
        
        // Paper Scroller
        this.scroller = new ui.PaperScroller(Object.assign(Object.assign({}, scrollerOptions), { paper: this.paper }));
        this.paperContainerEl.appendChild(this.scroller.el);
        
        // Selection
        this.selection = new ui.Selection(Object.assign(Object.assign({}, selectionOptions), { paper: this.paper }));
        
        // Tooltip
        this.tooltip = new ui.Tooltip(Object.assign({ rootTarget: el }, tooltipOptions));
        
        // Keyboard
        this.keyboard = new ui.Keyboard();
        
        // Toolbar
        const toolbar = this.toolbar = new ui.Toolbar(Object.assign(Object.assign({}, toolbarOptions), { references: {
                paperScroller: this.scroller,
                commandManager: this.history,
            } }));
        toolbar.render();
        this.setDiagramName();
        this.toolbarContainerEl.appendChild(toolbar.el);
        
        // Navigator
        this.navigator = new Navigator(Object.assign(Object.assign({}, navigatorOptions), { containerEl: this.navigatorContainerEl, paperScroller: this.scroller, iconUrl: 'assets/icons/navigator' }));
        
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
    
    setDiagramName(name) {
        const diagramName = name || appConfig.defaultDiagramName;
        this.diagramName = diagramName;
        // Update toolbar input value
        setToolbarDiagramName(this, diagramName);
    }
    
    getDiagramName() {
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
    
    loadDiagram(json) {
        loadDiagram(this, json);
    }
}
