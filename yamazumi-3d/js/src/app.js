import { dia, ui } from '@joint/plus';
import { operators } from './yamazumi-3d/data';
import { Yamazumi3D } from './yamazumi-3d/yamazumi-3d';
import { RectPrism, RectPrismView } from './yamazumi-3d/shapes/rect-prism';
import { TaskElement, TaskElementView } from './yamazumi-3d/shapes/task-element';
import { BottomElement, BottomElementView } from './yamazumi-3d/shapes/bottom-element';

const yamazumiShapes = {
    yamazumi: {
        RectPrism,
        RectPrismView,
        BottomElement,
        BottomElementView,
        TaskElement,
        TaskElementView
    }
};

export const init = () => {
    
    const graph = new dia.Graph({}, { cellNamespace: yamazumiShapes });
    
    const paper = new dia.Paper({
        el: document.getElementById('paper'),
        width: 1000,
        height: 650,
        model: graph,
        drawGrid: { name: 'mesh', color: '#d4d4d4' },
        background: { color: '#FBFBFB' },
        moveThreshold: 10,
        clickThreshold: 10,
        async: true,
        sorting: dia.Paper.sorting.APPROX,
        cellViewNamespace: yamazumiShapes,
        interactive: false,
    });
    
    paper.on('cell:pointerdown', (view, evt) => {
        if (!view.isDefaultInteractionPrevented(evt)) {
            const el = document.activeElement;
            el.blur();
        }
    });
    
    paper.on('cell:pointermove', (view) => {
        view.el.classList.add('dragging');
        paper.hideTools();
    });
    
    paper.on('cell:pointerup', (view) => {
        view.el.classList.remove('dragging');
        paper.showTools();
    });
    paper.on('blank:pointerdown', () => {
        const el = document.activeElement;
        el.blur();
    });
    
    const yamazumi = new Yamazumi3D({
        paper,
        topLeft: {
            x: 100,
            y: 60
        },
        maxDuration: 70,
        height: 530,
        operators: operators,
    });
    
    const acceptCommandsList = ['change:stackIndex', 'change:stackElementIndex', 'change:duration', 'remove'];
    
    const cmd = new dia.CommandManager({
        graph,
        cmdBeforeAdd: (cmdName) => {
            if (acceptCommandsList.includes(cmdName)) {
                return true;
            }
            return false;
        }
    });
    
    cmd.on('stack:undo stack:redo', () => {
        yamazumi.layoutView.model.update();
    });
    
    const toolbar = new ui.Toolbar({
        el: document.getElementById('toolbar'),
        tools: ['undo', 'redo'],
        autoToggle: true,
        references: { commandManager: cmd }
    });
    
    toolbar.render();
};
