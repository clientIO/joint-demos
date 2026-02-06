import { dia, ui, layout } from '@joint/plus';
import TreeGraph from '../classes/TreeGraph';
import IdeaCollection from '../classes/IdeaCollection';
import { shapes } from '../shapes';
import toolbarConfig from './config/toolbar';
import paperConfig from './config/paper';
import scrollerConfig from './config/scroller';
import treeConfig from './config/tree';
import treeViewConfig from './config/treeView';
import historyConfig from './config/history';

export function plugins(el) {
    
    const graph = new TreeGraph({}, {
        cellNamespace: shapes
    });
    
    const paper = new dia.Paper({
        ...paperConfig,
        model: graph,
        cellViewNamespace: shapes,
    });
    
    const scroller = new ui.PaperScroller({
        ...scrollerConfig,
        paper,
    });
    
    el.appendChild(scroller.el);
    scroller.render();
    
    const tree = new layout.TreeLayout({
        ...treeConfig,
        graph,
    });
    
    const treeView = new ui.TreeLayoutView({
        ...treeViewConfig,
        model: tree,
        paper,
        paperOptions: {
            cellViewNamespace: shapes
        }
    });
    treeView.disable();
    
    const keyboard = new ui.Keyboard();
    
    const selection = new IdeaCollection();
    
    const history = new dia.CommandManager({
        ...historyConfig,
        graph,
    });
    
    const toolbar = new ui.Toolbar({
        ...toolbarConfig,
        references: {
            paperScroller: scroller,
            commandManager: history
        }
    });
    
    el.appendChild(toolbar.el);
    toolbar.render();
    
    return {
        graph,
        paper,
        scroller,
        selection,
        keyboard,
        tree,
        treeView,
        history,
        toolbar,
    };
}
