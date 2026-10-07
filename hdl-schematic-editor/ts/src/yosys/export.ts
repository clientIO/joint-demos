/**
 * @file Conversion of the diagram data into a Yosys JSON module.
 *
 * Every output port of the diagram gets a fresh set of net bits.
 * Input ports read the bits of the connected output port. Split, Join and Constant
 * nodes do not exist in Yosys - they only select, concatenate or create bits.
 */
import { resolveCellDefinition } from '../registry';
import { NodeTypes, Attribute } from '../diagram/const';
import { portIdToRange } from './import';

import type { YosysBit, YosysCell, YosysJSON, YosysModule, YosysNetName, YosysPort, YosysValue } from './types';
import type { BitRange, BlockPort, DiagramJSON, NodeData } from '../diagram/types';
import type { CellParameters } from '../registry';

export const CREATOR = 'JointJS+ HDL Schematic Editor';

const TOP_ATTRIBUTE = '00000000000000000000000000000001';

/**
 * Convert the diagram data into a Yosys module and put it into the given document
 * (replacing the module with the same name, other modules are kept as they are).
 */
export function diagramToYosys(diagram: DiagramJSON, document: YosysJSON | null, moduleName: string): YosysJSON {
    const module = diagramToYosysModule(diagram, document?.modules[moduleName]);
    const modules: Record<string, YosysModule> = {};
    let replaced = false;
    Object.entries(document?.modules || {}).forEach(([name, otherModule]) => {
        if (name === moduleName) {
            modules[name] = module;
            replaced = true;
        } else {
            modules[name] = otherModule;
        }
    });
    if (!replaced) {
        modules[moduleName] = module;
    }
    return {
        creator: document?.creator || CREATOR,
        modules
    };
}

function diagramToYosysModule(diagram: DiagramJSON, originalModule?: YosysModule): YosysModule {

    let nextBit = 2;
    const allocate = (width: number): YosysBit[] => Array.from({ length: width }, () => nextBit++);

    // Bits of the output ports: `${nodeId}/${portId}` -> bits
    const outputBits = new Map<string, YosysBit[]>();
    // Sources of the input ports: `${nodeId}/${portId}` -> source port
    const sources = new Map<string, { nodeId: string, portId: string }>();

    const entries = Object.entries(diagram);

    entries.forEach(([nodeId, node]) => {
        (node.to || []).forEach((edge) => {
            if (!edge.id) return;
            sources.set(key(`${edge.id}`, edge.targetPortId!), { nodeId, portId: edge.sourcePortId! });
        });
    });

    // Allocate the net bits for all output ports (in the data order)
    entries.forEach(([nodeId, node]) => {
        getOutputPorts(node).forEach(({ id, width }) => {
            outputBits.set(key(nodeId, id), allocate(width));
        });
    });

    const resolving = new Set<string>();

    // Bits driven by the given output port
    const resolveOutput = (nodeId: string, portId: string, width: number): YosysBit[] => {
        const outputKey = key(nodeId, portId);
        const bits = outputBits.get(outputKey);
        if (bits) return bits;
        const node = diagram[nodeId];
        if (!node || resolving.has(outputKey)) return fill('x', width);
        resolving.add(outputKey);
        let result: YosysBit[];
        switch (node.type) {
            case NodeTypes.Constant: {
                // LSB first
                result = getConstantValue(node).split('').reverse() as YosysBit[];
                break;
            }
            case NodeTypes.Split: {
                const [lo, hi] = portIdToRange(portId);
                const inputBits = resolveInput(nodeId, 'A', node[Attribute.Width] as number);
                result = inputBits.slice(lo, hi + 1);
                break;
            }
            case NodeTypes.Join: {
                result = [];
                getRanges(node).forEach(([lo, hi]) => {
                    const portId = `${hi}:${lo}`;
                    result.push(...resolveInput(nodeId, portId, hi - lo + 1));
                });
                break;
            }
            default:
                result = [];
        }
        resolving.delete(outputKey);
        return result;
    };

    // Bits read by the given input port (fitted to the port width)
    const resolveInput = (nodeId: string, portId: string, width: number): YosysBit[] => {
        const source = sources.get(key(nodeId, portId));
        if (!source) return fill('x', width);
        const bits = resolveOutput(source.nodeId, source.portId, width);
        if (bits.length >= width) return bits.slice(0, width);
        // Zero-extend narrower sources
        return [...bits, ...fill('0', width - bits.length)];
    };

    const ports: Record<string, YosysPort> = {};
    const cells: Record<string, YosysCell> = {};
    const netnames: Record<string, YosysNetName> = {};

    const portNames = new UniqueNames();
    const cellNames = new UniqueNames();

    entries.forEach(([nodeId, node]) => {
        switch (node.type) {
            case NodeTypes.Input: {
                const name = portNames.get(getName(node, 'in'));
                const bits = outputBits.get(key(nodeId, 'Y'))!;
                ports[name] = { direction: 'input', bits };
                netnames[name] = { hide_name: 0, bits, attributes: {}};
                break;
            }
            case NodeTypes.Output: {
                const name = portNames.get(getName(node, 'out'));
                const bits = resolveInput(nodeId, 'A', getWidth(node));
                ports[name] = { direction: 'output', bits };
                netnames[name] = { hide_name: 0, bits, attributes: {}};
                break;
            }
            case NodeTypes.Constant:
            case NodeTypes.Split:
            case NodeTypes.Join:
                // Virtual nodes (bits manipulation only)
                break;
            default: {
                const cellType = node[Attribute.CellType] as string;
                if (!cellType) break;
                const name = cellNames.get(getName(node, cellType));
                const portDirections: Record<string, 'input' | 'output'> = {};
                const connections: Record<string, YosysBit[]> = {};
                getCellPorts(node).forEach(({ id, direction, width }) => {
                    if (direction === 'out') {
                        portDirections[id] = 'output';
                        connections[id] = outputBits.get(key(nodeId, id))!;
                    } else {
                        portDirections[id] = 'input';
                        connections[id] = resolveInput(nodeId, id, width);
                    }
                });
                const definition = resolveCellDefinition(cellType);
                const parameters = definition
                    ? definition.toYosysParameters(node[Attribute.Parameters] as CellParameters || {})
                    : (node[Attribute.Parameters] || {}) as Record<string, YosysValue>;
                cells[name] = {
                    hide_name: name.startsWith('$') ? 1 : 0,
                    type: cellType,
                    parameters,
                    attributes: (node[Attribute.CellAttributes] || {}) as Record<string, YosysValue>,
                    port_directions: portDirections,
                    connections
                };
                // Named nets driven by the cell
                Object.entries((node[Attribute.NetNames] || {}) as Record<string, string>).forEach(([portId, netName]) => {
                    const bits = outputBits.get(key(nodeId, portId));
                    if (!bits || !netName || netName in netnames) return;
                    netnames[netName] = { hide_name: 0, bits, attributes: {}};
                });
                break;
            }
        }
    });

    return {
        attributes: originalModule?.attributes || { top: TOP_ATTRIBUTE },
        ports,
        cells,
        netnames
    };
}

