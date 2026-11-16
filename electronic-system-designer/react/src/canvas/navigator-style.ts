// The minimap's look — real silhouettes, not gray boxes.
//
// The react-plus <Navigator> draws each cell as ONE svg <path> for speed, and
// its `elementStyle` / `linkStyle` callbacks may return `d` — a custom path
// GEOMETRY — plus inline CSS. That documented hook is all it takes to make
// the minimap a true miniature of the sheet: chamfered blocks and IC bodies,
// part-specific glyphs, and wires colored by their interface. Colors are CSS
// variables, so the minimap follows the theme like everything else.

import type { NavigatorElementStyleCallback, NavigatorLinkStyleCallback } from '@joint/react-plus';
import type { PartKindId } from '@/model/catalog';
import { useDesignerStore } from '@/state/designer-store';
import {
    isBoardFrameCell,
    isBundleCell,
    isComponentCell,
    isSubsystemCell,
    isWireCell,
} from '@/views/cell-data';

/** The signature chamfer (top-left + bottom-right), as a closed path. */
function chamferPath(width: number, height: number, cut: number): string {
    return `M ${cut} 0 H ${width} V ${height - cut} L ${width - cut} ${height} H 0 V ${cut} Z`;
}

/** A rectangle sub-path (compose several shapes into one `d`). */
function rectPath(x: number, y: number, width: number, height: number): string {
    return `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;
}

/** A circle approximated with two arcs. */
function circlePath(cx: number, cy: number, r: number): string {
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
}

/** Miniature glyph per part — enough geometry to recognize the symbol. */
function partSilhouette(partId: PartKindId, width: number, height: number): string {
    switch (partId) {
        case 'fuse':
            return rectPath(4, height / 2 - 7, width - 8, 14) + ` M 4 ${height / 2} H ${width - 4}`;
        case 'res-10k':
        case 'res-120':
            return rectPath(width / 2 - 7, 10, 14, height - 20);
        case 'res-330':
            return rectPath(10, height / 2 - 7, width - 20, 14);
        case 'led':
            return `M ${width / 2 - 8} ${height / 2 - 9} h 16 l -8 16 Z`;
        case 'chassis':
            return `M ${width / 2} 0 V ${height / 2} M ${width / 2 - 12} ${height / 2} H ${width / 2 + 12}`;
        case 'splice':
            return rectPath(8, height / 2 - 6, width - 16, 12);
        case 'field-connector':
            return rectPath(0, 0, width, height) + circlePath(width - 36, height / 2 - 4, 22);
        case 'rj45':
            return rectPath(0, 0, width - 10, height) + rectPath(14, height / 2 - 22, 38, 26);
        case 'sensor-header':
            return rectPath(10, 0, width - 20, height);
        case 'dc-input':
            return rectPath(0, 0, width, height) + circlePath(20, 20, 7) + circlePath(20, 44, 7);
        default:
            // ICs and regulators: the chamfered body.
            return chamferPath(width, height, 10);
    }
}

export const NAV_ELEMENT_STYLE: NavigatorElementStyleCallback<unknown> = ({ width, height, record }) => {
    const { data } = record;
    if (isSubsystemCell(data)) {
        return {
            d: chamferPath(width, height, 12),
            fill: 'color-mix(in oklch, var(--card) 80%, transparent)',
            stroke: 'var(--symbol-ink)',
            strokeWidth: 2,
        };
    }
    if (isBoardFrameCell(data)) {
        return {
            d: rectPath(0, 0, width, height),
            fill: 'none',
            stroke: 'color-mix(in oklch, var(--muted-foreground) 45%, transparent)',
            strokeWidth: 1.5,
            strokeDasharray: '10 8',
        };
    }
    if (isComponentCell(data)) {
        const component = useDesignerStore
            .getState()
            .design.components.find((candidate) => candidate.id === data.componentId);
        return {
            d: partSilhouette(component?.part ?? 'chassis', width, height),
            fill: 'color-mix(in oklch, var(--card) 60%, transparent)',
            stroke: 'var(--symbol-ink)',
            strokeWidth: 2,
        };
    }
    // Palette drops mid-flight and anything unknown: a quiet outline.
    return { fill: 'none', stroke: 'var(--dead)', strokeWidth: 1.5 };
};

export const NAV_LINK_STYLE: NavigatorLinkStyleCallback<unknown> = ({ record }) => {
    const { data } = record;
    const state = useDesignerStore.getState();
    // Wires and bundles keep their interface color in the miniature too.
    let iface: string | undefined;
    if (isWireCell(data)) iface = state.nets.byWire.get(data.wireId)?.iface;
    else if (isBundleCell(data)) {
        iface = state.bundles.bundles.find((bundle) => bundle.id === data.bundleId)?.iface;
    }
    if (iface === undefined) return { stroke: 'var(--dead)', strokeWidth: 1.5 };
    return {
        stroke: `var(--iface-${iface})`,
        strokeWidth: iface === 'gnd' ? 1 : 2,
        opacity: iface === 'gnd' ? 0.55 : 0.9,
    };
};
