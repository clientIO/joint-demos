/**
 * @file options for the Selection UI component
 * @see https://docs.jointjs.com/api/ui/Selection#options
 */
import { ui, highlighters } from '@joint/plus';
import { Attribute } from '../diagram/const';
import { getEffectSelector } from '../diagram/effects';

export const useModelGeometry: ui.Selection.Options['useModelGeometry'] = true;

export const handles: ui.Selection.Options['handles'] = [];

export const wrapper : ui.Selection.Options['wrapper'] = false;

export const boxContent : ui.Selection.Options['boxContent'] = false;

export const allowTranslate : ui.Selection.Options['allowTranslate'] = false;

export const allowCellInteraction : ui.Selection.Options['allowCellInteraction'] = true;

export const filter: ui.Selection.Options['filter'] = (cell) => {
    // The `filter` logic is currently inverted: return true to prevent selection
    // It will be fixed in the next major release
    return !cell.get(Attribute.Selectable);
};

export const frames: ui.Selection.Options['frames'] = new ui.HighlighterSelectionFrameList({
    highlighter: highlighters.addClass,
    selector: (cell) => getEffectSelector(cell),
    options: { className: 'selected' }
});
