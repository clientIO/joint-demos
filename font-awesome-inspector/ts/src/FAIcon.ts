import { dia, util } from '@joint/plus';
import { ICONS } from './icons';

export default class FAIcon extends dia.Element {

    defaults(): Partial<dia.Element.Attributes> {
        return {
            ...super.defaults,
            type: 'FAIcon',
            size: { width: 80, height: 80 },
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 8,
                    ry: 8,
                    fill: '#ffffff',
                    stroke: '#cad8e3',
                    strokeWidth: 2
                },
                icon: {
                    x: 'calc(0.5*w)',
                    y: 'calc(0.5*h)',
                    // The icon scales with the shorter side of the element.
                    fontSize: 'calc(0.7*s)',
                    fontFamily: 'FontAwesome',
                    fontWeight: 900,
                    textAnchor: 'middle',
                    // Center the glyph on the em box of the font.
                    textVerticalAnchor: 0,
                    dominantBaseline: 'central',
                    fill: '#0075f2',
                    text: ICONS[0].char
                },
                label: {
                    x: 'calc(0.5*w)',
                    y: 'calc(h+8)',
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'top',
                    fill: '#131e29',
                    text: ''
                }
            }
        };
    }

    preinitialize(): void {
        this.markup = util.svg/* xml */`
            <rect @selector="body" />
            <text @selector="icon" />
            <text @selector="label" />
        `;
    }
}
