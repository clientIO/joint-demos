/** Stable id of a collaborator; also the key of the department seat they hold. */
export type SeatId = string;

export type NodeId = string;
export type FlowId = string;

/** The kinds of card a playbook is made of. */
export const KINDS = ['trigger', 'step', 'approval', 'note'] as const;

export type Kind = (typeof KINDS)[number];

/** Display names of the kinds, shared by cards, tabs and the panel. */
export const KIND_LABELS: Record<Kind, string> = {
    trigger: 'Trigger',
    step: 'Step',
    approval: 'Approval',
    note: 'Note',
};

/**
 * One card of the playbook. A `trigger` starts the process, `step`s do the
 * work, an `approval` gates it, a `note` annotates it. The owning
 * department's seat colors the card's pill, frame and feed rows.
 */
export interface CardNode {
  readonly id: NodeId;
  readonly kind: Kind;
  readonly title: string;
  readonly subtitle: string;
  readonly x: number;
  readonly y: number;
  /** Custom card size from a halo resize; unset means the default card. */
  readonly w?: number;
  readonly h?: number;
  /** Seat id of the department that owns the card. */
  readonly owner: SeatId;
}

/** Which connect dot a flow end attaches to. */
export type PortSide = 'left' | 'right';

/** A flow still in the air: dragged out of a port, its loose end at the pointer. */
export interface FlowDraft {
  readonly from: NodeId;
  readonly fromPort: PortSide;
  /** The loose end, in graph coordinates. */
  readonly x: number;
  readonly y: number;
  /** The port the loose end has snapped to, when it has. */
  readonly to?: NodeId;
  readonly toPort?: PortSide;
}

/** A card still on its way from the rail: its kind and where it hovers. */
export interface CardDraft {
  readonly kind: Kind;
  /** Top-left corner, in graph coordinates. */
  readonly x: number;
  readonly y: number;
}

/** A directed connection between two cards. */
export interface Flow {
  readonly id: FlowId;
  readonly from: NodeId;
  readonly to: NodeId;
  readonly addedBy: SeatId;
  /**
   * The dots the flow was drawn between, when it was drawn by dragging. The
   * link then attaches exactly THERE — anchoring by geometry instead would
   * land the line on whichever side the layout happens to face, which is not
   * the dot the user aimed at. Unset for click-click connects and the seed,
   * which have no port to honour and pick their side from geometry.
   */
  readonly fromPort?: PortSide;
  readonly toPort?: PortSide;
}

/** One collaborator: a department seat at the table. */
export interface Member {
  readonly id: SeatId;
  /** Index into the department palette. */
  readonly seat: number;
  readonly person: string;
}

/** One row of the activity feed. */
export interface FeedRow {
  readonly id: string;
  readonly at: number;
  readonly seat: number;
  readonly text: string;
}

/** What each collaborator continuously shares about themselves. */
export interface Presence {
  readonly seat: number;
  readonly person: string;
  readonly department: string;
  /** Pointer position in graph coordinates, `null` when off the board. */
  readonly cursor: { readonly x: number; readonly y: number } | null;
  /** What the person is doing right now, for the cursor plate and the team panel. */
  readonly doing: 'mapping' | 'moving' | 'resizing' | 'editing' | 'idle';
  /** The card this person is dragging right now, for the board highlight. */
  readonly moving: NodeId | null;
  /** The card this person is resizing right now, for the board highlight. */
  readonly resizing: NodeId | null;
  /** The card this person is editing right now, in place or in the
   * inspector — their frame. */
  readonly focus: NodeId | null;
  /** The flow this person is dragging out of a port right now, drawn for everyone. */
  readonly drawing: FlowDraft | null;
  /** The card this person is dragging in from the rail right now, drawn for everyone. */
  readonly placing: CardDraft | null;
}
