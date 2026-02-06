import { dia, ui, shapes, util, format, g } from '@joint/plus';
import jsPDF from 'jspdf';
import './styles.scss';

const backgroundColor = '#F3F7F6';
// Paper

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    defaultConnectionPoint: { name: 'boundary' },
    background: { color: backgroundColor },
    clickThreshold: 10
});

const scroller = new ui.PaperScroller({
    paper,
    autoResizePaper: true,
    baseWidth: 100,
    baseHeight: 100,
    padding: 100,
    contentOptions: {
        useModelGeometry: true,
        padding: 100,
        allowNewOrigin: 'any'
    }
});

document.getElementById('paper-container').appendChild(scroller.el);

paper.on('blank:pointerdown', (evt) => scroller.startPanning(evt));

// Example

graph.fromJSON({
    cells: [
        {
            id: 'r3',
            presentationOrder: 1,
            type: 'standard.Rectangle',
            position: { x: 200, y: 80 },
            size: { width: 100, height: 60 },
            attrs: {
                body: {
                    rx: 20,
                    ry: 20
                },
                label: {
                    text: 'Start'
                }
            }
        },
        {
            id: 'p2',
            presentationOrder: 2,
            type: 'standard.Path',
            position: { x: 200, y: 230 },
            size: { width: 100, height: 60 },
            attrs: {
                body: {
                    d: 'M 20 0 H calc(w) L calc(w-20) calc(h) H 0 Z'
                },
                label: {
                    text: 'Input'
                }
            }
        },
        {
            id: 'p1',
            presentationOrder: 3,
            type: 'standard.Path',
            position: { x: 200, y: 400 },
            size: { width: 100, height: 100 },
            attrs: {
                body: {
                    d:
                        'M 0 calc(0.5 * h) calc(0.5 * w) 0 calc(w) calc(0.5 * h) calc(0.5 * w) calc(h) Z'
                },
                label: {
                    text: 'Decision'
                }
            }
        },
        {
            id: 'r4',
            type: 'standard.Rectangle',
            presentationOrder: 4,
            position: { x: 200, y: 600 },
            size: { width: 100, height: 60 },
            attrs: {
                label: {
                    text: 'Process'
                }
            }
        },
        {
            id: 'e1',
            presentationOrder: 5,
            type: 'standard.Ellipse',
            position: { x: 220, y: 750 },
            size: { width: 60, height: 60 },
            attrs: {
                label: {
                    text: 'End'
                }
            }
        },
        {
            id: 'l1',
            type: 'standard.Link',
            source: { id: 'r3' },
            target: { id: 'p2' }
        },
        {
            id: 'l2',
            type: 'standard.Link',
            source: { id: 'p2' },
            target: { id: 'p1' }
        },
        {
            id: 'l3',
            type: 'standard.Link',
            source: { id: 'p1' },
            target: { id: 'r4' },
            labels: [{ attrs: { text: { text: 'Yes' }}}]
        },
        {
            id: 'l4',
            type: 'standard.Link',
            source: { id: 'p1' },
            target: { id: 'p2' },
            vertices: [
                { x: 400, y: 450 },
                { x: 400, y: 260 }
            ],
            labels: [{ attrs: { text: { text: 'No' }}}]
        },
        {
            id: 'l5',
            type: 'standard.Link',
            source: { id: 'r4' },
            target: { id: 'e1' }
        }
    ]
});

scroller.centerContent({ useModelGeometry: true });

// Toolbar

const toolbar = new ui.Toolbar({
    theme: 'modern',
    tools: [
        {
            type: 'button',
            text: 'PDF',
            name: 'pdf'
        },
        {
            type: 'button',
            text: 'PNG',
            name: 'png'
        },
        {
            type: 'button',
            text: 'SVG',
            name: 'svg'
        },
        {
            type: 'button',
            text: 'JSON',
            name: 'json'
        }
    ]
});

document.getElementById('toolbar-container').appendChild(toolbar.render().el);

const exportOptions = {
    padding: 20,
    useComputedStyles: false,
    backgroundColor,
    size: '2x'
};

// PDF
toolbar.on('pdf:pointerclick', () => {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const pageMargin = 20;
    const doc = new jsPDF('p', 'pt', [pageWidth, pageHeight]);
    const imageMargin = 2;
    const y = 50;

    doc.text('JointJS Diagram', pageWidth / 2, y / 2, { align: 'center' });

    format.toCanvas(
        paper,
        (canvas) => {
            // Page 1.
            const imageRect = new g.Rect(0, 0, canvas.width, canvas.height);
            const maxImageRect = new g.Rect(
                0,
                0,
                pageWidth - 2 * pageMargin,
                pageHeight - y - pageMargin
            );
            const scale = maxImageRect.maxRectUniformScaleToFit(
                imageRect,
                new g.Point(0, 0)
            );
            const width = canvas.width * scale;
            const height = canvas.height * scale;
            const x = (pageWidth - width) / 2;
            // draw a rectangle around the diagram
            doc.setDrawColor(211, 211, 211);
            doc.setFillColor(backgroundColor);
            doc.setLineWidth(1);
            doc.roundedRect(
                x - imageMargin,
                y - imageMargin,
                width + 2 * imageMargin,
                height + 2 * imageMargin,
                2,
                2,
                'FD'
            );
            // draw the diagram from the canvas
            doc.addImage(canvas, 'JPEG', x, y, width, height);
            // Page 2.
            doc.addPage();

            doc.text('Shapes Table', pageWidth / 2, y / 2, { align: 'center' });

            const getElementRows = (start) => {
                const result = [];
                let i = 1;
                graph.search(start, (el) => {
                    const { x, y } = el.position().toJSON();
                    result.push({
                        id: i++,
                        name: el.attr(['label', 'text']),
                        type: el.get('type'),
                        x: String(x),
                        y: String(y)
                    });
                });
                return result;
            };

            const headerNames = ['name', 'type', 'x', 'y'];
            const headerWidths = [300, 300, 70, 70];
            const headers = headerNames.map((key, index) => {
                return {
                    id: key,
                    name: key,
                    prompt: key,
                    width: headerWidths[index],
                    align: 'center'
                };
            });

            const [start] = graph.getSources();
            doc.table(pageMargin, y, getElementRows(start), headers, {
                headerBackgroundColor: '#557AC5',
                headerTextColor: '#FFFFFF'
            });

            // download the PDF
            doc.save('diagram.pdf');
        },
        { ...exportOptions }
    );
});

// PNG
toolbar.on('png:pointerclick', () => {
    format.toPNG(
        paper,
        (dataUri) => {
            util.downloadDataUri(dataUri, 'diagram.png');
        },
        exportOptions
    );
});

// SVG
toolbar.on('svg:pointerclick', () => {
    format.toSVG(
        paper,
        (svg) => {
            util.downloadDataUri(
                `data:image/svg+xml,${encodeURIComponent(svg)}`,
                'diagram.svg'
            );
        },
        exportOptions
    );
});

// JSON
toolbar.on('json:pointerclick', () => {
    const str = JSON.stringify(graph.toJSON());
    const bytes = new TextEncoder().encode(str);
    const blob = new Blob([bytes], { type: 'application/json;charset=utf-8' });
    util.downloadBlob(blob, 'diagram.json');
});
