import { addEffect, removeEffect, EffectType } from '../effects';
import { addElementTools, removeElementTools } from '../tools';
import { removeCell } from '../utils';

let selection = null;

export function select(elementView) {
    const { paper, model } = elementView;
    deselect(paper);
    removeEffect(paper, EffectType.SelectionFrame);
    addEffect(elementView, EffectType.SelectionFrame);
    addElementTools(elementView);
    selection = [model];
}

export function deselect(paper) {
    if (!selection)
        return;
    removeElementTools(paper);
    removeEffect(paper, EffectType.SelectionFrame);
    selection = null;
}

export function getSelection() {
    return selection ? [...selection] : [];
}

export function removeSelection(graph) {
    const cells = getSelection();
    if (cells.length === 0)
        return;
    graph.startBatch('delete');
    cells.forEach((cell) => removeCell(cell));
    graph.stopBatch('delete');
    selection = null;
}
