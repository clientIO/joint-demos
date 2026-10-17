/**
 * @file The registry of supported Yosys cells.
 *
 * The first iteration covers the most common RTL cells. To support another
 * Yosys cell type, add a definition here (and a symbol to the shape, if needed).
 * Cells without a definition are still imported - they are displayed
 * as generic blocks and exported back unchanged.
 */
import type { YosysValue } from '../yosys/types';
import type { CellDefinition, CellGroupDefinition, CellParameters, CellParameterDefinition, CellRegistry } from './types';

export * from './types';

/**
 * Groups of the cells in the picker dialog.
 */
export const cellGroups: Record<string, CellGroupDefinition> = {
    logic: { label: 'Logic gates' },
    arithmetic: { label: 'Arithmetic' },
    comparison: { label: 'Comparison' },
    selection: { label: 'Selection' },
    sequential: { label: 'Registers' },
};

// Shape types (see diagram/models)
const GATE = 'hdl.Gate';
const OPERATOR = 'hdl.Operator';
const MUX = 'hdl.Mux';
const REGISTER = 'hdl.Register';

// Parameter definitions

const WIDTH: CellParameterDefinition = {
    label: 'Width',
    type: 'width',
    default: 1,
    hint: 'The number of bits of the data ports.'
};

const SIGNED: CellParameterDefinition = {
    label: 'Signed',
    type: 'boolean',
    default: 0,
    hint: 'Treat the operands as signed numbers.'
};

const CLK_POLARITY: CellParameterDefinition = {
    label: 'Clock edge',
    type: 'polarity',
    default: 1,
};

const EN_POLARITY: CellParameterDefinition = {
    label: 'Enable level',
    type: 'polarity',
    default: 1,
};

const ARST_POLARITY: CellParameterDefinition = {
    label: 'Reset level',
    type: 'polarity',
    default: 1,
};

const ARST_VALUE: CellParameterDefinition = {
    label: 'Reset value',
    type: 'bits',
    default: '0',
    hint: 'Binary value loaded into the register on reset (MSB first).'
};

// Port width helpers

const one = () => 1;
const width = (parameters: CellParameters) => toInt(parameters.WIDTH, 1);

// Yosys parameter helpers

/**
 * Parse a Yosys parameter value. Integers are written as binary strings
 * by Yosys, unless the `-compat-int` option is used.
 */
export function toInt(value: YosysValue | undefined, defaultValue = 0): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && /^[01]+$/.test(value)) return parseInt(value, 2);
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) return parseInt(value, 10);
    return defaultValue;
}

/**
 * Get a binary string (MSB first) of the given width.
 */
export function toBinary(value: YosysValue | undefined, bitWidth: number): string {
    let bits: string;
    if (typeof value === 'number') {
        bits = value.toString(2);
    } else if (typeof value === 'string' && /^[01xz]+$/.test(value)) {
        bits = value;
    } else {
        bits = '0';
    }
    if (bits.length > bitWidth) return bits.slice(bits.length - bitWidth);
    return bits.padStart(bitWidth, '0');
}

const unaryToYosys = (p: CellParameters) => ({
    A_SIGNED: toInt(p.SIGNED),
    A_WIDTH: width(p),
    Y_WIDTH: width(p),
});

const unaryFromYosys = (p: Record<string, YosysValue>) => ({
    WIDTH: toInt(p.Y_WIDTH, 1),
    SIGNED: toInt(p.A_SIGNED),
});

const binaryToYosys = (p: CellParameters) => ({
    A_SIGNED: toInt(p.SIGNED),
    A_WIDTH: width(p),
    B_SIGNED: toInt(p.SIGNED),
    B_WIDTH: width(p),
    Y_WIDTH: width(p),
});

const binaryFromYosys = (p: Record<string, YosysValue>) => ({
    WIDTH: toInt(p.Y_WIDTH, 1),
    SIGNED: toInt(p.A_SIGNED),
});

const compareToYosys = (p: CellParameters) => ({
    ...binaryToYosys(p),
    Y_WIDTH: 1,
});

const compareFromYosys = (p: Record<string, YosysValue>) => ({
    WIDTH: Math.max(toInt(p.A_WIDTH, 1), toInt(p.B_WIDTH, 1)),
    SIGNED: toInt(p.A_SIGNED),
});

const noParameters = () => ({});

// Definition factories

