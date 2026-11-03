import { ui } from '@joint/plus';
// Registry
import { cellGroups, cellRegistry, resolveCellDefinition } from '../registry';
import CellOption from '../registry/models/CellOption';
// Actions
import { openDialog } from './dialog-actions';

import type { dia } from '@joint/plus';
import type { App } from '../app';
import type { CellDefinition } from '../registry';

interface CellPickerOptions {
    title: string;
    /**
     * Called with the definition of the cell the user picked.
     */
    onSelect: (definition: CellDefinition) => void;
}

/**
 * Open the cell picker dialog (the cell registry) to select a cell type.
 */
export function openCellPicker(app: App, options: CellPickerOptions) {
    const { title, onSelect } = options;
    const { cells, groups } = createCellOptions();

    const stencil = createStencil(app, groups);

    // Close the dialog when an option is selected
    stencil.on('group:element:pointerclick', (_, elementView: dia.ElementView) => {
        const definition = resolveCellDefinition(elementView.model.get('cellType'));
        dialog.close();
        stencil.remove();
        if (definition) {
            onSelect(definition);
        }
    });

    const dialog = new ui.Dialog({
        width: 700,
        title,
        content: stencil.el,
        draggable: true,
    });

    openDialog(app, dialog);

    // TS can't select correct method overload between dia.Cell[] and {[groupName: string]: dia.Cell[]}
    stencil.load(cells as unknown as dia.Cell[]);

    (stencil.el.querySelector('.search') as HTMLInputElement).focus();
}

// Helper functions

/**
 * Create stencil options for all cells in the registry grouped by their group.
 */
function createCellOptions() {
    const cells: { [groupName: string]: dia.Element[] } = {};
    const groups: { [groupName: string]: ui.Stencil.Group } = {};

    Object.entries(cellGroups).forEach(([groupId, group], index) => {
        cells[groupId] = [];
        groups[groupId] = {
            label: group.label,
            index: index + 1
        };
    });

    Object.values(cellRegistry).forEach((definition) => {
        cells[definition.group]?.push(CellOption.fromDefinition(definition));
    });

    return { cells, groups };
}

/**
 * Create a stencil instance with the given groups.
 */
function createStencil(app: App, groups?: ui.Stencil.Options['groups']): ui.Stencil {
    const stencil = new ui.Stencil({
        paper: app.scroller,
        width: 680,
        canDrag: () => false,
        search: {
            '*': ['attrs/label/text', 'attrs/description/text', 'cellType'],
        },
        paperOptions: {
            clickThreshold: 10,
            overflow: true
        },
        groups,
        layout: {
            columns: 2,
            marginX: 0,
            marginY: 10,
            resizeToFit: false,
            rowGap: 10,
            columnGap: 10,
        }
    });

    stencil.render();
    stencil.el.style.height = '500px';
    stencil.el.style.position = 'relative';

    return stencil;
}
