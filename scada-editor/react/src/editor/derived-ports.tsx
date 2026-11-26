import { elementPorts, useOnGraphEvents, type ElementPort } from '@joint/react-plus';
import { dia } from '@joint/plus';
import { portMapOf, shapePortsOf } from '../shapes/geometry';
import { specOf } from '../shapes/registry';
import { isShapeData } from '../shapes/shape-data';

/** Whether a value is a cell's port style: an object of port presentation, every key optional. */
const isPortStyle = (value: unknown): value is Partial<ElementPort> => typeof value === 'object' && value !== null;

/*
 * The ports made of the size and the data of an element (a shape whose `ports` is a function: the taps of a busbar)
 * follow them: written in the same step as the change (a resize, an edit of the data) - one step of the history, an
 * undo brings back both. A port of an undo is not written again: the history restores it with the size.
 */

/** The options of a change that a port follows in: not in the history when the change is not. */
type ChangeOptions = { readonly skipHistory?: boolean };

/** Keeps the ports made of the size and the data of the elements up to date (see above). */
export function DerivedPorts() {
    const refresh = (cell: unknown, _value: unknown, options: ChangeOptions) => {
        // An element's change (not one of the graph's own attributes of the same name).
        if (!(cell instanceof dia.Element)) {
            return;
        }
        const data: unknown = cell.get('data');
        if (!isShapeData(data)) {
            return;
        }
        const spec = specOf(data.kind);
        if (typeof spec?.ports !== 'function') {
            return;
        }
        const portMap = portMapOf(shapePortsOf(spec, data, cell.size()));
        // On the model, in the change, as `setCell()` writes a port map (the map and the ports of it): `setCell()`
        // here would merge over the record of the store, which follows the change only after it - the size written
        // back. Ports equal to the ones it has change nothing (no step of the history).
        const portStyle: unknown = cell.get('portStyle');
        cell.set({ portMap, ports: elementPorts(portMap, isPortStyle(portStyle) ? portStyle : undefined) }, options.skipHistory ? { skipHistory: true } : {});
    };

    useOnGraphEvents({ 'change:size': refresh, 'change:data': refresh });
    return null;
}
