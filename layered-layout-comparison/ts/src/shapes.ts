import { dia, shapes, util } from '@joint/plus';

export const ENTITY_WIDTH = 168;
export const ENTITY_HEIGHT = 52;
const ACCENT_WIDTH = 6;
const FONT_FAMILY = 'Inter, system-ui, sans-serif';

// A card with a colored accent strip: the category above the name and the code.
export class Entity extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'app.Entity',
            size: { width: ENTITY_WIDTH, height: ENTITY_HEIGHT },
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 6,
                    ry: 6,
                    fill: '#ffffff',
                    stroke: '#cbd5e1',
                    strokeWidth: 1
                },
                accent: {
                    width: ACCENT_WIDTH,
                    height: 'calc(h)',
                    rx: 3,
                    ry: 3
                },
                category: {
                    x: ACCENT_WIDTH + 10,
                    y: 15,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    fontFamily: FONT_FAMILY,
                    textVerticalAnchor: 'middle'
                },
                name: {
                    x: ACCENT_WIDTH + 10,
                    y: 'calc(0.5 * h + 3)',
                    fontSize: 13,
                    fontWeight: 600,
                    fill: '#0f172a',
                    fontFamily: FONT_FAMILY,
                    textVerticalAnchor: 'middle'
                },
                code: {
                    x: ACCENT_WIDTH + 10,
                    y: 'calc(h - 10)',
                    fontSize: 10,
                    fill: '#64748b',
                    fontFamily: FONT_FAMILY,
                    textVerticalAnchor: 'middle'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */`
            <rect @selector="body"/>
            <rect @selector="accent"/>
            <text @selector="category"/>
            <text @selector="name"/>
            <text @selector="code"/>
        `;
    }
}

export const shapesNamespace = { ...shapes, app: { Entity }};
