// Subsystem templates — the reusable blocks the ARCHITECTURE palette offers.
//
// Dropping one instantiates a whole subsystem: the block itself, its member
// components (with fresh reference designators), their internal wiring, and
// interface-level ports ready for bundle connections. This is the
// "hierarchical reusable subsystems" part of the designer: the library speaks
// subsystems, the schematic speaks parts.

import type { InterfaceKind, PartKindId } from '@/model/catalog';
import { newId, nextRef, type ArchPort, type Component, type Design, type Point, type Subsystem, type Wire } from '@/model/design';

export interface SubsystemBuild {
  readonly subsystem: Subsystem;
  readonly components: readonly Component[];
  readonly wires: readonly Wire[];
}

export interface SubsystemTemplate {
  readonly id: SubsystemTemplateId;
  readonly name: string;
  readonly description: string;
  /** Interface chips shown on the palette row. */
  readonly ifaces: readonly InterfaceKind[];
  readonly build: (design: Design, position: Point) => SubsystemBuild;
}

export type SubsystemTemplateId =
  | 'dc-input'
  | 'protection'
  | 'dcdc'
  | 'mcu'
  | 'ethernet'
  | 'rs485'
  | 'can'
  | 'sensor-board'
  | 'field-connector';

const BLOCK = { width: 196, height: 132 } as const;

/** Shared scaffolding: mint refs, place members under the block's position.
 * `preferredBoard` is a hint — boards are user-editable data, so a template
 * lands on the named board when it exists and on the first board otherwise. */
function build(
    design: Design,
    position: Point,
    name: string,
    preferredBoard: string,
    parts: readonly (readonly [PartKindId, number, number])[],
    ports: (refs: readonly string[]) => readonly ArchPort[],
    wires: (refs: readonly string[]) => readonly Wire[] = () => [],
    notes?: string,
): SubsystemBuild {
    const board =
    design.boards.find((candidate) => candidate.id === preferredBoard)?.id ??
    design.boards[0]?.id ??
    preferredBoard;
    const subsystemId = newId('sub');
    const refs: string[] = [];
    const components: Component[] = [];
    // Mint sequentially so two same-prefix parts get distinct refs.
    let working = design;
    for (const [part, dx, dy] of parts) {
        const ref = nextRef(working, part);
        refs.push(ref);
        const component: Component = {
            id: ref,
            ref,
            part,
            board,
            subsystemId,
            position: { x: position.x + dx, y: position.y + dy },
        };
        components.push(component);
        working = { ...working, components: [...working.components, component] };
    }
    return {
        subsystem: { id: subsystemId, name, board, position, size: BLOCK, ports: ports(refs), notes },
        components,
        wires: wires(refs),
    };
}

const at = (refs: readonly string[], index: number): string => refs[index] ?? '';

