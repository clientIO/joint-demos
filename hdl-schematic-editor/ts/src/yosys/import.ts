/**
 * @file Conversion of a Yosys JSON module into the diagram data.
 *
 * Yosys connects cells with bit vectors: every net bit has a unique number
 * and the cell ports list the bits they are connected to. The diagram works
 * with port-to-port edges instead, so the bit vectors are analyzed:
 * - a port reading a whole port of another cell becomes a single edge,
 * - a port reading a part of another port reads it through a Split node,
 * - a port assembled from several sources reads it through a Join node,
 * - constant bits are read from Constant nodes.
 */
import { resolveCellDefinition, toInt } from '../registry';
import { NodeTypes, Attribute } from '../diagram/const';

import type { YosysBit, YosysJSON, YosysModule, YosysDirection } from './types';
import type { BitRange, BlockPort, DiagramJSON, NodeData } from '../diagram/types';

interface PortRef {
    nodeId: string;
    portId: string;
}

interface Driver extends PortRef {
    index: number;
}

type Run =
    | { kind: 'driver', nodeId: string, portId: string, lo: number, hi: number }
    | { kind: 'constant', bits: string[] }
    | { kind: 'undriven' };

/**
 * Find the name of the top module (the one with the `top` attribute or the first one).
 */
export function getTopModuleName(document: YosysJSON): string {
    const names = Object.keys(document.modules || {});
    if (names.length === 0) {
        throw new Error('The Yosys JSON does not contain any module.');
    }
    const topName = names.find(name => toInt(document.modules[name].attributes?.top) === 1);
    return topName || names[0];
}

/**
 * Identifiers of the diagram nodes created from the Yosys module.
 */
export const NodeId = {
    port: (name: string) => `port:${name}`,
    cell: (name: string) => `cell:${name}`,
};

/**
 * Convert the given Yosys module into the diagram data.
 */