function gate(type: string, symbol: string, name: string, description: string): CellDefinition {
    return {
        type,
        shape: GATE,
        group: 'logic',
        name,
        description,
        symbol,
        ports: [
            { id: 'A', direction: 'in', width },
            { id: 'B', direction: 'in', width },
            { id: 'Y', direction: 'out', width },
        ],
        parameters: { WIDTH },
        toYosysParameters: binaryToYosys,
        fromYosysParameters: binaryFromYosys,
    };
}

function singleBitGate(type: string, symbol: string, name: string, description: string): CellDefinition {
    return {
        type,
        shape: GATE,
        group: 'logic',
        name,
        description,
        symbol,
        ports: [
            { id: 'A', direction: 'in', width: one },
            { id: 'B', direction: 'in', width: one },
            { id: 'Y', direction: 'out', width: one },
        ],
        parameters: {},
        toYosysParameters: noParameters,
        fromYosysParameters: noParameters,
    };
}

function arithmetic(type: string, symbol: string, name: string, description: string): CellDefinition {
    return {
        type,
        shape: OPERATOR,
        group: 'arithmetic',
        name,
        description,
        symbol,
        ports: [
            { id: 'A', direction: 'in', width },
            { id: 'B', direction: 'in', width },
            { id: 'Y', direction: 'out', width },
        ],
        parameters: { WIDTH, SIGNED },
        toYosysParameters: binaryToYosys,
        fromYosysParameters: binaryFromYosys,
    };
}

function comparison(type: string, symbol: string, name: string, description: string): CellDefinition {
    return {
        type,
        shape: OPERATOR,
        group: 'comparison',
        name,
        description,
        symbol,
        ports: [
            { id: 'A', direction: 'in', width },
            { id: 'B', direction: 'in', width },
            { id: 'Y', direction: 'out', width: one },
        ],
        parameters: { WIDTH, SIGNED },
        toYosysParameters: compareToYosys,
        fromYosysParameters: compareFromYosys,
    };
}

