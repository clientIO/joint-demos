import { dia, util } from '@joint/plus';
import Theme from '../../diagram/theme';
import { gateSymbols } from '../../diagram/models/Gate';

import type { CellDefinition } from '../types';

const markup = util.svg/* xml*/`
    <rect @selector="body"/>
    <g @selector="preview">
        <path @selector="symbol"/>
        <text @selector="symbolText"/>
    </g>
    <text @selector="label"/>
    <text @selector="description"/>
    <text @selector="cellType"/>
`;

const circle = (cx: number, cy: number, r: number) => `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;

/**
 * Get a simplified symbol of the cell (pins included) drawn in a 50x40 box.
 */
function getSymbolPreview(definition: CellDefinition): { d: string, text: string, scale: number } {
    switch (definition.shape) {
        case 'hdl.Gate': {
            const symbol = gateSymbols[definition.symbol] || gateSymbols.and;
            const inputs = definition.ports.filter(port => port.direction === 'in').length === 1
                ? 'M 0 20 H 10'
                : `M 0 10 H ${symbol.inputLength} M 0 30 H ${symbol.inputLength}`;
            const output = symbol.inverted ? `${circle(40, 20, 3)} M 43 20 H 50` : 'M 40 20 H 50';
            return { d: `${inputs} ${symbol.body} ${symbol.back || ''} ${output}`, text: '', scale: 1 };
        }
        case 'hdl.Operator':
            return { d: `M 0 10 H 12 M 0 30 H 12 M 33 20 H 40 ${circle(20, 20, 13)}`, text: definition.symbol, scale: 1 };
        case 'hdl.Mux':
            return { d: 'M 0 20 H 10 M 0 40 H 10 M 20 55 V 60 M 30 30 H 40 M 10 0 L 30 10 L 30 50 L 10 60 Z', text: '', scale: 0.66 };
        case 'hdl.Register':
            return { d: 'M 0 15 H 10 M 0 45 H 10 M 50 15 H 60 M 10 0 H 50 V 60 H 10 Z M 10 40 L 17 45 L 10 50', text: '', scale: 0.66 };
        default:
            return { d: 'M 10 0 H 40 V 40 H 10 Z', text: '', scale: 1 };
    }
}

export default class CellOption extends dia.Element {

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<dia.Element.Attributes> {
        const attributes: dia.Element.Attributes = {
            type: 'CellOption',
            size: { width: 316, height: 64 },
            attrs: {
                root: {
                    cursor: 'pointer'
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: '#F8F9FC',
                    stroke: '#D6E0E7',
                    strokeWidth: 1,
                    rx: 8,
                    ry: 8
                },
                symbol: {
                    fill: Theme.SymbolFillColor,
                    stroke: Theme.SymbolColor,
                    strokeWidth: 1.5,
                    strokeLinejoin: 'round',
                },
                symbolText: {
                    x: 20,
                    y: 20,
                    fill: Theme.SymbolColor,
                    fontFamily: Theme.FontFamily,
                    fontSize: 14,
                    fontWeight: 'bold',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                },
                label: {
                    x: 76,
                    y: 20,
                    fill: '#333333',
                    fontSize: 14,
                    fontWeight: '600',
                    fontFamily: 'Inter',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'start',
                },
                cellType: {
                    x: 'calc(w - 10)',
                    y: 20,
                    fill: Theme.ReferenceColor,
                    fontSize: 11,
                    fontFamily: Theme.FontFamily,
                    textVerticalAnchor: 'middle',
                    textAnchor: 'end',
                },
                description: {
                    x: 76,
                    y: 44,
                    fill: '#888888',
                    fontSize: 11,
                    fontWeight: '500',
                    fontFamily: 'Inter',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'start',
                    textWrap: {
                        width: -86,
                        maxLineCount: 1,
                        ellipsis: true
                    }
                }
            }
        };

        return util.defaultsDeep(attributes, super.defaults);
    }

    static fromDefinition(definition: CellDefinition): CellOption {
        const { d, text, scale } = getSymbolPreview(definition);
        return new CellOption({
            cellType: definition.type,
            attrs: {
                preview: {
                    // All the previews are 40 units high after scaling
                    transform: `translate(14, 12) scale(${scale})`
                },
                symbol: { d },
                symbolText: { text },
                label: { text: definition.name },
                description: { text: definition.description },
                cellType: { text: definition.type }
            }
        });
    }
}
