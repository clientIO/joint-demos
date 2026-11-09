// The part catalog — the electrical vocabulary of the designer.
//
// Every component the user can place is an instance of a PartDef: a symbol
// footprint plus a list of PINS. Pins carry the electrical semantics the
// validation engine reasons about (direction, drive level, tolerated input
// level, protocol), so "5 V output wired into a 3.3 V input" is a pure data
// question — no special cases in the rules.
//
// The catalog is deliberately small and REAL: the parts, footprints, and pin
// names come from a believable 24 V industrial sensor gateway (buck + LDO
// power tree, STM32-class MCU, RMII Ethernet PHY, RS-485 transceiver, I²C
// sensor daughterboard, M12 field connector).

// --- Interfaces ------------------------------------------------------------

/** The typed interfaces a wire (and an architecture bundle) can carry. */
export type InterfaceKind =
  | 'power'
  | 'gnd'
  | 'i2c'
  | 'spi'
  | 'uart'
  | 'rs485'
  | 'can'
  | 'eth'
  | 'usb'
  | 'gpio'
  | 'analog';

export const IFACE_LABEL: Record<InterfaceKind, string> = {
    power: 'Power',
    gnd: 'Ground',
    i2c: 'I²C',
    spi: 'SPI',
    uart: 'UART',
    rs485: 'RS-485',
    can: 'CAN',
    eth: 'Ethernet',
    usb: 'USB',
    gpio: 'GPIO',
    analog: 'Analog',
};

// --- Pins ------------------------------------------------------------------

export type PinSide = 'left' | 'right' | 'top' | 'bottom';

/**
 * Electrical role of a pin:
 * - `power-out` sources a rail at a fixed voltage (the 24 V terminal, a
 *   regulator's VOUT);
 * - `power-in` is a supply input (VDD/VIN) — the part runs at whatever rail
 *   reaches it, and signal pins without an explicit level follow it;
 * - `gnd` is a ground reference;
 * - `out` / `in` / `bidi` are signal pins (drivers, receivers, both);
 * - `passive` conducts but neither drives nor receives (resistors, fuses,
 *   connector contacts).
 */
export type PinKind = 'power-out' | 'power-in' | 'gnd' | 'out' | 'in' | 'bidi' | 'passive';

export interface PinDef {
  /** Stable id within the part (wire endpoints reference `component:pin`). */
  readonly id: string;
  /** Display name on the symbol ("SDA", "VDD", "A"). */
  readonly name: string;
  /** Physical pin number for pinout tables ("59" on an LQFP-64, "2" on M12). */
  readonly number?: string;
  /** Which edge of the symbol the pin stub leaves from. */
  readonly side: PinSide;
  /** Distance of the stub along that edge, in symbol px from the top/left. */
  readonly offset: number;
  readonly kind: PinKind;
  /**
   * `power-out`: the rail voltage it sources. `out`/`bidi`: the driven logic
   * level — OMITTED means "follows the part's supply" (the common CMOS case).
   */
  readonly volts?: number;
  /** Absolute-maximum input level for `in`/`bidi`/`power-in` pins. */
  readonly maxVolts?: number;
  /**
   * Open-drain/open-collector output: the pin only ever pulls LOW. The net's
   * HIGH level comes from its pull-up resistor's rail, never from this pin —
   * which is why the seeded 5 V fault travels through the ALERT pull-up (to
   * VS) while SDA/SCL stay at 3.3 V (their pull-ups ride the 3.3 V rail).
   */
  readonly openDrain?: boolean;
  /** Protocol tag — colors the wire and feeds protocol validation. */
  readonly iface?: InterfaceKind;
}

// --- Parts -----------------------------------------------------------------

export type PartCategory =
  | 'power'
  | 'controllers'
  | 'interfaces'
  | 'sensors'
  | 'connectors'
  | 'passives';

export const CATEGORY_LABEL: Record<PartCategory, string> = {
    power: 'Power',
    controllers: 'Controllers',
    interfaces: 'Interfaces',
    sensors: 'Sensors',
    connectors: 'Connectors',
    passives: 'Passives',
};

