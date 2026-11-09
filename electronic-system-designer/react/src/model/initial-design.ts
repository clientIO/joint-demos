// The seeded project: a 24 V industrial sensor gateway.
//
//   24 V field supply → fuse → protection eFuse → buck 5 V → LDO 3.3 V
//   MCU (LQFP-64) — RMII Ethernet PHY + RJ45, RS-485 to an M12 field
//   connector, I²C environment sensor on a separate daughterboard, status LED.
//
// Three REALISTIC problems ship with the seed (the demo script is resolving
// them from the validation panel):
//   #1 The sensor daughterboard's supply pin is wired to the 5 V rail. Its
//      ALERT output is open-drain with the pull-up (R4) riding VS, so the
//      5 V rail arrives — through that pull-up — at the MCU's 3.3 V-max PB1.
//      (SDA/SCL stay at 3.3 V: an open-drain bus sits at its pull-up rail,
//      and R1/R2 ride the 3.3 V rail.) → fix: rewire J3-VS to the 3.3 V rail.
//   #2 The RS-485 bus leaves through J4 with no 120 Ω termination.
//                                       → fix: add the termination at J4.
//   #3 The status-LED drive was assigned to PB1 — the pin already carrying
//      the sensor's ALERT line. Two signals, one MCU pin; electrically the
//      two nets silently merge.         → fix: move the LED to free pin PB4.
//
// Everything here is plain data. Positions are hand-laid on the 4 px paper
// grid; the architecture and the schematic are two independent layouts of the
// same design.

import type { Board, Component, Design, Subsystem, Wire } from './design';

// --- Boards ----------------------------------------------------------------

const BOARDS: readonly Board[] = [
    { id: 'main', name: 'Main PCB', origin: { x: 40, y: 40 }},
    { id: 'sensor', name: 'Sensor Board', origin: { x: 1300, y: 160 }},
];

// --- Components (connectivity sheet, positions are schematic top-lefts) ----

function component(
    ref: string,
    part: Component['part'],
    board: string,
    subsystemId: string,
    x: number,
    y: number,
    notes?: string,
): Component {
    // The reference designator IS the id — stable, readable in every derived
    // artifact (cells, nets, netlist rows, test assertions).
    return { id: ref, ref, part, board, subsystemId, position: { x, y }, notes };
}

const COMPONENTS: readonly Component[] = [
    // Power chain, left to right along the top of the main board; the LDO sits
    // under the buck so the power tree reads as one column. The Y positions put
    // every series pin tip on ONE line (y = 116) — a supply run through a fuse
    // is drawn dead straight, never as a staircase.
    component('J1', 'dc-input', 'main', 's-input', 64, 96, 'Field supply, 18–30 V DC'),
    component('F1', 'fuse', 'main', 's-input', 268, 104),
    component('U7', 'efuse', 'main', 's-prot', 444, 96, 'Surge + reverse-polarity stage'),
    component('U1', 'buck', 'main', 's-dcdc', 664, 96),
    component('U2', 'ldo', 'main', 's-dcdc', 664, 372, 'Analog-quiet 3.3 V rail'),

    // Controller + its local passives (pull-ups above, LED chain below).
    component('U3', 'mcu', 'main', 's-mcu', 920, 220, 'Handles sensor data, comms, and system management'),
    component('R1', 'res-10k', 'main', 's-mcu', 1132, 100),
    component('R2', 'res-10k', 'main', 's-mcu', 1204, 100),
    component('R3', 'res-330', 'main', 's-mcu', 1096, 580),
    component('D1', 'led', 'main', 's-mcu', 1220, 556),

    // Ethernet front-end.
    component('U5', 'eth-phy', 'main', 's-eth', 400, 400, 'RMII PHY, MDIO-managed'),
    component('J2', 'rj45', 'main', 's-eth', 168, 420),

    // RS-485 field bus.
    component('U4', 'rs485', 'main', 's-485', 424, 672),
    component('J4', 'field-connector', 'main', 's-field', 148, 680, 'Panel-mount, to harness H1'),
    component('CH1', 'chassis', 'main', 's-field', 96, 868),

    // Board-to-board header + the sensor daughterboard (its own outline).
    component('J3', 'sensor-header', 'main', 's-sensor', 1252, 336),
    component('U6', 'i2c-sensor', 'sensor', 's-sensor', 1448, 336, '0x44 on the I²C bus'),
    component('R4', 'res-10k', 'sensor', 's-sensor', 1492, 188, 'ALERT pull-up to VS'),
];

