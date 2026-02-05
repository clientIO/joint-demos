import { dia, util } from '@joint/plus';

const markup = util.svg/* xml*/`
    <rect @selector="body"/>
    <image @selector="icon"/>
    <text @selector="label"/>
    <text @selector="description"/>
`;

export default class ControlOption extends dia.Element {

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<dia.Element.Attributes> {
        const attributes: dia.Element.Attributes = {
            type: 'ControlOption',
            size: { width: 316, height: 75 },
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
                    rx: 10,
                    ry: 10
                },
                icon: {
                    x: 10,
                    y: 10,
                    width: 20,
                    height: 20
                },
                label: {
                    x: 40,
                    y: 20,
                    fill: '#333333',
                    fontSize: 14,
                    fontWeight: '600',
                    fontFamily: 'Inter',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'start',
                    textWrap: {
                        width: -50,
                        height: -35,
                        ellipsis: true
                    }
                },
                description: {
                    x: 10,
                    y: 50,
                    fill: '#888888',
                    fontSize: 10,
                    fontWeight: '500',
                    fontFamily: 'Inter',
                    textAnchor: 'start',
                    textWrap: {
                        width: -20,
                        height: -30,
                        ellipsis: true
                    }
                }
            }
        };

        return util.defaultsDeep(attributes, super.defaults);
    }
}