export function yosysToDiagram(document: YosysJSON, moduleName: string): DiagramJSON {
    const module: YosysModule = document.modules[moduleName];
    if (!module) {
        throw new Error(`Module "${moduleName}" not found.`);
    }

    const json: DiagramJSON = {};
    // bit number -> the output port driving the bit
    const drivers = new Map<number, Driver>();
    // `${nodeId}/${portId}` -> width of the driving port
    const driverWidths = new Map<string, number>();
    // `${nodeId}/${portId}` -> bits of the driving port
    const driverBits = new Map<string, string>();
    // ports reading bits
    const riders: Array<PortRef & { bits: YosysBit[] }> = [];

    let constantCount = 0;

    const addDriver = (nodeId: string, portId: string, bits: YosysBit[]) => {
        bits.forEach((bit, index) => {
            if (typeof bit === 'number' && !drivers.has(bit)) {
                drivers.set(bit, { nodeId, portId, index });
            }
        });
        driverWidths.set(key(nodeId, portId), bits.length);
        driverBits.set(key(nodeId, portId), bits.join(','));
    };

    const connect = (source: PortRef, target: PortRef) => {
        const sourceNode = json[source.nodeId];
        sourceNode.to = sourceNode.to || [];
        sourceNode.to.push({
            id: target.nodeId,
            sourcePortId: source.portId,
            targetPortId: target.portId,
        });
    };

    // Module ports

    Object.entries(module.ports || {}).forEach(([name, port]) => {
        const nodeId = NodeId.port(name);
        if (port.direction === 'output') {
            json[nodeId] = {
                type: NodeTypes.Output,
                [Attribute.Name]: name,
                [Attribute.Width]: port.bits.length,
                to: []
            } as NodeData;
            riders.push({ nodeId, portId: 'A', bits: port.bits });
        } else {
            // Note: `inout` ports are treated as inputs
            json[nodeId] = {
                type: NodeTypes.Input,
                [Attribute.Name]: name,
                [Attribute.Width]: port.bits.length,
                to: []
            } as NodeData;
            addDriver(nodeId, 'Y', port.bits);
        }
    });

    // Cells

    Object.entries(module.cells || {}).forEach(([name, cell]) => {
        const nodeId = NodeId.cell(name);
        const definition = resolveCellDefinition(cell.type);
        let getDirection: (portId: string) => YosysDirection;

        if (definition) {
            json[nodeId] = {
                type: definition.shape,
                [Attribute.Name]: name,
                [Attribute.CellType]: cell.type,
                [Attribute.Parameters]: definition.fromYosysParameters(cell.parameters || {}),
                [Attribute.CellAttributes]: cell.attributes || {},
                to: []
            } as NodeData;
            getDirection = (portId) => {
                const portDefinition = definition.ports.find(port => port.id === portId);
                if (portDefinition) return portDefinition.direction === 'out' ? 'output' : 'input';
                return cell.port_directions?.[portId] || 'input';
            };
        } else {
            // Generic block (e.g. a submodule instance or an unsupported cell)
            getDirection = (portId) => getBlockPortDirection(document, cell.type, portId, cell.port_directions);
            const cellPorts: BlockPort[] = Object.entries(cell.connections || {}).map(([portId, bits]) => ({
                id: portId,
                direction: getDirection(portId) === 'output' ? 'out' : 'in',
                width: bits.length
            }));
            json[nodeId] = {
                type: NodeTypes.Block,
                [Attribute.Name]: name,
                [Attribute.CellType]: cell.type,
                [Attribute.Parameters]: cell.parameters || {},
                [Attribute.CellAttributes]: cell.attributes || {},
                [Attribute.CellPorts]: cellPorts,
                to: []
            } as NodeData;
        }

        Object.entries(cell.connections || {}).forEach(([portId, bits]) => {
            if (getDirection(portId) === 'output') {
                addDriver(nodeId, portId, bits);
            } else {
                riders.push({ nodeId, portId, bits });
            }
        });
    });

    // Connections

    const getSplitPort = (nodeId: string, portId: string, lo: number, hi: number): PortRef => {
        const splitId = `split:${nodeId}/${portId}`;
        let split = json[splitId];
        if (!split) {
            split = json[splitId] = {
                type: NodeTypes.Split,
                [Attribute.Width]: driverWidths.get(key(nodeId, portId)),
                [Attribute.Ranges]: [],
                to: []
            } as NodeData;
            connect({ nodeId, portId }, { nodeId: splitId, portId: 'A' });
        }
        const ranges = split[Attribute.Ranges] as BitRange[];
        if (!ranges.some(([l, h]) => l === lo && h === hi)) {
            ranges.push([lo, hi]);
        }
        return { nodeId: splitId, portId: rangeToPortId([lo, hi]) };
    };

    const getRunSource = (run: Run): PortRef | null => {
        switch (run.kind) {
            case 'driver': {
                const width = driverWidths.get(key(run.nodeId, run.portId));
                if (run.lo === 0 && run.hi === width! - 1) {
                    return { nodeId: run.nodeId, portId: run.portId };
                }
                return getSplitPort(run.nodeId, run.portId, run.lo, run.hi);
            }
            case 'constant': {
                const nodeId = `const:${constantCount++}`;
                json[nodeId] = {
                    type: NodeTypes.Constant,
                    // MSB first
                    [Attribute.Value]: run.bits.slice().reverse().join(''),
                    to: []
                } as NodeData;
                return { nodeId, portId: 'Y' };
            }
            default:
                return null;
        }
    };

    riders.forEach((rider) => {
        const runs = getRuns(rider.bits, drivers);
        if (runs.length === 0) return;
        if (runs.length === 1) {
            const source = getRunSource(runs[0]);
            if (source) {
                connect(source, rider);
            }
            return;
        }
        // The bits are assembled from several sources
        const joinId = `join:${rider.nodeId}/${rider.portId}`;
        const ranges: BitRange[] = [];
        let lo = 0;
        runs.forEach((run) => {
            const length = getRunLength(run);
            ranges.push([lo, lo + length - 1]);
            lo += length;
        });
        json[joinId] = {
            type: NodeTypes.Join,
            [Attribute.Ranges]: ranges,
            to: []
        } as NodeData;
        runs.forEach((run, index) => {
            const source = getRunSource(run);
            if (source) {
                connect(source, { nodeId: joinId, portId: rangeToPortId(ranges[index]) });
            }
        });
        connect({ nodeId: joinId, portId: 'Y' }, rider);
    });

    // Sort the split ranges (LSB first)

    Object.values(json).forEach((node) => {
        if (node.type === NodeTypes.Split) {
            (node[Attribute.Ranges] as BitRange[]).sort((a, b) => a[0] - b[0]);
        }
    });

    // Net names of the cell outputs

    const portNames = new Set(Object.keys(module.ports || {}));
    const bitsToDriver = new Map<string, string>();
    driverBits.forEach((bits, driverKey) => bitsToDriver.set(bits, driverKey));
    Object.entries(module.netnames || {}).forEach(([name, net]) => {
        if (net.hide_name || portNames.has(name)) return;
        const driverKey = bitsToDriver.get(net.bits.join(','));
        if (!driverKey) return;
        const [nodeId, portId] = splitKey(driverKey);
        const node = json[nodeId];
        if (!node || node.type === NodeTypes.Input) return;
        node[Attribute.NetNames] = { ...node[Attribute.NetNames] as object, [portId]: name };
    });

    return json;
}

