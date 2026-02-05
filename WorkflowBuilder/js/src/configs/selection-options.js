/**
 * @file options for the Selection UI component
 * @see https://docs.jointjs.com/api/ui/Selection#options
 */
import { ui } from '@joint/plus';
import { Attribute } from '../diagram/const';
import SelectionEffect from '../diagram/effects/SelectionEffect';

export const useModelGeometry = true;

export const handles = [];

export const wrapper = false;

export const boxContent = false;

export const allowTranslate = false;

export const allowCellInteraction = true;

export const filter = (cell) => {
    // The `filter` logic is currently inverted: return true to prevent selection
    // It will be fixed in the next major release
    return !cell.get(Attribute.Selectable);
};

export const frames = new ui.HighlighterSelectionFrameList({
    highlighter: SelectionEffect,
    selector: 'root',
});
