import { NodeTypes, Attribute } from '../const';
import { getDefaultParameters, toInt } from '../../registry';

import type { CellDefinition } from '../../registry';
import type { DiagramJSON, NodeData } from '../types';

/**
 * Create the data of a new cell. If `width` is given, the cell is made
 * as wide as possible to match it.
 */
export function getDefaultCellData(definition: CellDefinition, json: DiagramJSON, width?: number): NodeData {
    const parameters = getDefaultParameters(definition);
    if (width && 'WIDTH' in parameters) {
        parameters.WIDTH = width;
        if ('ARST_VALUE' in parameters) {
            parameters.ARST_VALUE = '0'.repeat(width);
        }
    }
    return {
        type: definition.shape as NodeData['type'],
        [Attribute.Name]: getUniqueName(json, definition.type.replace(/[$_]/g, '').toLowerCase()),
        [Attribute.CellType]: definition.type,
        [Attribute.Parameters]: parameters,
    };
}

export function getDefaultInputData(json: DiagramJSON, width = 1): NodeData {
    return {
        type: NodeTypes.Input,
        [Attribute.Name]: getUniqueName(json, 'in'),
        [Attribute.Width]: width,
    };
}

export function getDefaultOutputData(json: DiagramJSON, width = 1): NodeData {
    return {
        type: NodeTypes.Output,
        [Attribute.Name]: getUniqueName(json, 'out'),
        [Attribute.Width]: width,
    };
}

export function getDefaultConstantData(width = 1): NodeData {
    return {
        type: NodeTypes.Constant,
        [Attribute.Value]: '0'.repeat(Math.max(1, width)),
    };
}

/**
 * Get a name with the given prefix which is not used by any node yet (e.g. `and2`).
 */
export function getUniqueName(json: DiagramJSON, prefix: string): string {
    const names = new Set(Object.values(json).map(node => node[Attribute.Name]));
    let index = 0;
    while (names.has(`${prefix}${index}`)) {
        index++;
    }
    return `${prefix}${index}`;
}

/**
 * Get the width of the cell parameters (used to keep the width when changing the cell type).
 */
export function getDataWidth(data: NodeData): number | undefined {
    const parameters = data[Attribute.Parameters] as Record<string, number | string> | undefined;
    if (parameters && 'WIDTH' in parameters) return toInt(parameters.WIDTH, 1);
    return undefined;
}