/**
 * Split the bits into runs of consecutive bits coming from the same source.
 */
function getRuns(bits: YosysBit[], drivers: Map<number, Driver>): Run[] {
    const runs: Run[] = [];
    bits.forEach((bit) => {
        const last = runs[runs.length - 1];
        if (typeof bit === 'string') {
            if (last?.kind === 'constant') {
                last.bits.push(bit);
            } else {
                runs.push({ kind: 'constant', bits: [bit] });
            }
            return;
        }
        const driver = drivers.get(bit);
        if (!driver) {
            runs.push({ kind: 'undriven' });
            return;
        }
        if (
            last?.kind === 'driver' &&
            last.nodeId === driver.nodeId &&
            last.portId === driver.portId &&
            last.hi + 1 === driver.index
        ) {
            last.hi++;
        } else {
            runs.push({ kind: 'driver', nodeId: driver.nodeId, portId: driver.portId, lo: driver.index, hi: driver.index });
        }
    });
    // An undriven port is not connected at all
    if (runs.every(run => run.kind === 'undriven')) return [];
    return runs;
}

function getRunLength(run: Run): number {
    switch (run.kind) {
        case 'driver': return run.hi - run.lo + 1;
        case 'constant': return run.bits.length;
        default: return 1;
    }
}

/**
 * The direction of a generic block port. Submodule instances
 * take the direction from the module definition.
 */
function getBlockPortDirection(document: YosysJSON, cellType: string, portId: string, portDirections?: Record<string, YosysDirection>): YosysDirection {
    if (portDirections?.[portId]) return portDirections[portId];
    const submodule = document.modules[cellType];
    if (submodule?.ports?.[portId]) return submodule.ports[portId].direction;
    // Yosys naming conventions for the outputs
    return ['Y', 'Q', 'X', 'CO', 'O'].includes(portId) ? 'output' : 'input';
}

/**
 * Port id of the split output / join input for the given range, e.g. `7:4`.
 */
export function rangeToPortId([lo, hi]: BitRange): string {
    return `${hi}:${lo}`;
}

export function portIdToRange(portId: string): BitRange {
    const [hi, lo] = portId.split(':').map(Number);
    return [lo, hi];
}

function key(nodeId: string, portId: string) {
    return `${nodeId}\n${portId}`;
}

function splitKey(driverKey: string): [string, string] {
    const [nodeId, portId] = driverKey.split('\n');
    return [nodeId, portId];
}
