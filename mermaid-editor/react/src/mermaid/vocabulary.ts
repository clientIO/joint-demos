/**
 * The Mermaid flowchart vocabulary the editor offers back to the author: the
 * statements a line can start with, the layout directions, the arrow
 * spellings, and the v11 `@{ shape: … }` names. One list, read by the shape
 * picker and by the source editor's completions, so the two can never drift.
 */

export const KEYWORDS: ReadonlyArray<{ readonly word: string; readonly detail: string }> = [
    { word: 'flowchart', detail: 'Start a flowchart (followed by a direction)' },
    { word: 'graph', detail: 'Start a flowchart (older spelling)' },
    { word: 'subgraph', detail: 'Group nodes; close with `end`' },
    { word: 'end', detail: 'Close a subgraph' },
    { word: 'direction', detail: 'Layout direction inside a subgraph' },
    { word: 'style', detail: 'Style one node: `style id fill:#eee,stroke:#333`' },
    { word: 'classDef', detail: 'Define a reusable style class' },
    { word: 'class', detail: 'Apply a class to nodes: `class a,b name`' },
    { word: 'click', detail: 'Make a node a hyperlink: `click id "https://…"`' },
    { word: 'linkStyle', detail: 'Style an edge by index: `linkStyle 0 stroke:#f00`' },
];

export const DIRECTIONS: ReadonlyArray<{ readonly word: string; readonly detail: string }> = [
    { word: 'TB', detail: 'Top to bottom' },
    { word: 'TD', detail: 'Top down (same as TB)' },
    { word: 'BT', detail: 'Bottom to top' },
    { word: 'LR', detail: 'Left to right' },
    { word: 'RL', detail: 'Right to left' },
];

export const ARROWS: ReadonlyArray<{ readonly token: string; readonly detail: string }> = [
    { token: '-->', detail: 'Arrow' },
    { token: '---', detail: 'Open line' },
    { token: '-.->', detail: 'Dotted arrow' },
    { token: '==>', detail: 'Thick arrow' },
    { token: '--o', detail: 'Circle head' },
    { token: '--x', detail: 'Cross head' },
    { token: '<-->', detail: 'Arrow on both ends' },
    { token: '-->|text|', detail: 'Arrow with a label' },
    { token: '~~~', detail: 'Invisible link (layout only)' },
];

/** The v11 `@{ shape: … }` names beyond the classic delimiters. */
export const EXTENDED_SHAPES: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
    { id: 'dbl-circ', label: 'Double circle' },
    { id: 'sm-circ', label: 'Start' },
    { id: 'fr-circ', label: 'Stop' },
    { id: 'f-circ', label: 'Junction' },
    { id: 'cross-circ', label: 'Summary' },
    { id: 'lean-l', label: 'Parallelogram (left)' },
    { id: 'trap-b', label: 'Priority (trapezoid)' },
    { id: 'trap-t', label: 'Manual operation' },
    { id: 'odd', label: 'Odd' },
    { id: 'text', label: 'Text block' },
    { id: 'card', label: 'Card' },
    { id: 'lin-rect', label: 'Lined process' },
    { id: 'st-rect', label: 'Stacked process' },
    { id: 'tag-rect', label: 'Tagged process' },
    { id: 'div-rect', label: 'Divided process' },
    { id: 'win-pane', label: 'Internal storage' },
    { id: 'sl-rect', label: 'Manual input' },
    { id: 'bow-rect', label: 'Stored data' },
    { id: 'fork', label: 'Fork / join' },
    { id: 'hourglass', label: 'Collate' },
    { id: 'bolt', label: 'Com link' },
    { id: 'tri', label: 'Extract' },
    { id: 'flip-tri', label: 'Manual file' },
    { id: 'notch-pent', label: 'Loop limit' },
    { id: 'flag', label: 'Paper tape' },
    { id: 'delay', label: 'Delay' },
    { id: 'doc', label: 'Document' },
    { id: 'docs', label: 'Documents' },
    { id: 'lin-doc', label: 'Lined document' },
    { id: 'tag-doc', label: 'Tagged document' },
    { id: 'h-cyl', label: 'Direct access storage' },
    { id: 'lin-cyl', label: 'Disk storage' },
    { id: 'curv-trap', label: 'Display' },
    { id: 'brace', label: 'Comment (brace)' },
    { id: 'brace-r', label: 'Brace right' },
    { id: 'braces', label: 'Braces' },
];

/** The classic shapes by their v11 names, for `@{ shape: … }` completion. */
export const CLASSIC_SHAPE_NAMES: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
    { id: 'rect', label: 'Rectangle' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'stadium', label: 'Stadium' },
    { id: 'subroutine', label: 'Subroutine' },
    { id: 'cylinder', label: 'Cylinder' },
    { id: 'circle', label: 'Circle' },
    { id: 'diamond', label: 'Rhombus' },
    { id: 'hexagon', label: 'Hexagon' },
    { id: 'lean-r', label: 'Parallelogram' },
];
