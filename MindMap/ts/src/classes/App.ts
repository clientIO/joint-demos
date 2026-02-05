import type { dia, ui, layout } from '@joint/plus';
import type { Controller as _Controller } from './Controller';
import type IdeaCollection from './IdeaCollection';
import type TreeGraph from './TreeGraph';
import { plugins } from '../plugins';
import EditController from '../controllers/EditController';
import ViewController from '../controllers/ViewController';
import SelectionController from '../controllers/SelectionController';
import LayoutController from '../controllers/LayoutController';
import { Idea } from '../shapes/idea';
import type { Connection } from '../shapes/connection';

export namespace App {

    export type Callback<
        TFunction extends (...args: any) => void = (...args: any) => void
    > = _Controller.Callback<App, TFunction>;

    export type Controller = _Controller<App>;
}

export class App {

    constructor(public readonly el: HTMLElement) {
    }

    graph: TreeGraph<Idea, Connection>;
    paper: dia.Paper;
    scroller: ui.PaperScroller;
    keyboard: ui.Keyboard;
    tree: layout.TreeLayout;
    treeView: ui.TreeLayoutView;
    selection: IdeaCollection;
    controllers: App.Controller[];
    history: dia.CommandManager;
    toolbar: ui.Toolbar;

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
