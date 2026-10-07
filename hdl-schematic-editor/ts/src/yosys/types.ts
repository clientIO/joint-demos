/**
 * @file Types describing the output of the Yosys `write_json` command.
 * @see https://yosyshq.readthedocs.io/projects/yosys/en/latest/cmd/index_backends_json.html
 */

/**
 * A signal bit. Numbers identify nets, strings are constant bits.
 */
export type YosysBit = number | '0' | '1' | 'x' | 'z';

export type YosysDirection = 'input' | 'output' | 'inout';

/**
 * Parameter and attribute values. Yosys writes integers as binary strings
 * (e.g. "00000000000000000000000000000100") unless `-compat-int` is used.
 */
export type YosysValue = string | number;

export interface YosysPort {
    direction: YosysDirection;
    bits: YosysBit[];
    offset?: number;
    upto?: number;
    signed?: number;
}

export interface YosysCell {
    hide_name: 0 | 1;
    type: string;
    parameters: Record<string, YosysValue>;
    attributes: Record<string, YosysValue>;
    port_directions?: Record<string, YosysDirection>;
    connections: Record<string, YosysBit[]>;
}

export interface YosysNetName {
    hide_name: 0 | 1;
    bits: YosysBit[];
    attributes: Record<string, YosysValue>;
    offset?: number;
    upto?: number;
    signed?: number;
}

export interface YosysModule {
    attributes?: Record<string, YosysValue>;
    parameter_default_values?: Record<string, YosysValue>;
    ports: Record<string, YosysPort>;
    cells: Record<string, YosysCell>;
    memories?: Record<string, unknown>;
    netnames: Record<string, YosysNetName>;
}

export interface YosysJSON {
    creator?: string;
    modules: Record<string, YosysModule>;
    models?: Record<string, unknown>;
}
