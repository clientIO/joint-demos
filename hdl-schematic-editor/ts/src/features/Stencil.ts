import { ui } from '@joint/plus';
import { cellNamespace, applicationModelNamespace } from '../diagram/namespaces';
import { Attribute } from '../diagram/const';
import { Input, Output, Constant } from '../diagram/models';
import { cellGroups, cellRegistry, getCellShortName, getDefaultParameters } from '../registry';

import type { dia } from '@joint/plus';
import type { NodeTypes } from '../diagram/const';

/**
 * Options for the stencil feature.
 */
export interface StencilOptions {
    containerEl: HTMLElement;
    paperScroller: ui.PaperScroller;
}

/**
 * The group of the module ports and constants.
 */
const PORTS_GROUP = 'ports';

/**
 * Create the stencil with all the shapes: the module ports, the constant
 * and all the cells defined in the cell registry.
 * The shapes are dragged and dropped onto the paper.
 */
export function createStencil(options: StencilOptions): ui.Stencil {
    const { containerEl, paperScroller } = options;

    const groups: { [groupName: string]: ui.Stencil.Group } = {
        [PORTS_GROUP]: { label: 'Ports', index: 0 }
    };
    Object.entries(cellGroups).forEach(([groupId, group], index) => {
        groups[groupId] = { label: group.label, index: index + 1 };
    });

    const stencil = new ui.Stencil({
        paper: paperScroller,
        width: '100%',
        groups,
        // Snap the dropped shapes to the paper grid
        usePaperGrid: true,
        dropAnimation: false,
        search: {
            '*': [Attribute.Name, Attribute.CellType, 'type'],
        },
        paperOptions: {
            cellViewNamespace: cellNamespace,
            // The shapes in the stencil are not interactive (e.g. no wire dragging from the ports)
            interactive: false,
            background: { color: 'transparent' },
        },
        layout: {
            columns: 3,
            columnWidth: 'compact',
            rowHeight: 'compact',
            horizontalAlign: 'middle',
            verticalAlign: 'middle',
            marginX: 16,
            marginY: 24,
            columnGap: 20,
            rowGap: 30,
            resizeToFit: false,
        }
    });

    stencil.render();
    containerEl.appendChild(stencil.el);

    stencil.load(createStencilShapes() as unknown as dia.Cell[]);

    return stencil;
}

/**
 * Create the stencil shapes grouped by the stencil groups.
 */
function createStencilShapes(): { [groupName: string]: dia.Element[] } {
    const shapes: { [groupName: string]: dia.Element[] } = {
        [PORTS_GROUP]: [
            new Input({ [Attribute.Name]: 'in' }),
            new Output({ [Attribute.Name]: 'out' }),
            new Constant({ [Attribute.Value]: '0' }),
        ]
    };
    Object.keys(cellGroups).forEach((groupId) => {
        shapes[groupId] = [];
    });
    Object.values(cellRegistry).forEach((definition) => {
        const ShapeClass = applicationModelNamespace[definition.shape as typeof NodeTypes[keyof typeof NodeTypes]];
        if (!ShapeClass) return;
        shapes[definition.group]?.push(new ShapeClass({
            [Attribute.CellType]: definition.type,
            [Attribute.Parameters]: getDefaultParameters(definition),
            // The name is displayed below the shape in the stencil
            [Attribute.Name]: getCellShortName(definition),
        }));
    });
    return shapes;
}