/**
 * Ports of the given node which drive bits (outputs).
 */
function getOutputPorts(node: NodeData): Array<{ id: string, width: number }> {
    switch (node.type) {
        case NodeTypes.Input:
            return [{ id: 'Y', width: getWidth(node) }];
        case NodeTypes.Constant:
        case NodeTypes.Split:
        case NodeTypes.Join:
        case NodeTypes.Output:
            return [];
        default:
            return getCellPorts(node).filter(port => port.direction === 'out');
    }
}

/**
 * All ports of a cell node (defined in the registry, or stored in the data for generic blocks).
 */
export function getCellPorts(node: NodeData): BlockPort[] {
    const definition = resolveCellDefinition(node[Attribute.CellType]);
    if (definition) {
        const parameters = (node[Attribute.Parameters] || {}) as CellParameters;
        return definition.ports.map(port => ({
            id: port.id,
            direction: port.direction,
            width: port.width(parameters)
        }));
    }
    return (node[Attribute.CellPorts] || []) as BlockPort[];
}

function getConstantValue(node: NodeData): string {
    const value = `${node[Attribute.Value] ?? '0'}`;
    return /^[01xz]+$/.test(value) ? value : '0';
}

function getRanges(node: NodeData): BitRange[] {
    return (node[Attribute.Ranges] || []) as BitRange[];
}

function getWidth(node: NodeData): number {
    return Math.max(1, Number(node[Attribute.Width]) || 1);
}

function getName(node: NodeData, fallback: string): string {
    const name = `${node[Attribute.Name] ?? ''}`.trim();
    return name || fallback;
}

function fill(bit: YosysBit, width: number): YosysBit[] {
    return Array.from({ length: Math.max(0, width) }, () => bit);
}

function key(nodeId: string, portId: string) {
    return `${nodeId}\n${portId}`;
}

/**
 * Makes sure the names are unique (Yosys uses them as keys).
 */
class UniqueNames {
    private names = new Set<string>();

    get(name: string): string {
        let uniqueName = name;
        let index = 1;
        while (this.names.has(uniqueName)) {
            uniqueName = `${name}_${index++}`;
        }
        this.names.add(uniqueName);
        return uniqueName;
    }
}
