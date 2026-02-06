import { dia, shapes, ui } from '@joint/plus';
import { columns, tasks as defaultTasks, dependencies as defaultDependencies } from './kanban/data';
import { Kanban } from './kanban/kanban';
import { Task as TaskShape, Header as HeaderShape, Dependency as DependencyShape, AnimatedElementView } from './shapes';

const STORAGE_KEY = 'joint.kanban.board';

export const init = () => {
    
    const graph = new dia.Graph({}, { cellNamespace: shapes });
    
    const paper = new dia.Paper({
        el: document.getElementById('paper'),
        width: 1000,
        height: 800,
        model: graph,
        background: { color: '#F3F7F6' },
        moveThreshold: 10,
        clickThreshold: 10,
        async: true,
        autoFreeze: true,
        frozen: true,
        viewManagement: {
            disposeHidden: true,
        },
        sorting: dia.Paper.sorting.APPROX,
        cellViewNamespace: shapes,
        elementView: (element) => {
            if (TaskShape.isTask(element)) {
                return AnimatedElementView;
            }
            else {
                return dia.ElementView;
            }
        },
        interactive: false,
        preventDefaultBlankAction: false,
        defaultConnector: {
            name: 'curve',
            args: {
                distanceCoefficient: 0.2
            }
        },
        highlighting: {
            connecting: {
                name: 'addClass',
                options: {
                    className: 'highlighter-connection'
                }
            }
        },
        labelsLayer: true,
        linkPinning: false,
        multiLinks: false,
        validateConnection: (sourceView, _, targetView) => {
            const source = sourceView.model;
            const target = targetView.model;
            if (source === target)
                return false;
            if (!TaskShape.isTask(source))
                return false;
            if (!TaskShape.isTask(target))
                return false;
            return true;
        },
        defaultConnectionPoint: { name: 'anchor' },
        defaultAnchor: function (elementView, _magnet, _ref, _opt) {
            const link = this.model;
            const element = elementView.model;
            const source = link.getSourceElement();
            const target = link.getTargetElement();
            if (!source || !target)
                return element.getBBox().rightMiddle();
            const sourceStack = source.get('stackIndex');
            const targetStack = target.get('stackIndex');
            const offset = 30;
            if (sourceStack === targetStack) {
                return element.getBBox().rightMiddle();
            }
            else if (sourceStack > targetStack) {
                if (source === element) {
                    return element.getBBox().leftMiddle().offset(0, offset);
                }
                return element.getBBox().rightMiddle().offset(0, -offset);
            }
            else {
                if (source === element) {
                    return element.getBBox().rightMiddle().offset(0, -offset);
                }
                return element.getBBox().leftMiddle().offset(0, offset);
            }
        },
        defaultLink: () => {
            return new DependencyShape();
        }
    });
    
    let tasks;
    let dependencies;
    let cmdBuffer;
    let showDependencyTool = true;
    const savedBoardString = localStorage.getItem(STORAGE_KEY);
    if (savedBoardString) {
        try {
            const savedBoard = JSON.parse(savedBoardString);
            tasks = savedBoard.tasks;
            dependencies = savedBoard.dependencies;
            cmdBuffer = savedBoard.cmdBuffer;
            showDependencyTool = savedBoard.showDependencyTool;
        }
        catch {
            localStorage.removeItem(STORAGE_KEY);
        }
    }
    
    const kanban = new Kanban({
        paper,
        topLeft: {
            x: 20,
            y: 50
        },
        tasks: tasks || defaultTasks,
        columns,
        dependencies: dependencies || defaultDependencies,
        showDependencyTool
    });
    
    paper.unfreeze({
        cellVisibility: (cell) => {
            return kanban.showDependencyTool ? true : cell.isElement();
        }
    });
    
    const cmd = new dia.CommandManager({
        graph,
        stackLimit: 20,
        cmdBeforeAdd: function (_cmdName, cell, _graph, options = {}) {
            if (HeaderShape.isHeader(cell))
                return false;
            return !options.ignoreCommandManager;
        }
    });
    
    if (cmdBuffer) {
        cmd.fromJSON(cmdBuffer);
    }
    
    cmd.on('stack:undo stack:redo', () => kanban.layoutView.model.update());
    cmd.on('stack', () => save());
    
    const toolbar = new ui.Toolbar({
        el: document.getElementById('toolbar'),
        tools: [
            'undo',
            'redo',
            {
                name: 'dependencies',
                type: 'checkbox',
                label: 'Dependencies',
                value: kanban.showDependencyTool
            }
        ],
        autoToggle: true,
        references: { commandManager: cmd }
    });
    
    toolbar.on('dependencies:change', (enabled) => {
        kanban.showDependencyTool = enabled;
        kanban.unselectTask();
        // Re-run the `cellVisibility` check to update the visibility of dependencies
        paper.wakeUp();
        save();
    });
    
    toolbar.render();
    
    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            tasks: kanban.tasks,
            dependencies: kanban.dependencies,
            showDependencyTool: kanban.showDependencyTool,
            cmdBuffer: cmd.toJSON()
        }));
    }
};
