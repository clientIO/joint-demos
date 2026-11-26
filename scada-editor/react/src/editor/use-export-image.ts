import { useCells, useImageExport, type CellRecord, type Computed } from '@joint/react-plus';
import { isShapeData } from '../shapes/shape-data';
import { PAPER_ID } from './paper-id';

/*
 * The diagram as an image (WebP): the screen only when there is one, else all of it; on the canvas of the current
 * color scheme - its color, its gradient - without the editor's frame of the screen.
 */

// The exported image's file name (the extension is the type's).
const IMAGE_FILE_NAME = 'scada-diagram';
const IMAGE_QUALITY = 0.92;
// Around the whole diagram (no screen).
const IMAGE_PADDING = 20;
const GRADIENT_ID = 'scada-export-canvas-gradient';
const SVG_NS = 'http://www.w3.org/2000/svg';

/** The box of the screen, as one string (a primitive: no re-render unless it changes); empty without a screen. */
const selectScreenBox = (cells: ReadonlyArray<Computed<CellRecord>>): string => {
    const screen = cells.find((cell) => cell.type === 'element' && isShapeData(cell.data) && cell.data.kind === 'Screen');
    if (!screen || screen.type !== 'element') {
        return '';
    }
    const { x, y } = screen.position;
    const { width, height } = screen.size;
    return [x, y, width, height].join(' ');
};

function svgElement(name: string, attributes: Readonly<Record<string, string | number>>): SVGElement {
    const node = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
        node.setAttribute(key, String(value));
    }
    return node;
}

/** The canvas under the whole image (its view box): its color, or its gradient from the top color to the bottom one. */
function drawCanvas(svg: SVGSVGElement, paperElement: Element): void {
    const [x, y, width, height] = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    if (![x, y, width, height].every(Number.isFinite)) {
        return;
    }
    const computed = getComputedStyle(paperElement);
    const hasGradient = document.documentElement.hasAttribute('data-canvas-gradient');
    const rect = svgElement('rect', { x, y, width, height, fill: computed.getPropertyValue('--shape-canvas').trim() });
    if (hasGradient) {
        const gradient = svgElement('linearGradient', { id: GRADIENT_ID, x1: 0, y1: 0, x2: 0, y2: 1 });
        ['--canvas-gradient-top', '--canvas-gradient-bottom'].forEach((name, index) => {
            gradient.append(svgElement('stop', { offset: index, style: `stop-color: ${computed.getPropertyValue(name).trim()}` }));
        });
        rect.setAttribute('fill', `url(#${GRADIENT_ID})`);
        svg.prepend(gradient, rect);
        return;
    }
    svg.prepend(rect);
}

/** Exports the diagram as an image (see above) and downloads it. */
export function useExportImage(): () => void {
    const screenBox = useCells(selectScreenBox);
    const [x, y, width, height] = screenBox.split(' ').map(Number);
    const [exportImage] = useImageExport(PAPER_ID, {
        type: 'image/webp',
        quality: IMAGE_QUALITY,
        ...(screenBox ? { area: { x, y, width, height } } : { padding: IMAGE_PADDING }),
        beforeSerialize: (svg, paper) => {
            // The editor's frame of the screen is not a part of the picture.
            svg.querySelectorAll('.scada-screen').forEach((node) => node.remove());
            drawCanvas(svg, paper.el);
        },
    });
    return () => {
        void exportImage({ downloadAs: IMAGE_FILE_NAME });
    };
}