export interface PartDef {
  readonly id: PartKindId;
  readonly name: string;
  /** Reference-designator prefix (U, J, F, R, D…) used to number instances. */
  readonly refPrefix: string;
  readonly description: string;
  readonly footprint: string;
  /** Manufacturer datasheet URL — present when the part is a real orderable
   * device (generic placeholders like the MCU stay without one). */
  readonly datasheet?: string;
  readonly category: PartCategory;
  /** Schematic symbol footprint in paper px (pins sit on this outline). */
  readonly size: { readonly width: number; readonly height: number };
  readonly pins: readonly PinDef[];
  /** Typical supply draw in mA — summed per rail for the live overlay. */
  readonly currentMa?: number;
  /**
   * Regulator conversion type: an LDO passes current 1:1 (input ≥ output), a
   * buck trades voltage for current. Explicit data — the solver never guesses
   * it from voltage ratios.
   */
  readonly topology?: 'ldo' | 'buck';
  /**
   * Pin pairs that conduct straight through (fuse, resistor, eFuse). Used by
   * the operating-point solver to carry a rail across the part; it never
   * merges nets — a resistor still joins two distinct nets.
   */
  readonly passthrough?: readonly (readonly [string, string])[];
  /**
   * One signal per pin (MCUs): a pin with two unrelated wires is a design
   * error, not fan-out. Connector contacts legitimately fan out, so this
   * stays off for them.
   */
  readonly exclusivePins?: boolean;
  /** Buses this part terminates when bridged across the differential pair
   * (a 120 Ω resistor terminates RS-485 and CAN alike). */
  readonly terminates?: readonly ('rs485' | 'can')[];
}

// 20 px pin pitch keeps stubs aligned to the 4 px paper grid.
const PITCH = 20;

