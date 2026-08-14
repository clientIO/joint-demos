import { dia, util } from '@joint/plus';

export const HEADER_HEIGHT = 32;
export const CLUSTER_PADDING = 12;
export const LEAF_SIZE = { width: 150, height: 40 };
export const COLLAPSED_SIZE = { width: 220, height: HEADER_HEIGHT };

/** Custom paper event triggered by the cluster collapse/expand button. */
export const TOGGLE_EVENT = 'element:cluster:toggle';

const CLUSTER_COLORS = [
    { body: '#FFFFFF', border: '#C6D2FA', header: '#4666E5' },
    { body: '#F7F9FF', border: '#D8E0F8', header: '#7A90EC' }
];

const EXPANDED_ICON = 'M -4 0 4 0';
const COLLAPSED_ICON = 'M -4 0 4 0 M 0 -4 0 4';

const RADIUS = 3;
const HEADER_BOTTOM = HEADER_HEIGHT - RADIUS;

/** The header of an expanded cluster - rounded at the top, square at the bottom. */
const EXPANDED_HEADER = [
    `M 0 ${HEADER_HEIGHT} L 0 ${RADIUS}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} 0`,
    `L calc(w - ${RADIUS}) 0`,
    `A ${RADIUS} ${RADIUS} 0 0 1 calc(w) ${RADIUS}`,
    `L calc(w) ${HEADER_HEIGHT} Z`
].join(' ');

/** A collapsed cluster is nothing but its header, so all the corners are rounded. */
const COLLAPSED_HEADER = [
    `M 0 ${HEADER_BOTTOM} L 0 ${RADIUS}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} 0`,
    `L calc(w - ${RADIUS}) 0`,
    `A ${RADIUS} ${RADIUS} 0 0 1 calc(w) ${RADIUS}`,
    `L calc(w) ${HEADER_BOTTOM}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 calc(w - ${RADIUS}) ${HEADER_HEIGHT}`,
    `L ${RADIUS} ${HEADER_HEIGHT}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 0 ${HEADER_BOTTOM} Z`
].join(' ');

const clusterMarkup = util.svg/* xml */`
    <rect @selector="body"/>
    <path @selector="header"/>
    <text @selector="headerText"/>
    <rect @selector="button"/>
    <path @selector="buttonIcon"/>
`;

export class Cluster extends dia.Element {

    preinitialize() {
        this.markup = clusterMarkup;
    }

    defaults() {
        return util.defaultsDeep({
            type: 'elk.Cluster',
            size: COLLAPSED_SIZE,
            collapsed: false,
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: RADIUS,
                    ry: RADIUS,
                    strokeWidth: 1,
                    stroke: CLUSTER_COLORS[0].border,
                    fill: CLUSTER_COLORS[0].body
                },
                header: {
                    d: EXPANDED_HEADER,
                    fill: CLUSTER_COLORS[0].header
                },
                headerText: {
                    x: 10,
                    y: HEADER_HEIGHT / 2,
                    textVerticalAnchor: 'middle',
                    textAnchor: 'start',
                    fontSize: 13,
                    fontFamily: 'sans-serif',
                    letterSpacing: 0.4,
                    fill: '#FFFFFF',
                    textWrap: {
                        // The width of the element reduced by the button size.
                        width: -46,
                        maxLineCount: 1,
                        ellipsis: true
                    }
                },
                button: {
                    // The `event` attribute makes the node trigger a custom
                    // paper event instead of the default element interaction.
                    event: TOGGLE_EVENT,
                    x: 'calc(w - 28)',
                    y: HEADER_HEIGHT / 2 - 9,
                    width: 18,
                    height: 18,
                    rx: 2,
                    ry: 2,
                    cursor: 'pointer',
                    fill: '#FFFFFF',
                    fillOpacity: 0.25
                },
                buttonIcon: {
                    d: EXPANDED_ICON,
                    transform: `translate(calc(w - 19), ${HEADER_HEIGHT / 2})`,
                    stroke: '#FFFFFF',
                    strokeWidth: 1.5,
                    fill: 'none',
                    pointerEvents: 'none'
                }
            }
        }, super.defaults);
    }

    /** Nesting level of the cluster (`0` for a top-level cluster). */
    setDepth(depth: number): void {
        const { body, border, header } = CLUSTER_COLORS[depth % CLUSTER_COLORS.length];
        this.attr({
            body: { fill: body, stroke: border },
            header: { fill: header }
        });
    }

    isCollapsed(): boolean {
        return Boolean(this.get('collapsed'));
    }

    toggle(collapsed: boolean = !this.isCollapsed()): void {
        if (collapsed === this.isCollapsed()) return;
        // The button icon and the shape of the header are kept in the model
        // (and not rendered by a highlighter), so that they survive the
        // disposal of the element view by the virtual rendering.
        this.attr({
            buttonIcon: { d: collapsed ? COLLAPSED_ICON : EXPANDED_ICON },
            header: { d: collapsed ? COLLAPSED_HEADER : EXPANDED_HEADER }
        });
        this.set('collapsed', collapsed);
    }

    static isCluster(cell: dia.Cell): cell is Cluster {
        return cell instanceof Cluster;
    }
}

const leafMarkup = util.svg/* xml */`
    <rect @selector="body"/>
    <text @selector="label"/>
`;

export class Leaf extends dia.Element {

    preinitialize() {
        this.markup = leafMarkup;
    }

    defaults() {
        return util.defaultsDeep({
            type: 'elk.Leaf',
            size: LEAF_SIZE,
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 3,
                    ry: 3,
                    strokeWidth: 1,
                    stroke: '#31D0C6',
                    fill: '#E7FBF9'
                },
                label: {
                    x: 'calc(w / 2)',
                    y: 'calc(h / 2)',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    fontSize: 12,
                    fontFamily: 'sans-serif',
                    fill: '#222222'
                }
            }
        }, super.defaults);
    }
}

const edgeMarkup = util.svg/* xml */`
    <path @selector="line"/>
`;

export class Edge extends dia.Link {

    preinitialize() {
        this.markup = edgeMarkup;
    }

    defaults() {
        return util.defaultsDeep({
            type: 'elk.Edge',
            attrs: {
                line: {
                    connection: true,
                    fill: 'none',
                    stroke: '#7C7C8A',
                    strokeWidth: 1,
                    targetMarker: {
                        type: 'path',
                        d: 'M 6 3 0 0 6 -3 Z'
                    }
                }
            }
        }, super.defaults);
    }
}

export const cellNamespace = {
    elk: { Cluster, Leaf, Edge }
};
