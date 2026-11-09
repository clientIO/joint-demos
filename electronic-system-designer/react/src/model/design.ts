// The design document — the single source of truth the zustand store owns.
//
// Everything else in the app is DERIVED from this one plain-JSON structure:
// the architecture cells, the connectivity cells, the nets, the validation
// findings, the live operating point, and every output table. The two canvas
// views can never drift apart because neither owns any structure — they are
// both projections of the same Design.

import { getPart, type InterfaceKind, type PartKindId, type PinDef } from './catalog';

export interface Point {
  readonly x: number;
  readonly y: number;
}

// --- Boards ----------------------------------------------------------------

/**
 * A physical board (PCB) in the design. Boards are DATA, not an enum: users
 * create new ones from scratch and rename them; the connectivity sheet draws
 * one outline per board, hugging its components (or `origin` while empty).
 */
export interface Board {
  readonly id: string;
  readonly name: string;
  /** Top-left of the board's own outline rect on the schematic (also where an
   * empty board's placeholder sits). Dragging the outline moves this. */
  readonly origin: Point;
  /** User-resized outline footprint. Omitted → the outline hugs its
   * components (legacy behavior) or shows the empty-board placeholder. */
  readonly size?: { readonly width: number; readonly height: number };
}

export function boardById(design: Design, id: string): Board | undefined {
    return design.boards.find((board) => board.id === id);
}

/** Display name of a board, tolerating a dangling id mid-edit. */
export function boardName(design: Design, id: string): string {
    return boardById(design, id)?.name ?? id;
}

// --- Components (leaf parts on a board) ------------------------------------

export interface Component {
  readonly id: string;
  /** Reference designator ("U3", "J1") — unique across the design. */
  readonly ref: string;
  readonly part: PartKindId;
  /** Id of the board this part sits on. */
  readonly board: string;
  /** Which architecture block this component belongs to. */
  readonly subsystemId: string;
  /** Top-left position on the connectivity (schematic) sheet. */
  readonly position: Point;
  /** Free-form engineering note shown in the inspector. */
  readonly notes?: string;
}

// --- Wires (pin-to-pin connections on the schematic) -----------------------

/** One endpoint of a wire: a concrete pin of a concrete component. */
export interface PinRef {
  readonly component: string;
  readonly pin: string;
}

export interface Wire {
  readonly id: string;
  readonly from: PinRef;
  readonly to: PinRef;
  /** Seeds the net name ("SDA", "3V3"); nets without any label auto-name. */
  readonly label?: string;
  /**
   * Where along the routed length the label sits (fraction, default 0.5).
   * Stagger it when parallel wires share a corridor and their midpoints —
   * and therefore their labels — would otherwise collide.
   */
  readonly labelAt?: number;
  /** Protocol/bundle tag; wires default to the pins' interface when omitted. */
  readonly iface?: InterfaceKind;
}

/** A JointJS link-end anchor, as the router writes it (`modelCenter` + offset). */
export interface LinkAnchor {
  readonly name: string;
  readonly args?: Readonly<Record<string, number>>;
}

// --- Subsystems (architecture blocks) --------------------------------------

/**
 * An interface-level port on an architecture block. `pins` binds each named
 * signal role to a concrete component pin — that binding is what lets the
 * architecture view group schematic wires into typed bundles, and what lets
 * drawing an architecture connection expand into real pin-to-pin wires.
 */
export interface ArchPort {
  readonly id: string;
  readonly label: string;
  readonly iface: InterfaceKind;
  readonly side: 'left' | 'right' | 'top' | 'bottom';
  /** Distance of the stub along that edge, in block px. */
  readonly offset: number;
  readonly pins: readonly (PinRef & { readonly role: string })[];
}

export interface Subsystem {
  readonly id: string;
  readonly name: string;
  /** Id of the board this block's parts live on. */
  readonly board: string;
  /** Top-left position on the architecture sheet. */
  readonly position: Point;
  readonly size: { readonly width: number; readonly height: number };
  readonly ports: readonly ArchPort[];
  readonly notes?: string;
}

// --- The document ----------------------------------------------------------

export interface Design {
  readonly boards: readonly Board[];
  readonly subsystems: readonly Subsystem[];
  readonly components: readonly Component[];
  readonly wires: readonly Wire[];
  /** User-dragged route points of architecture bundles, keyed by bundle id. */
  readonly archVertices: Readonly<Record<string, readonly Point[]>>;
}

// --- Small helpers shared by every engine ----------------------------------

/** Canonical `component:pin` key for net/union lookups. */
export function pinKey(ref: PinRef): string {
    return `${ref.component}:${ref.pin}`;
}

function componentById(design: Design, id: string): Component | undefined {
    return design.components.find((component) => component.id === id);
}

export function subsystemById(design: Design, id: string): Subsystem | undefined {
    return design.subsystems.find((subsystem) => subsystem.id === id);
}

/** Resolves a wire endpoint to its catalog pin; undefined if it dangles. */
export function resolvePin(design: Design, ref: PinRef): PinDef | undefined {
    const component = componentById(design, ref.component);
    if (component === undefined) return undefined;
    const part = getPart(component.part);
    return part.pins.find((pin) => pin.id === ref.pin);
}

let counter = 0;

/** A short, unique, still-readable id, e.g. `wire-12-x1k9`. */
export function newId(prefix: string): string {
    counter += 1;
    return `${prefix}-${counter}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Next free reference designator for a part kind ("U1, U2, … U7"). Refs are
 * how engineers talk about the board, so fresh drops number themselves.
 */
export function nextRef(design: Design, part: PartKindId): string {
    const prefix = getPart(part).refPrefix;
    let highest = 0;
    for (const component of design.components) {
        if (!component.ref.startsWith(prefix)) continue;
        const numeric = Number(component.ref.slice(prefix.length));
        if (Number.isInteger(numeric) && numeric > highest) highest = numeric;
    }
    return `${prefix}${highest + 1}`;
}

/** The interface a wire carries: explicit tag, else the first tagged pin. */
export function wireInterface(design: Design, wire: Wire): InterfaceKind {
    if (wire.iface !== undefined) return wire.iface;
    const fromPin = resolvePin(design, wire.from);
    const toPin = resolvePin(design, wire.to);
    return fromPin?.iface ?? toPin?.iface ?? 'gpio';
}

/** True while both endpoints resolve to real pins (guards mid-edit states). */
export function isWireComplete(design: Design, wire: Wire): boolean {
    return resolvePin(design, wire.from) !== undefined && resolvePin(design, wire.to) !== undefined;
}
