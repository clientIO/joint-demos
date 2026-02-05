import { plugins } from '../plugins';
import EditController from '../controllers/EditController';
import ViewController from '../controllers/ViewController';
import SelectionController from '../controllers/SelectionController';
import LayoutController from '../controllers/LayoutController';
import { Idea } from '../shapes/idea';

export class App {
    
    constructor(el) {
        this.el = el;
    }
    
    start() {
        Object.assign(this, plugins(this.el));
        Idea.sandbox = this.paper.svg;
        this.controllers = [
            new LayoutController(this),
            new SelectionController(this),
            new ViewController(this),
            new EditController(this),
        ];
    }
    
    stop() {
        const { paper, scroller, keyboard, treeView, controllers, toolbar } = this;
        controllers.forEach(controller => controller.stopListening());
        paper.remove();
        scroller.remove();
        treeView.remove();
        toolbar.remove();
        keyboard.disable();
    }
    
    startControllers() {
        this.controllers.forEach(controller => controller.startListening());
    }
    
    stopControllers() {
        this.controllers.forEach(controller => controller.stopListening());
    }
}
