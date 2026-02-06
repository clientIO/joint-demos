import * as joint from '@joint/plus';

export class KeyboardService {

    keyboard: joint.ui.Keyboard;

    constructor() {
        this.keyboard = new joint.ui.Keyboard();
    }

    create(
        graph: joint.dia.Graph,
        clipboard: joint.ui.Clipboard,
        selection: joint.ui.Selection,
        paperScroller: joint.ui.PaperScroller,
        commandManager: joint.dia.CommandManager
    ) {

        this.keyboard.on({

            'ctrl+c': () => {

                // Copy all selected elements and their associated links.
                clipboard.copyElements(selection.collection, graph);
            },

            'ctrl+v': () => {

                const pastedCells = clipboard.pasteCells(graph);

                const elements = pastedCells.filter(cell => cell.isElement());

                // Make sure pasted elements get selected immediately. This makes the UX better as
                // the user can immediately manipulate the pasted elements.
                selection.collection.reset(elements);
            },

            'ctrl+x shift+delete': () => {
                clipboard.cutElements(selection.collection, graph);
            },

            'delete backspace': (evt: joint.dia.Event) => {
                evt.preventDefault();
                graph.removeCells(selection.collection.toArray());
            },

            'ctrl+z': () => {
                commandManager.undo();
                selection.cancelSelection();
            },

            'ctrl+y': () => {
                commandManager.redo();
                selection.cancelSelection();
            },

            'ctrl+a': () => {
                selection.collection.reset(graph.getElements());
            },

            'ctrl+plus': (evt: joint.dia.Event) => {
                evt.preventDefault();
                paperScroller.zoom(0.2, { max: 5, grid: 0.2 });
            },

            'ctrl+minus': (evt: joint.dia.Event) => {
                evt.preventDefault();
                paperScroller.zoom(-0.2, { min: 0.2, grid: 0.2 });
            },

            'keydown:shift': (_evt: joint.dia.Event) => {
                paperScroller.setCursor('crosshair');
            },

            'keyup:shift': () => {
                paperScroller.setCursor('grab');
            }
        });
    }
}