// --- Wires (pin-to-pin) ----------------------------------------------------

function wire(
    id: string,
    from: readonly [string, string],
    to: readonly [string, string],
    label?: string,
    labelAt?: number,
): Wire {
    return {
        id,
        from: { component: from[0], pin: from[1] },
        to: { component: to[0], pin: to[1] },
        label,
        labelAt,
    };
}

const WIRES: readonly Wire[] = [
    // 24 V path through the protection stages.
    wire('w-24v-in', ['J1', 'p24'], ['F1', 'a'], '24V_IN'),
    wire('w-24v-f', ['F1', 'b'], ['U7', 'in'], '24V_F'),
    wire('w-24v-p', ['U7', 'out'], ['U1', 'vin'], '24V_P'),

    // Rails. Vertices lay the distribution in clean channels (above the MCU for
    // the pull-up rail, left of the LDO for the drops) — drag any vertex to
    // re-route; the write-back stores it on the wire.
    // ⚠ SEEDED PROBLEM #1: the sensor header's supply pin taps the 5 V rail —
    // the daughterboard's ALERT pull-up (to VS) then carries 5 V into the MCU.
    wire('w-5v', ['U1', 'vout'], ['U2', 'vin'], '5V'),
    wire('w-5v-sense', ['U1', 'vout'], ['J3', 'vs']),
    wire('w-3v3-mcu', ['U2', 'vout'], ['U3', 'vdd'], '3V3'),
    wire('w-3v3-phy', ['U2', 'vout'], ['U5', 'vdd']),
    wire('w-3v3-485', ['U2', 'vout'], ['U4', 'vdd']),
    wire('w-3v3-r1', ['U2', 'vout'], ['R1', 'a']),
    wire('w-3v3-r2', ['U2', 'vout'], ['R2', 'a']),

    // Ground distribution (daisy-chained the way the copper actually pours).
    wire('w-gnd-1', ['J1', 'gnd'], ['U7', 'gnd'], 'GND'),
    wire('w-gnd-2', ['U7', 'gnd'], ['U1', 'gnd']),
    wire('w-gnd-3', ['U1', 'gnd'], ['U2', 'gnd']),
    wire('w-gnd-4', ['U2', 'gnd'], ['U3', 'gnd']),
    wire('w-gnd-5', ['U3', 'gnd'], ['U5', 'gnd']),
    wire('w-gnd-6', ['U3', 'gnd'], ['U4', 'gnd']),
    wire('w-gnd-7', ['U2', 'gnd'], ['J3', 'gnd']),
    wire('w-gnd-8', ['J3', 'gnd'], ['U6', 'gnd']),
    wire('w-gnd-9', ['U4', 'gnd'], ['J4', 'p3']),
    wire('w-gnd-led', ['D1', 'k'], ['U3', 'gnd']),
    wire('w-chassis', ['J4', 'shield'], ['CH1', 'ch'], 'CHASSIS'),

    // I²C bus: MCU ↔ header ↔ sensor, pull-ups to 3V3 on the main board. The
    // header's pins face the MCU, so the sensor-side wires run in a channel
    // under the header and rise into the sensor.
    wire('w-sda-pull', ['U3', 'pb7'], ['R1', 'b'], 'SDA'),
    wire('w-sda-hdr', ['U3', 'pb7'], ['J3', 'sda']),
    wire('w-sda-sns', ['J3', 'sda'], ['U6', 'sda']),
    wire('w-scl-pull', ['U3', 'pb6'], ['R2', 'b'], 'SCL'),
    wire('w-scl-hdr', ['U3', 'pb6'], ['J3', 'scl']),
    wire('w-scl-sns', ['J3', 'scl'], ['U6', 'scl']),

    // Sensor ALERT: open-drain, pulled up to VS on the daughterboard.
    wire('w-alert-hdr', ['U6', 'alert'], ['J3', 'alert'], 'ALERT'),
    wire('w-alert-pull', ['R4', 'b'], ['U6', 'alert']),
    wire('w-alert-vs', ['R4', 'a'], ['J3', 'vs']),
    wire('w-alert-mcu', ['J3', 'alert'], ['U3', 'pb1']),

    // Status LED. ⚠ SEEDED PROBLEM #3: the drive pin is PB1 — already taken by
    // ALERT above. The two nets merge through the pin; validation flags it.
    wire('w-led-drv', ['U3', 'pb1'], ['R3', 'a']),
    wire('w-led-a', ['R3', 'b'], ['D1', 'a'], 'LED_A'),

    // UART1 ↔ RS-485 transceiver, dropping left of the LDO column, plus the
    // half-duplex direction line (DE, with /RE strapped to it) on a GPIO.
    // The three wires share one corridor, so their labels are STAGGERED along
    // the run (labelAt) — coincident midpoints would render on top of each
    // other, live-mode voltage suffixes included.
    wire('w-tx2', ['U3', 'pa9'], ['U4', 'di'], 'TX1', 0.3),
    wire('w-rx2', ['U4', 'ro'], ['U3', 'pa10'], 'RX1', 0.7),
    wire('w-485-de', ['U3', 'pb0'], ['U4', 'de'], '485_DIR', 0.5),

    // RS-485 bus to the field connector. ⚠ SEEDED PROBLEM #2: no 120 Ω
    // termination across A/B at the connector end.
    wire('w-485-a', ['U4', 'a'], ['J4', 'p1'], '485_A'),
    wire('w-485-b', ['U4', 'b'], ['J4', 'p2'], '485_B'),

    // RMII between MCU and PHY — four parallel drops sharing one channel.
    wire('w-rmii-tx', ['U3', 'txd0'], ['U5', 'txd0'], 'RMII_TX'),
    wire('w-rmii-rx', ['U5', 'rxd0'], ['U3', 'rxd0'], 'RMII_RX'),
    wire('w-mdc', ['U3', 'mdc'], ['U5', 'mdc'], 'MDC'),
    wire('w-mdio', ['U3', 'mdio'], ['U5', 'mdio'], 'MDIO'),

    // PHY magnetics to the jack.
    wire('w-txp', ['U5', 'txp'], ['J2', 'txp'], 'TX+'),
    wire('w-txn', ['U5', 'txn'], ['J2', 'txn'], 'TX-'),
    wire('w-rxp', ['U5', 'rxp'], ['J2', 'rxp'], 'RX+'),
    wire('w-rxn', ['U5', 'rxn'], ['J2', 'rxn'], 'RX-'),

    // Header VS + GND through to the sensor's pins.
    wire('w-vs-sns', ['J3', 'vs'], ['U6', 'vs']),
];