const definitions: CellDefinition[] = [
    // Logic gates
    {
        type: '$not',
        shape: GATE,
        group: 'logic',
        name: 'NOT',
        description: 'Bitwise inverter: Y = ~A',
        symbol: 'not',
        ports: [
            { id: 'A', direction: 'in', width },
            { id: 'Y', direction: 'out', width },
        ],
        parameters: { WIDTH },
        toYosysParameters: unaryToYosys,
        fromYosysParameters: unaryFromYosys,
    },
    gate('$and', 'and', 'AND', 'Bitwise AND: Y = A & B'),
    gate('$or', 'or', 'OR', 'Bitwise OR: Y = A | B'),
    gate('$xor', 'xor', 'XOR', 'Bitwise exclusive OR: Y = A ^ B'),
    gate('$xnor', 'xnor', 'XNOR', 'Bitwise exclusive NOR: Y = A ~^ B'),
    singleBitGate('$_NAND_', 'nand', 'NAND', 'Single-bit NAND gate: Y = ~(A & B)'),
    singleBitGate('$_NOR_', 'nor', 'NOR', 'Single-bit NOR gate: Y = ~(A | B)'),
    // Arithmetic
    arithmetic('$add', '+', 'Adder', 'Addition: Y = A + B'),
    arithmetic('$sub', '−', 'Subtractor', 'Subtraction: Y = A - B'),
    arithmetic('$mul', '×', 'Multiplier', 'Multiplication: Y = A * B'),
    // Comparison
    comparison('$eq', '=', 'Equal', 'Equality: Y = (A == B)'),
    comparison('$ne', '≠', 'Not equal', 'Inequality: Y = (A != B)'),
    comparison('$lt', '<', 'Less than', 'Comparison: Y = (A < B)'),
    comparison('$gt', '>', 'Greater than', 'Comparison: Y = (A > B)'),
    // Selection
    {
        type: '$mux',
        shape: MUX,
        group: 'selection',
        name: 'Multiplexer',
        description: '2-to-1 multiplexer: Y = S ? B : A',
        symbol: 'mux',
        ports: [
            { id: 'A', direction: 'in', width },
            { id: 'B', direction: 'in', width },
            { id: 'S', direction: 'in', side: 'SOUTH', width: one },
            { id: 'Y', direction: 'out', width },
        ],
        parameters: { WIDTH },
        toYosysParameters: (p) => ({ WIDTH: width(p) }),
        fromYosysParameters: (p) => ({ WIDTH: toInt(p.WIDTH, 1) }),
    },
    // Registers
    {
        type: '$dff',
        shape: REGISTER,
        group: 'sequential',
        name: 'D flip-flop',
        description: 'Edge-triggered register: Q <= D',
        symbol: 'dff',
        ports: [
            { id: 'D', direction: 'in', width },
            { id: 'CLK', direction: 'in', clock: true, polarity: 'CLK_POLARITY', width: one },
            { id: 'Q', direction: 'out', width },
        ],
        parameters: { WIDTH, CLK_POLARITY },
        toYosysParameters: (p) => ({
            CLK_POLARITY: toInt(p.CLK_POLARITY, 1),
            WIDTH: width(p),
        }),
        fromYosysParameters: (p) => ({
            WIDTH: toInt(p.WIDTH, 1),
            CLK_POLARITY: toInt(p.CLK_POLARITY, 1),
        }),
    },
    {
        type: '$dffe',
        shape: REGISTER,
        group: 'sequential',
        name: 'D flip-flop with enable',
        description: 'Edge-triggered register: Q <= EN ? D : Q',
        symbol: 'dff',
        ports: [
            { id: 'D', direction: 'in', width },
            { id: 'EN', direction: 'in', polarity: 'EN_POLARITY', width: one },
            { id: 'CLK', direction: 'in', clock: true, polarity: 'CLK_POLARITY', width: one },
            { id: 'Q', direction: 'out', width },
        ],
        parameters: { WIDTH, CLK_POLARITY, EN_POLARITY },
        toYosysParameters: (p) => ({
            CLK_POLARITY: toInt(p.CLK_POLARITY, 1),
            EN_POLARITY: toInt(p.EN_POLARITY, 1),
            WIDTH: width(p),
        }),
        fromYosysParameters: (p) => ({
            WIDTH: toInt(p.WIDTH, 1),
            CLK_POLARITY: toInt(p.CLK_POLARITY, 1),
            EN_POLARITY: toInt(p.EN_POLARITY, 1),
        }),
    },
    {
        type: '$adff',
        shape: REGISTER,
        group: 'sequential',
        name: 'D flip-flop with reset',
        description: 'Register with asynchronous reset: Q <= ARST ? ARST_VALUE : D',
        symbol: 'dff',
        ports: [
            { id: 'D', direction: 'in', width },
            { id: 'CLK', direction: 'in', clock: true, polarity: 'CLK_POLARITY', width: one },
            { id: 'ARST', direction: 'in', side: 'SOUTH', polarity: 'ARST_POLARITY', width: one },
            { id: 'Q', direction: 'out', width },
        ],
        parameters: { WIDTH, CLK_POLARITY, ARST_POLARITY, ARST_VALUE },
        toYosysParameters: (p) => ({
            ARST_POLARITY: toInt(p.ARST_POLARITY, 1),
            ARST_VALUE: toBinary(p.ARST_VALUE, width(p)),
            CLK_POLARITY: toInt(p.CLK_POLARITY, 1),
            WIDTH: width(p),
        }),
        fromYosysParameters: (p) => ({
            WIDTH: toInt(p.WIDTH, 1),
            CLK_POLARITY: toInt(p.CLK_POLARITY, 1),
            ARST_POLARITY: toInt(p.ARST_POLARITY, 1),
            ARST_VALUE: toBinary(p.ARST_VALUE, toInt(p.WIDTH, 1)),
        }),
    },
];

export const cellRegistry: CellRegistry = definitions.reduce((registry, definition) => {
    registry[definition.type] = definition;
    return registry;
}, {} as CellRegistry);

/**
 * Resolve the cell definition for the given Yosys cell type.
 */
export function resolveCellDefinition(cellType: string | null | undefined): CellDefinition | null {
    if (!cellType) return null;
    return cellRegistry[cellType] || null;
}

/**
 * Get the default normalized parameters of the given cell definition.
 */
export function getDefaultParameters(definition: CellDefinition): CellParameters {
    const parameters: CellParameters = {};
    Object.entries(definition.parameters).forEach(([key, parameter]) => {
        parameters[key] = parameter.default;
    });
    return parameters;
}

/**
 * Get a short label of the cell (e.g. `ADFF` for `$adff`), used in the stencil.
 */
export function getCellShortName(definition: CellDefinition): string {
    return definition.type.replace(/[$_]/g, '').toUpperCase();
}