/** All placeable parts. Order inside a category is the palette order. */
export const PART_CATALOG = {
    // --- Power ---------------------------------------------------------------
    'dc-input': {
        id: 'dc-input',
        name: '24 V Input',
        refPrefix: 'J',
        description: '24 V field-supply terminal block',
        footprint: 'TB-2×5.08',
        category: 'power',
        size: { width: 96, height: 64 },
        pins: [
            { id: 'p24', name: '+24V', number: '1', side: 'right', offset: PITCH, kind: 'power-out', volts: 24, iface: 'power' },
            { id: 'gnd', name: '0V', number: '2', side: 'right', offset: PITCH * 2, kind: 'gnd', iface: 'gnd' },
        ],
    },
    fuse: {
        id: 'fuse',
        // Value-first name: the symbol's value label shows the first two words,
        // so this renders "2 A" beside the body, the way real capture labels it.
        name: '2 A Fuse',
        refPrefix: 'F',
        description: 'Slow-blow input fuse',
        footprint: '5×20 mm',
        category: 'power',
        size: { width: 64, height: 24 },
        pins: [
            { id: 'a', name: '1', side: 'left', offset: 12, kind: 'passive', iface: 'power' },
            { id: 'b', name: '2', side: 'right', offset: 12, kind: 'passive', iface: 'power' },
        ],
        passthrough: [['a', 'b']],
    },
    efuse: {
        id: 'efuse',
        name: 'Protection eFuse',
        // An eFuse is an active IC — refdes class U (D is reserved for diodes).
        refPrefix: 'U',
        description: 'Surge + reverse-polarity protection',
        footprint: 'TPS2662',
        datasheet: 'https://www.ti.com/lit/ds/symlink/tps2662.pdf',
        category: 'power',
        size: { width: 96, height: 72 },
        pins: [
            { id: 'in', name: 'IN', number: '1', side: 'left', offset: PITCH, kind: 'power-in', maxVolts: 60, iface: 'power' },
            { id: 'out', name: 'OUT', number: '8', side: 'right', offset: PITCH, kind: 'passive', iface: 'power' },
            { id: 'gnd', name: 'GND', number: '4', side: 'bottom', offset: 48, kind: 'gnd', iface: 'gnd' },
        ],
        passthrough: [['in', 'out']],
    },
    buck: {
        id: 'buck',
        name: 'DC/DC Buck 5 V',
        refPrefix: 'U',
        description: '24 V → 5 V switching regulator',
        // 60 V-rated part: 24 V industrial supplies surge, so the regulator needs
        // headroom over the declared 18–30 V field range. Drawn module-style
        // (VIN/VOUT/GND), so the pins carry no physical numbers — the real part's
        // switch node + external LC don't exist at this abstraction.
        footprint: 'TPS54360',
        datasheet: 'https://www.ti.com/lit/ds/symlink/tps54360.pdf',
        category: 'power',
        size: { width: 104, height: 72 },
        currentMa: 4,
        topology: 'buck',
        pins: [
            { id: 'vin', name: 'VIN', side: 'left', offset: PITCH, kind: 'power-in', maxVolts: 60, iface: 'power' },
            { id: 'vout', name: 'VOUT', side: 'right', offset: PITCH, kind: 'power-out', volts: 5, iface: 'power' },
            { id: 'gnd', name: 'GND', side: 'bottom', offset: 52, kind: 'gnd', iface: 'gnd' },
        ],
    },
    ldo: {
        id: 'ldo',
        name: 'LDO 3.3 V',
        refPrefix: 'U',
        description: '5 V → 3.3 V linear regulator',
        footprint: 'AMS1117-3.3',
        category: 'power',
        size: { width: 104, height: 72 },
        currentMa: 5,
        topology: 'ldo',
        pins: [
            { id: 'vin', name: 'VIN', number: '3', side: 'left', offset: PITCH, kind: 'power-in', maxVolts: 15, iface: 'power' },
            { id: 'vout', name: 'VOUT', number: '2', side: 'right', offset: PITCH, kind: 'power-out', volts: 3.3, iface: 'power' },
            { id: 'gnd', name: 'GND', number: '1', side: 'bottom', offset: 52, kind: 'gnd', iface: 'gnd' },
        ],
    },

    // --- Controllers ---------------------------------------------------------
    mcu: {
        id: 'mcu',
        name: 'MCU LQFP-64',
        refPrefix: 'U',
        description: 'Main system controller (Cortex-M3)',
        footprint: 'LQFP-64',
        category: 'controllers',
        size: { width: 148, height: 220 },
        currentMa: 45,
        exclusivePins: true,
        // Pin numbers are representative LQFP-64 positions (unique within the
        // package). GPIO drive follows the 3.3 V supply; inputs here are NOT 5 V
        // tolerant (maxVolts 3.6) — exactly what the seeded ALERT pull-up to the
        // 5 V rail trips over. The I²C pins are open-drain, as the bus demands.
        pins: [
            { id: 'vdd', name: 'VDD', number: '32', side: 'top', offset: 74, kind: 'power-in', maxVolts: 3.6, iface: 'power' },
            { id: 'gnd', name: 'VSS', number: '31', side: 'bottom', offset: 74, kind: 'gnd', iface: 'gnd' },
            // Left column — Ethernet RMII, UART1, and the RS-485 direction GPIO,
            // all facing the comms parts.
            { id: 'txd0', name: 'TXD0', number: '21', side: 'left', offset: PITCH * 2, kind: 'out', iface: 'eth' },
            { id: 'rxd0', name: 'RXD0', number: '22', side: 'left', offset: PITCH * 3, kind: 'in', maxVolts: 3.6, iface: 'eth' },
            { id: 'mdc', name: 'MDC', number: '23', side: 'left', offset: PITCH * 4, kind: 'out', iface: 'eth' },
            { id: 'mdio', name: 'MDIO', number: '24', side: 'left', offset: PITCH * 5, kind: 'bidi', maxVolts: 3.6, iface: 'eth' },
            { id: 'pa9', name: 'TX1', number: '42', side: 'left', offset: PITCH * 7, kind: 'out', iface: 'uart' },
            { id: 'pa10', name: 'RX1', number: '43', side: 'left', offset: PITCH * 8, kind: 'in', maxVolts: 3.6, iface: 'uart' },
            { id: 'pb0', name: 'PB0', number: '26', side: 'left', offset: PITCH * 9, kind: 'bidi', maxVolts: 3.6, iface: 'gpio' },
            // Right column — I²C1 + GPIO toward the sensor side.
            { id: 'pb7', name: 'SDA', number: '59', side: 'right', offset: PITCH * 2, kind: 'bidi', maxVolts: 3.6, openDrain: true, iface: 'i2c' },
            { id: 'pb6', name: 'SCL', number: '58', side: 'right', offset: PITCH * 3, kind: 'bidi', maxVolts: 3.6, openDrain: true, iface: 'i2c' },
            { id: 'pb1', name: 'PB1', number: '27', side: 'right', offset: PITCH * 5, kind: 'bidi', maxVolts: 3.6, iface: 'gpio' },
            { id: 'pb4', name: 'PB4', number: '56', side: 'right', offset: PITCH * 6, kind: 'bidi', maxVolts: 3.6, iface: 'gpio' },
            // SPI1, free for expansion wiring (a display, external flash…).
            { id: 'pa5', name: 'SCK', number: '33', side: 'right', offset: PITCH * 8, kind: 'out', iface: 'spi' },
            { id: 'pa6', name: 'MISO', number: '34', side: 'right', offset: PITCH * 9, kind: 'in', maxVolts: 3.6, iface: 'spi' },
            { id: 'pa7', name: 'MOSI', number: '35', side: 'right', offset: PITCH * 10, kind: 'out', iface: 'spi' },
        ],
    },

    // --- Interfaces ----------------------------------------------------------
    'eth-phy': {
        id: 'eth-phy',
        name: 'Ethernet PHY',
        refPrefix: 'U',
        description: '10/100 RMII transceiver',
        footprint: 'LAN8720A',
        datasheet: 'https://ww1.microchip.com/downloads/en/DeviceDoc/00002165B.pdf',
        category: 'interfaces',
        size: { width: 124, height: 152 },
        currentMa: 60,
        pins: [
            // Numbers audited against Microchip DS00002165 (QFN-24): VDDIO is the
            // 3.3 V I/O supply; ground is the exposed PAD (no numbered pin).
            { id: 'vdd', name: 'VDDIO', number: '6', side: 'top', offset: 62, kind: 'power-in', maxVolts: 3.6, iface: 'power' },
            { id: 'gnd', name: 'VSS', number: 'PAD', side: 'bottom', offset: 62, kind: 'gnd', iface: 'gnd' },
            // MAC side (to the MCU).
            { id: 'txd0', name: 'TXD0', number: '17', side: 'right', offset: PITCH * 2, kind: 'in', maxVolts: 3.6, iface: 'eth' },
            { id: 'rxd0', name: 'RXD0', number: '8', side: 'right', offset: PITCH * 3, kind: 'out', iface: 'eth' },
            { id: 'mdc', name: 'MDC', number: '13', side: 'right', offset: PITCH * 4, kind: 'in', maxVolts: 3.6, iface: 'eth' },
            { id: 'mdio', name: 'MDIO', number: '12', side: 'right', offset: PITCH * 5, kind: 'bidi', maxVolts: 3.6, iface: 'eth' },
            // Magnetics side (to the jack) — differential pairs.
            { id: 'txp', name: 'TX+', number: '21', side: 'left', offset: PITCH * 2, kind: 'out', iface: 'analog' },
            { id: 'txn', name: 'TX−', number: '20', side: 'left', offset: PITCH * 3, kind: 'out', iface: 'analog' },
            { id: 'rxp', name: 'RX+', number: '23', side: 'left', offset: PITCH * 4, kind: 'in', iface: 'analog' },
            { id: 'rxn', name: 'RX−', number: '22', side: 'left', offset: PITCH * 5, kind: 'in', iface: 'analog' },
        ],
    },
    rj45: {
        id: 'rj45',
        name: 'RJ45 MagJack',
        refPrefix: 'J',
        description: 'Ethernet jack with magnetics',
        footprint: 'HR911105A',
        category: 'connectors',
        size: { width: 88, height: 112 },
        pins: [
            { id: 'txp', name: 'TX+', number: '1', side: 'right', offset: PITCH, kind: 'passive', iface: 'analog' },
            { id: 'txn', name: 'TX−', number: '2', side: 'right', offset: PITCH * 2, kind: 'passive', iface: 'analog' },
            { id: 'rxp', name: 'RX+', number: '3', side: 'right', offset: PITCH * 3, kind: 'passive', iface: 'analog' },
            { id: 'rxn', name: 'RX−', number: '6', side: 'right', offset: PITCH * 4, kind: 'passive', iface: 'analog' },
        ],
    },
    rs485: {
        id: 'rs485',
        name: 'RS-485 Transceiver',
        refPrefix: 'U',
        description: 'Half-duplex 3.3 V RS-485 driver (/RE tied to DE)',
        footprint: 'THVD1410',
        datasheet: 'https://www.ti.com/lit/ds/symlink/thvd1410.pdf',
        category: 'interfaces',
        size: { width: 116, height: 132 },
        currentMa: 20,
        pins: [
            { id: 'vdd', name: 'VCC', number: '8', side: 'top', offset: 58, kind: 'power-in', maxVolts: 5.5, iface: 'power' },
            { id: 'gnd', name: 'GND', number: '5', side: 'bottom', offset: 58, kind: 'gnd', iface: 'gnd' },
            // Logic side (to the MCU UART). Half-duplex needs a direction line:
            // DE (with /RE strapped to it) is driven by an MCU GPIO.
            { id: 'ro', name: 'RO', number: '1', side: 'right', offset: PITCH * 2, kind: 'out', iface: 'uart' },
            { id: 'di', name: 'DI', number: '4', side: 'right', offset: PITCH * 3, kind: 'in', maxVolts: 5.5, iface: 'uart' },
            { id: 'de', name: 'DE', number: '3', side: 'right', offset: PITCH * 4, kind: 'in', maxVolts: 5.5, iface: 'gpio' },
            // Bus side.
            { id: 'a', name: 'A', number: '6', side: 'left', offset: PITCH * 2, kind: 'bidi', iface: 'rs485' },
            { id: 'b', name: 'B', number: '7', side: 'left', offset: PITCH * 3, kind: 'bidi', iface: 'rs485' },
        ],
    },
    'can-xcvr': {
        id: 'can-xcvr',
        name: 'CAN Transceiver',
        refPrefix: 'U',
        description: '3.3 V CAN-FD transceiver',
        footprint: 'TCAN332',
        datasheet: 'https://www.ti.com/lit/ds/symlink/tcan332.pdf',
        category: 'interfaces',
        size: { width: 116, height: 132 },
        currentMa: 25,
        pins: [
            { id: 'vdd', name: 'VCC', number: '3', side: 'top', offset: 58, kind: 'power-in', maxVolts: 3.6, iface: 'power' },
            { id: 'gnd', name: 'GND', number: '2', side: 'bottom', offset: 58, kind: 'gnd', iface: 'gnd' },
            { id: 'txd', name: 'TXD', number: '1', side: 'right', offset: PITCH * 2, kind: 'in', maxVolts: 3.6, iface: 'can' },
            { id: 'rxd', name: 'RXD', number: '4', side: 'right', offset: PITCH * 3, kind: 'out', iface: 'can' },
            { id: 'canh', name: 'CANH', number: '7', side: 'left', offset: PITCH * 2, kind: 'bidi', iface: 'can' },
            { id: 'canl', name: 'CANL', number: '6', side: 'left', offset: PITCH * 3, kind: 'bidi', iface: 'can' },
        ],
    },

    // --- Sensors -------------------------------------------------------------
    'i2c-sensor': {
        id: 'i2c-sensor',
        name: 'I²C Env Sensor',
        refPrefix: 'U',
        description: 'Temperature / humidity sensor',
        footprint: 'DFN-8',
        category: 'sensors',
        size: { width: 108, height: 112 },
        currentMa: 6,
        // SDA and ALERT are open-drain: they only pull low, so the bus HIGH level
        // is set by the pull-up rail — 3.3 V for SDA/SCL (R1/R2 on the main
        // board), but VS for ALERT (R4 on the daughterboard). Feed the board 5 V
        // and the ALERT pull-up carries 5 V to the MCU — seeded problem #1.
        pins: [
            { id: 'vs', name: 'VS', number: '1', side: 'top', offset: 54, kind: 'power-in', maxVolts: 5.5, iface: 'power' },
            { id: 'gnd', name: 'GND', number: '5', side: 'bottom', offset: 54, kind: 'gnd', iface: 'gnd' },
            { id: 'sda', name: 'SDA', number: '6', side: 'left', offset: PITCH * 2, kind: 'bidi', openDrain: true, iface: 'i2c' },
            { id: 'scl', name: 'SCL', number: '7', side: 'left', offset: PITCH * 3, kind: 'in', maxVolts: 5.5, iface: 'i2c' },
            { id: 'alert', name: 'ALERT', number: '3', side: 'left', offset: PITCH * 4, kind: 'out', openDrain: true, iface: 'gpio' },
        ],
    },

    // --- Connectors ----------------------------------------------------------
    'sensor-header': {
        id: 'sensor-header',
        name: 'Sensor Header 1×5',
        refPrefix: 'J',
        description: 'Board-to-board header (main ↔ sensor)',
        footprint: 'PH-5',
        category: 'connectors',
        size: { width: 64, height: 124 },
        pins: [
            { id: 'vs', name: 'VS', number: '1', side: 'left', offset: PITCH, kind: 'passive', iface: 'power' },
            { id: 'sda', name: 'SDA', number: '2', side: 'left', offset: PITCH * 2, kind: 'passive', iface: 'i2c' },
            { id: 'scl', name: 'SCL', number: '3', side: 'left', offset: PITCH * 3, kind: 'passive', iface: 'i2c' },
            { id: 'alert', name: 'ALERT', number: '4', side: 'left', offset: PITCH * 4, kind: 'passive', iface: 'gpio' },
            { id: 'gnd', name: 'GND', number: '5', side: 'left', offset: PITCH * 5, kind: 'gnd', iface: 'gnd' },
        ],
    },
    'field-connector': {
        id: 'field-connector',
        name: 'M12 Field Connector',
        refPrefix: 'J',
        description: 'Panel-mount M12 to the field harness',
        footprint: 'M12-4 A-code',
        category: 'connectors',
        size: { width: 112, height: 116 },
        pins: [
            { id: 'p1', name: 'A', number: '1', side: 'left', offset: PITCH, kind: 'passive', iface: 'rs485' },
            { id: 'p2', name: 'B', number: '2', side: 'left', offset: PITCH * 2, kind: 'passive', iface: 'rs485' },
            { id: 'p3', name: 'GND', number: '3', side: 'left', offset: PITCH * 3, kind: 'gnd', iface: 'gnd' },
            { id: 'shield', name: 'SHLD', number: 'S', side: 'bottom', offset: 56, kind: 'passive', iface: 'gnd' },
        ],
    },
    chassis: {
        id: 'chassis',
        name: 'Chassis Ground',
        refPrefix: 'CH',
        description: 'Chassis / earth bond point',
        footprint: 'M4 stud',
        category: 'connectors',
        size: { width: 44, height: 44 },
        pins: [{ id: 'ch', name: 'CH', side: 'top', offset: 22, kind: 'passive', iface: 'gnd' }],
    },

    // --- Passives ------------------------------------------------------------
    'res-10k': {
        id: 'res-10k',
        name: '10 kΩ Pull-up',
        refPrefix: 'R',
        description: 'Bus pull-up resistor',
        footprint: '0603',
        category: 'passives',
        size: { width: 28, height: 64 },
        pins: [
            { id: 'a', name: '1', side: 'top', offset: 14, kind: 'passive' },
            { id: 'b', name: '2', side: 'bottom', offset: 14, kind: 'passive' },
        ],
        passthrough: [['a', 'b']],
    },
    'res-330': {
        id: 'res-330',
        name: '330 Ω Series',
        refPrefix: 'R',
        description: 'LED current-limit resistor',
        footprint: '0603',
        category: 'passives',
        size: { width: 64, height: 28 },
        pins: [
            { id: 'a', name: '1', side: 'left', offset: 14, kind: 'passive' },
            { id: 'b', name: '2', side: 'right', offset: 14, kind: 'passive' },
        ],
        passthrough: [['a', 'b']],
    },
    'res-120': {
        id: 'res-120',
        name: '120 Ω Termination',
        refPrefix: 'R',
        description: 'Differential-bus termination',
        footprint: '0805',
        category: 'passives',
        size: { width: 28, height: 64 },
        pins: [
            { id: 'a', name: '1', side: 'top', offset: 14, kind: 'passive' },
            { id: 'b', name: '2', side: 'bottom', offset: 14, kind: 'passive' },
        ],
        terminates: ['rs485', 'can'],
    },
    splice: {
        id: 'splice',
        name: 'Splice',
        refPrefix: 'SP',
        description: 'In-line wire splice (crimp)',
        footprint: 'crimp',
        category: 'passives',
        size: { width: 36, height: 24 },
        pins: [
            { id: 'a', name: '1', side: 'left', offset: 12, kind: 'passive' },
            { id: 'b', name: '2', side: 'right', offset: 12, kind: 'passive' },
        ],
        passthrough: [['a', 'b']],
    },
    led: {
        id: 'led',
        name: 'Status LED',
        refPrefix: 'D',
        description: 'Green status indicator',
        footprint: '0805',
        category: 'passives',
        size: { width: 40, height: 64 },
        // (3.3 V − ~2 V forward drop) / 330 Ω ≈ 4 mA. The draw rides the GPIO
        // net, not a supply pin, so it stays outside the rail-current tree.
        currentMa: 4,
        pins: [
            { id: 'a', name: 'A', side: 'top', offset: 20, kind: 'in', maxVolts: 6 },
            { id: 'k', name: 'K', side: 'bottom', offset: 20, kind: 'passive', iface: 'gnd' },
        ],
    },
} as const satisfies Record<string, Omit<PartDef, 'id'> & { readonly id: string }>;

export type PartKindId = keyof typeof PART_CATALOG;

/** Looks a part up; the id union makes a miss a compile error, not a runtime one. */
export function getPart(id: PartKindId): PartDef {
    return PART_CATALOG[id];
}

/** Two-pin passives skip pin-name labels — the body says what they are. */
export function hidesPinNames(part: PartDef): boolean {
    return part.category === 'passives' || part.id === 'fuse' || part.id === 'chassis';
}