export const SUBSYSTEM_TEMPLATES: readonly SubsystemTemplate[] = [
    {
        id: 'dc-input',
        name: 'DC Input',
        description: 'Supply terminal + fuse',
        ifaces: ['power'],
        build: (design, position) =>
            build(
                design,
                position,
                'DC Input',
                'main',
                [['dc-input', 0, 220], ['fuse', 160, 240]],
                (refs) => [
                    { id: 'p24', label: '+24V', iface: 'power', side: 'right', offset: 48, pins: [{ role: '24v', component: at(refs, 1), pin: 'b' }] },
                    { id: 'gnd', label: 'GND', iface: 'gnd', side: 'right', offset: 92, pins: [{ role: 'gnd', component: at(refs, 0), pin: 'gnd' }] },
                ],
                (refs) => [
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'p24' }, to: { component: at(refs, 1), pin: 'a' }},
                ],
            ),
    },
    {
        id: 'protection',
        name: 'Protection',
        description: 'Surge + reverse-polarity eFuse',
        ifaces: ['power'],
        build: (design, position) =>
            build(design, position, 'Protection', 'main', [['efuse', 40, 220]], (refs) => [
                { id: 'in24', label: '+24V', iface: 'power', side: 'left', offset: 48, pins: [{ role: '24v', component: at(refs, 0), pin: 'in' }] },
                { id: 'gndl', label: 'GND', iface: 'gnd', side: 'left', offset: 92, pins: [{ role: 'gnd', component: at(refs, 0), pin: 'gnd' }] },
                { id: 'out24', label: '+24V_P', iface: 'power', side: 'right', offset: 48, pins: [{ role: '24v', component: at(refs, 0), pin: 'out' }] },
                { id: 'gndr', label: 'GND_P', iface: 'gnd', side: 'right', offset: 92, pins: [{ role: 'gnd', component: at(refs, 0), pin: 'gnd' }] },
            ]),
    },
    {
        id: 'dcdc',
        name: 'DC/DC Converter',
        description: 'Buck 5 V + LDO 3.3 V',
        ifaces: ['power'],
        build: (design, position) =>
            build(
                design,
                position,
                'DC/DC',
                'main',
                [['buck', 0, 220], ['ldo', 160, 340]],
                (refs) => [
                    { id: 'in24', label: '+24V', iface: 'power', side: 'left', offset: 48, pins: [{ role: '24v', component: at(refs, 0), pin: 'vin' }] },
                    { id: 'gndl', label: 'GND', iface: 'gnd', side: 'left', offset: 92, pins: [{ role: 'gnd', component: at(refs, 0), pin: 'gnd' }] },
                    { id: 'v5', label: '5V', iface: 'power', side: 'right', offset: 36, pins: [{ role: '5v', component: at(refs, 0), pin: 'vout' }] },
                    { id: 'v33', label: '3V3', iface: 'power', side: 'right', offset: 66, pins: [{ role: '3v3', component: at(refs, 1), pin: 'vout' }] },
                    { id: 'gndr', label: 'GND', iface: 'gnd', side: 'right', offset: 96, pins: [{ role: 'gnd', component: at(refs, 1), pin: 'gnd' }] },
                ],
                (refs) => [
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'vout' }, to: { component: at(refs, 1), pin: 'vin' }},
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'gnd' }, to: { component: at(refs, 1), pin: 'gnd' }},
                ],
            ),
    },
    {
        id: 'mcu',
        name: 'MCU Controller',
        description: 'Cortex-M3, LQFP-64',
        ifaces: ['i2c', 'uart', 'eth', 'gpio'],
        build: (design, position) =>
            build(design, position, 'MCU Controller', 'main', [['mcu', 24, 220]], (refs) => {
                const mcu = at(refs, 0);
                return [
                    { id: 'pwr', label: '3V3', iface: 'power', side: 'top', offset: 98, pins: [{ role: 'vdd', component: mcu, pin: 'vdd' }] },
                    { id: 'gnd', label: 'GND', iface: 'gnd', side: 'bottom', offset: 98, pins: [{ role: 'gnd', component: mcu, pin: 'gnd' }] },
                    {
                        id: 'eth',
                        label: 'ETH',
                        iface: 'eth',
                        side: 'left',
                        offset: 40,
                        pins: [
                            { role: 'txd0', component: mcu, pin: 'txd0' },
                            { role: 'rxd0', component: mcu, pin: 'rxd0' },
                            { role: 'mdc', component: mcu, pin: 'mdc' },
                            { role: 'mdio', component: mcu, pin: 'mdio' },
                        ],
                    },
                    {
                        id: 'uart',
                        label: 'UART',
                        iface: 'uart',
                        side: 'left',
                        offset: 92,
                        pins: [
                            { role: 'tx', component: mcu, pin: 'pa9' },
                            { role: 'rx', component: mcu, pin: 'pa10' },
                        ],
                    },
                    {
                        id: 'i2c',
                        label: 'I2C',
                        iface: 'i2c',
                        side: 'right',
                        offset: 40,
                        pins: [
                            { role: 'sda', component: mcu, pin: 'pb7' },
                            { role: 'scl', component: mcu, pin: 'pb6' },
                        ],
                    },
                    {
                        id: 'gpio',
                        label: 'GPIO',
                        iface: 'gpio',
                        side: 'right',
                        offset: 92,
                        pins: [
                            { role: 'alert', component: mcu, pin: 'pb1' },
                            { role: 'spare', component: mcu, pin: 'pb4' },
                        ],
                    },
                ];
            }),
    },
    {
        id: 'ethernet',
        name: 'Ethernet PHY',
        description: 'RMII PHY + MagJack',
        ifaces: ['eth'],
        build: (design, position) =>
            build(
                design,
                position,
                'Ethernet',
                'main',
                [['eth-phy', 160, 220], ['rj45', 0, 240]],
                (refs) => [
                    {
                        id: 'eth',
                        label: 'ETH',
                        iface: 'eth',
                        side: 'right',
                        offset: 48,
                        pins: [
                            { role: 'txd0', component: at(refs, 0), pin: 'txd0' },
                            { role: 'rxd0', component: at(refs, 0), pin: 'rxd0' },
                            { role: 'mdc', component: at(refs, 0), pin: 'mdc' },
                            { role: 'mdio', component: at(refs, 0), pin: 'mdio' },
                        ],
                    },
                    { id: 'pwr', label: '3V3', iface: 'power', side: 'top', offset: 70, pins: [{ role: 'vdd', component: at(refs, 0), pin: 'vdd' }] },
                    { id: 'gnd', label: 'GND', iface: 'gnd', side: 'top', offset: 128, pins: [{ role: 'gnd', component: at(refs, 0), pin: 'gnd' }] },
                ],
                (refs) => [
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'txp' }, to: { component: at(refs, 1), pin: 'txp' }, label: 'TX+' },
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'txn' }, to: { component: at(refs, 1), pin: 'txn' }, label: 'TX-' },
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'rxp' }, to: { component: at(refs, 1), pin: 'rxp' }, label: 'RX+' },
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'rxn' }, to: { component: at(refs, 1), pin: 'rxn' }, label: 'RX-' },
                ],
            ),
    },
    {
        id: 'rs485',
        name: 'RS-485 Transceiver',
        description: 'Half-duplex field bus',
        ifaces: ['rs485', 'uart'],
        build: (design, position) =>
            build(design, position, 'RS-485', 'main', [['rs485', 40, 220]], (refs) => [
                {
                    id: 'uart',
                    label: 'UART',
                    iface: 'uart',
                    side: 'right',
                    offset: 48,
                    pins: [
                        { role: 'rx', component: at(refs, 0), pin: 'ro' },
                        { role: 'tx', component: at(refs, 0), pin: 'di' },
                    ],
                },
                {
                    id: 'bus',
                    label: 'A/B',
                    iface: 'rs485',
                    side: 'left',
                    offset: 48,
                    pins: [
                        { role: 'a', component: at(refs, 0), pin: 'a' },
                        { role: 'b', component: at(refs, 0), pin: 'b' },
                    ],
                },
                { id: 'pwr', label: '3V3', iface: 'power', side: 'top', offset: 70, pins: [{ role: 'vdd', component: at(refs, 0), pin: 'vdd' }] },
                { id: 'gnd', label: 'GND', iface: 'gnd', side: 'top', offset: 128, pins: [{ role: 'gnd', component: at(refs, 0), pin: 'gnd' }] },
            ]),
    },
    {
        id: 'can',
        name: 'CAN Transceiver',
        description: 'CAN-FD field bus',
        ifaces: ['can'],
        build: (design, position) =>
            build(design, position, 'CAN', 'main', [['can-xcvr', 40, 220]], (refs) => [
                {
                    id: 'ctrl',
                    label: 'TXD/RXD',
                    iface: 'can',
                    side: 'right',
                    offset: 48,
                    pins: [
                        { role: 'tx', component: at(refs, 0), pin: 'txd' },
                        { role: 'rx', component: at(refs, 0), pin: 'rxd' },
                    ],
                },
                {
                    id: 'bus',
                    label: 'CANH/L',
                    iface: 'can',
                    side: 'left',
                    offset: 48,
                    pins: [
                        { role: 'h', component: at(refs, 0), pin: 'canh' },
                        { role: 'l', component: at(refs, 0), pin: 'canl' },
                    ],
                },
                { id: 'pwr', label: '3V3', iface: 'power', side: 'top', offset: 70, pins: [{ role: 'vdd', component: at(refs, 0), pin: 'vdd' }] },
                { id: 'gnd', label: 'GND', iface: 'gnd', side: 'top', offset: 128, pins: [{ role: 'gnd', component: at(refs, 0), pin: 'gnd' }] },
            ]),
    },
    {
        id: 'sensor-board',
        name: 'Sensor Board',
        description: 'I²C sensor daughterboard',
        ifaces: ['i2c', 'gpio'],
        build: (design, position) =>
            build(
                design,
                position,
                'Sensor Board',
                'sensor',
                [['sensor-header', 0, 220], ['i2c-sensor', 140, 224], ['res-10k', 180, 100]],
                (refs) => [
                    {
                        id: 'i2c',
                        label: 'I2C',
                        iface: 'i2c',
                        side: 'left',
                        offset: 40,
                        pins: [
                            { role: 'sda', component: at(refs, 0), pin: 'sda' },
                            { role: 'scl', component: at(refs, 0), pin: 'scl' },
                        ],
                    },
                    { id: 'gpio', label: 'ALERT', iface: 'gpio', side: 'left', offset: 92, pins: [{ role: 'alert', component: at(refs, 0), pin: 'alert' }] },
                    { id: 'pwr', label: 'VS', iface: 'power', side: 'top', offset: 98, pins: [{ role: 'vs', component: at(refs, 0), pin: 'vs' }] },
                    { id: 'gnd', label: 'GND', iface: 'gnd', side: 'bottom', offset: 98, pins: [{ role: 'gnd', component: at(refs, 0), pin: 'gnd' }] },
                ],
                (refs) => [
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'vs' }, to: { component: at(refs, 1), pin: 'vs' }},
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'gnd' }, to: { component: at(refs, 1), pin: 'gnd' }},
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'sda' }, to: { component: at(refs, 1), pin: 'sda' }},
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'scl' }, to: { component: at(refs, 1), pin: 'scl' }},
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'alert' }, to: { component: at(refs, 1), pin: 'alert' }},
                    { id: newId('wire'), from: { component: at(refs, 2), pin: 'b' }, to: { component: at(refs, 1), pin: 'alert' }},
                    { id: newId('wire'), from: { component: at(refs, 2), pin: 'a' }, to: { component: at(refs, 0), pin: 'vs' }},
                ],
            ),
    },
    {
        id: 'field-connector',
        name: 'Field Connector',
        description: 'M12 to the wiring harness',
        ifaces: ['rs485', 'gnd'],
        build: (design, position) =>
            build(
                design,
                position,
                'Field Connector',
                'main',
                [['field-connector', 40, 220], ['chassis', 0, 380]],
                (refs) => [
                    {
                        id: 'bus',
                        label: 'A/B',
                        iface: 'rs485',
                        side: 'right',
                        offset: 48,
                        pins: [
                            { role: 'a', component: at(refs, 0), pin: 'p1' },
                            { role: 'b', component: at(refs, 0), pin: 'p2' },
                        ],
                    },
                    { id: 'gnd', label: 'GND', iface: 'gnd', side: 'right', offset: 92, pins: [{ role: 'gnd', component: at(refs, 0), pin: 'p3' }] },
                ],
                (refs) => [
                    { id: newId('wire'), from: { component: at(refs, 0), pin: 'shield' }, to: { component: at(refs, 1), pin: 'ch' }},
                ],
            ),
    },
];

export function getSubsystemTemplate(id: SubsystemTemplateId): SubsystemTemplate {
    const template = SUBSYSTEM_TEMPLATES.find((candidate) => candidate.id === id);
    if (template === undefined) throw new Error(`Unknown subsystem template '${id}'`);
    return template;
}

export function isSubsystemTemplateId(value: string): value is SubsystemTemplateId {
    return SUBSYSTEM_TEMPLATES.some((template) => template.id === value);
}
