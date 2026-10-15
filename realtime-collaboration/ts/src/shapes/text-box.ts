import { V, dia, util } from '@joint/core';

// ---- Constants ----

const PADDING_X = 20;
const PADDING_Y = 16;
const MIN_WIDTH = 80;
const MIN_HEIGHT = 40;
const MAX_CONTENT_WIDTH = 240;

// ---- Text Measurement ----

let _measureSvg: SVGSVGElement | null = null;

function getMeasureSvg(): SVGSVGElement {
    if (!_measureSvg) {
        _measureSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        _measureSvg.setAttribute('width', '10000');
        _measureSvg.setAttribute('height', '10000');
        Object.assign(_measureSvg.style, {
            position: 'absolute',
            left: '-10000px',
            top: '-10000px',
        });
        document.body.appendChild(_measureSvg);
    }
    return _measureSvg;
}

const LABEL_ATTRS = { 'font-size': 14, 'font-family': 'sans-serif' };

function measureText(text: string): { width: number; height: number } {
    const broken = util.breakText(text, { width: MAX_CONTENT_WIDTH }, LABEL_ATTRS);
    const vText = V('text').attr(LABEL_ATTRS);
    vText.text(broken, { textVerticalAnchor: 'middle' });
    vText.appendTo(getMeasureSvg());
    const { width, height } = vText.getBBox();
    vText.remove();
    return { width, height };
}

// ---- Markup ----

const markup = util.svg/* xml */`
    <rect @selector="body"/>
    <text @selector="label"/>
`;

// ---- Model ----

export class TextBox extends dia.Element {
    preinitialize() {
        this.markup = markup;
    }

    defaults() {
        return {
            ...super.defaults,
            type: 'custom.TextBox',
            size: { width: MIN_WIDTH, height: MIN_HEIGHT },
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 6,
                    ry: 6,
                    strokeWidth: 2,
                    stroke: '#333333',
                    fill: '#ffffff',
                },
                label: {
                    text: '',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    x: 'calc(0.5*w)',
                    y: 'calc(0.5*h)',
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    fill: '#333333',
                    textWrap: {
                        width: MAX_CONTENT_WIDTH,
                        height: 0,
                        ellipsis: false,
                    },
                },
            },
        };
    }

    initialize(...args: any[]) {
        super.initialize(...args);
        this.on('change', this.onAttrChange, this);
        this.setSizeFromContent();
    }

    private onAttrChange() {
        if (!this.hasChanged('attrs')) return;
        this.setSizeFromContent();
    }

    setSizeFromContent() {
        const text = (this.attr('label/text') as string) || '';
        const { width, height } = measureText(text);
        const newWidth = Math.max(MIN_WIDTH, Math.ceil(width) + PADDING_X * 2);
        const newHeight = Math.max(MIN_HEIGHT, Math.ceil(height) + PADDING_Y * 2);
        const { width: currentW, height: currentH } = this.size();
        if (currentW === newWidth && currentH === newHeight) return;
        this.resize(newWidth, newHeight);
    }
}

// ---- View ----

export class TextBoxView extends dia.ElementView {
    resize() {
        super.resize();
        this.update();
    }
}
