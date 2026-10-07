/**
 * @file Definitions of the HDL cell registry.
 * Every Yosys cell type supported by the editor is described by a `CellDefinition`.
 * The definition is the single source of truth for the diagram shape, the ports,
 * the inspector parameters, the picker dialog and the Yosys JSON conversion.
 */
import type { YosysValue } from '../yosys/types';

/**
 * Side of the node the port is placed on.
 */
export type PortSide = 'WEST' | 'EAST' | 'SOUTH';

export type PortDirection = 'in' | 'out';

/**
 * Normalized cell parameters as stored in the diagram data,
 * e.g. `{ WIDTH: 8, SIGNED: 0 }`.
 */
export type CellParameters = Record<string, number | string>;

export interface CellPortDefinition {
    /** Yosys port name, e.g. `A`, `Y`, `CLK` */
    id: string;
    direction: PortDirection;
    /** Defaults to WEST for inputs and EAST for outputs */
    side?: PortSide;
    /** Clock inputs are drawn with a clock triangle */
    clock?: boolean;
    /** Name of the parameter defining the active level of the port (bubble when 0) */
    polarity?: string;
    /** Width of the port in bits */
    width: (parameters: CellParameters) => number;
}

export interface CellParameterDefinition {
    label: string;
    /**
     * - `width`: a positive integer (bus width)
     * - `boolean`: 0 or 1
     * - `polarity`: 1 = active high / rising edge, 0 = active low / falling edge
     * - `bits`: a binary constant (MSB first) as wide as the `WIDTH` parameter
     */
    type: 'width' | 'boolean' | 'polarity' | 'bits';
    default: number | string;
    hint?: string;
}

export interface CellDefinition {
    /** Yosys cell type, e.g. `$and` */
    type: string;
    /** Diagram shape type used to render the cell */
    shape: string;
    /** Registry group (picker dialog section) */
    group: string;
    /** Short name displayed in the picker and the inspector */
    name: string;
    description: string;
    /** Key of the symbol drawn by the shape (shape specific) */
    symbol: string;
    ports: CellPortDefinition[];
    parameters: Record<string, CellParameterDefinition>;
    /** Convert the normalized parameters to the Yosys cell parameters */
    toYosysParameters: (parameters: CellParameters) => Record<string, YosysValue>;
    /** Convert the Yosys cell parameters to the normalized parameters */
    fromYosysParameters: (parameters: Record<string, YosysValue>) => CellParameters;
}

export interface CellGroupDefinition {
    label: string;
}

export type CellRegistry = Record<string, CellDefinition>;