// --- Subsystems (architecture sheet) ---------------------------------------
//
// Ports bind interface-level stubs to concrete pins. The architecture view
// groups cross-subsystem wires by port pair into one typed bundle; drawing a
// NEW architecture connection runs the reverse mapping (role-by-role) to mint
// real wires.

const SUBSYSTEMS: readonly Subsystem[] = [
    {
        id: 's-input',
        name: '24 V Input',
        board: 'main',
        position: { x: 64, y: 72 },
        size: { width: 196, height: 132 },
        notes: 'Terminal block and input fuse',
        ports: [
            { id: 'p24', label: '+24V', iface: 'power', side: 'right', offset: 48, pins: [{ role: '24v', component: 'F1', pin: 'b' }] },
            { id: 'gnd', label: 'GND', iface: 'gnd', side: 'right', offset: 92, pins: [{ role: 'gnd', component: 'J1', pin: 'gnd' }] },
        ],
    },
    {
        id: 's-prot',
        name: 'Protection',
        board: 'main',
        position: { x: 352, y: 72 },
        size: { width: 196, height: 132 },
        notes: 'Surge + reverse-polarity eFuse',
        ports: [
            { id: 'in24', label: '+24V', iface: 'power', side: 'left', offset: 48, pins: [{ role: '24v', component: 'U7', pin: 'in' }] },
            { id: 'gndl', label: 'GND', iface: 'gnd', side: 'left', offset: 92, pins: [{ role: 'gnd', component: 'U7', pin: 'gnd' }] },
            { id: 'out24', label: '+24V_P', iface: 'power', side: 'right', offset: 48, pins: [{ role: '24v', component: 'U7', pin: 'out' }] },
            { id: 'gndr', label: 'GND_P', iface: 'gnd', side: 'right', offset: 92, pins: [{ role: 'gnd', component: 'U7', pin: 'gnd' }] },
        ],
    },
    {
        id: 's-dcdc',
        name: 'DC/DC',
        board: 'main',
        position: { x: 640, y: 72 },
        size: { width: 196, height: 132 },
        notes: 'Buck to 5 V, LDO to 3.3 V',
        ports: [
            { id: 'in24', label: '+24V_P', iface: 'power', side: 'left', offset: 48, pins: [{ role: '24v', component: 'U1', pin: 'vin' }] },
            { id: 'gndl', label: 'GND', iface: 'gnd', side: 'left', offset: 92, pins: [{ role: 'gnd', component: 'U1', pin: 'gnd' }] },
            { id: 'v5', label: '5V', iface: 'power', side: 'right', offset: 36, pins: [{ role: '5v', component: 'U1', pin: 'vout' }] },
            { id: 'v33', label: '3V3', iface: 'power', side: 'right', offset: 66, pins: [{ role: '3v3', component: 'U2', pin: 'vout' }] },
            { id: 'gndr', label: 'GND', iface: 'gnd', side: 'right', offset: 96, pins: [{ role: 'gnd', component: 'U2', pin: 'gnd' }] },
        ],
    },
    {
        id: 's-mcu',
        name: 'MCU Controller',
        board: 'main',
        position: { x: 928, y: 72 },
        size: { width: 196, height: 156 },
        notes: 'Handles sensor data, communications, and system management',
        ports: [
            {
                id: 'pwr',
                label: '3V3',
                iface: 'power',
                side: 'top',
                offset: 98,
                pins: [
                    { role: 'vdd', component: 'U3', pin: 'vdd' },
                    { role: 'pull-sda', component: 'R1', pin: 'a' },
                    { role: 'pull-scl', component: 'R2', pin: 'a' },
                ],
            },
            { id: 'gnd', label: 'GND', iface: 'gnd', side: 'bottom', offset: 98, pins: [{ role: 'gnd', component: 'U3', pin: 'gnd' }] },
            {
                id: 'eth',
                label: 'ETH',
                iface: 'eth',
                side: 'left',
                offset: 40,
                pins: [
                    { role: 'txd0', component: 'U3', pin: 'txd0' },
                    { role: 'rxd0', component: 'U3', pin: 'rxd0' },
                    { role: 'mdc', component: 'U3', pin: 'mdc' },
                    { role: 'mdio', component: 'U3', pin: 'mdio' },
                ],
            },
            {
                id: 'uart',
                label: 'UART',
                iface: 'uart',
                side: 'left',
                offset: 92,
                pins: [
                    { role: 'tx', component: 'U3', pin: 'pa9' },
                    { role: 'rx', component: 'U3', pin: 'pa10' },
                ],
            },
            {
                id: 'dir',
                label: 'DIR',
                iface: 'gpio',
                side: 'left',
                offset: 130,
                pins: [{ role: '485-dir', component: 'U3', pin: 'pb0' }],
            },
            {
                id: 'i2c',
                label: 'I2C',
                iface: 'i2c',
                side: 'right',
                offset: 40,
                pins: [
                    { role: 'sda', component: 'U3', pin: 'pb7' },
                    { role: 'scl', component: 'U3', pin: 'pb6' },
                ],
            },
            {
                id: 'gpio',
                label: 'GPIO',
                iface: 'gpio',
                side: 'right',
                offset: 92,
                pins: [
                    { role: 'alert', component: 'U3', pin: 'pb1' },
                    { role: 'spare', component: 'U3', pin: 'pb4' },
                ],
            },
        ],
    },
    {
        id: 's-eth',
        name: 'Ethernet',
        board: 'main',
        position: { x: 64, y: 420 },
        size: { width: 196, height: 132 },
        notes: 'PHY + magnetics jack',
        ports: [
            {
                id: 'eth',
                label: 'ETH',
                iface: 'eth',
                side: 'right',
                offset: 48,
                pins: [
                    { role: 'txd0', component: 'U5', pin: 'txd0' },
                    { role: 'rxd0', component: 'U5', pin: 'rxd0' },
                    { role: 'mdc', component: 'U5', pin: 'mdc' },
                    { role: 'mdio', component: 'U5', pin: 'mdio' },
                ],
            },
            { id: 'pwr', label: '3V3', iface: 'power', side: 'top', offset: 70, pins: [{ role: 'vdd', component: 'U5', pin: 'vdd' }] },
            { id: 'gnd', label: 'GND', iface: 'gnd', side: 'top', offset: 128, pins: [{ role: 'gnd', component: 'U5', pin: 'gnd' }] },
        ],
    },
    {
        id: 's-485',
        name: 'RS-485',
        board: 'main',
        position: { x: 640, y: 420 },
        size: { width: 196, height: 132 },
        notes: 'Half-duplex field bus',
        ports: [
            {
                id: 'uart',
                label: 'UART',
                iface: 'uart',
                side: 'right',
                offset: 48,
                pins: [
                    { role: 'rx', component: 'U4', pin: 'ro' },
                    { role: 'tx', component: 'U4', pin: 'di' },
                ],
            },
            {
                id: 'dir',
                label: 'DIR',
                iface: 'gpio',
                side: 'right',
                offset: 92,
                pins: [{ role: '485-dir', component: 'U4', pin: 'de' }],
            },
            {
                id: 'bus',
                label: 'A/B',
                iface: 'rs485',
                side: 'left',
                offset: 48,
                pins: [
                    { role: 'a', component: 'U4', pin: 'a' },
                    { role: 'b', component: 'U4', pin: 'b' },
                ],
            },
            { id: 'pwr', label: '3V3', iface: 'power', side: 'top', offset: 70, pins: [{ role: 'vdd', component: 'U4', pin: 'vdd' }] },
            { id: 'gnd', label: 'GND', iface: 'gnd', side: 'top', offset: 128, pins: [{ role: 'gnd', component: 'U4', pin: 'gnd' }] },
        ],
    },
    {
        id: 's-sensor',
        name: 'Sensor Board',
        board: 'sensor',
        position: { x: 1180, y: 420 },
        size: { width: 196, height: 156 },
        notes: 'I²C environment sensor daughterboard',
        ports: [
            {
                id: 'i2c',
                label: 'I2C',
                iface: 'i2c',
                side: 'left',
                offset: 40,
                pins: [
                    { role: 'sda', component: 'J3', pin: 'sda' },
                    { role: 'scl', component: 'J3', pin: 'scl' },
                ],
            },
            { id: 'gpio', label: 'ALERT', iface: 'gpio', side: 'left', offset: 92, pins: [{ role: 'alert', component: 'J3', pin: 'alert' }] },
            { id: 'pwr', label: 'VS', iface: 'power', side: 'top', offset: 98, pins: [{ role: 'vs', component: 'J3', pin: 'vs' }] },
            { id: 'gnd', label: 'GND', iface: 'gnd', side: 'bottom', offset: 98, pins: [{ role: 'gnd', component: 'J3', pin: 'gnd' }] },
        ],
    },
    {
        id: 's-field',
        name: 'Field Connector',
        board: 'main',
        position: { x: 352, y: 420 },
        size: { width: 196, height: 132 },
        notes: 'M12 to harness H1',
        ports: [
            {
                id: 'bus',
                label: 'A/B',
                iface: 'rs485',
                side: 'right',
                offset: 48,
                pins: [
                    { role: 'a', component: 'J4', pin: 'p1' },
                    { role: 'b', component: 'J4', pin: 'p2' },
                ],
            },
            { id: 'gnd', label: 'GND', iface: 'gnd', side: 'right', offset: 92, pins: [{ role: 'gnd', component: 'J4', pin: 'p3' }] },
        ],
    },
];

export const INITIAL_DESIGN: Design = {
    boards: BOARDS,
    subsystems: SUBSYSTEMS,
    components: COMPONENTS,
    wires: WIRES,
    archVertices: {},
};
