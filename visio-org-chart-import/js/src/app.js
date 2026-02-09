import { dia, util, ui, shapes } from '@joint/plus';
import { VisioArchive, VisioElement, types } from '@joint/format-visio';

const { VisioSectionType, VisioCellName } = types;
const { standard } = shapes;

export const init = async () => {
    
    const graph = new dia.Graph({}, {
        cellNamespace: {
            ...standard,
            VisioElement
        }
    });
    
    const paper = new dia.Paper({
        el: document.getElementById('paper'),
        model: graph,
        width: 1000,
        height: 600,
        gridSize: 10,
        interactive: true,
        async: true,
        frozen: true,
        sorting: dia.Paper.sorting.APPROX,
        background: { color: '#F3F7F6' }
    });
    
    const { document: vsdDocument } = await VisioArchive.fromURL('./assets/orgchart.vsdx');
    const [page] = vsdDocument.getPages();
    const pageContent = await page.getContent();
    
    const cells = pageContent.toGraphCells({
        
        importShape: (vsdShape) => {
            
            const data = vsdShape.getComputedSection(VisioSectionType.Property);
            const name = data.getProperty('Name');
            const title = data.getProperty('Title');
            const fillForegnd = vsdShape.getCell(VisioCellName.FillForegnd).eval();
            const { x, y, width, height } = vsdShape.getPageBBox();
            const z = vsdShape.getPageZIndex();
            
            const element = new standard.EmbeddedImage({
                position: { x, y },
                size: { width, height },
                z,
                data: {
                    name,
                    title,
                    color: fillForegnd
                },
                attrs: {
                    root: {
                        magnetSelector: 'body'
                    },
                    image: {
                        event: 'element:image:pointerclick',
                        cursor: 'pointer'
                    },
                    body: {
                        rx: 5,
                        ry: 5,
                        stroke: fillForegnd,
                        strokeWidth: 3,
                        fill: fillForegnd,
                        fillOpacity: 0.3
                    },
                    label: {
                        fontFamily: 'sans-serif',
                        fill: '#666666',
                        text: `${name}\n${title}`,
                        lineHeight: '1.5em',
                        fontSize: 11,
                        annotations: [{
                                start: 0,
                                end: name.length,
                                attrs: {
                                    'font-weight': 'bold',
                                    'fill': '#000000'
                                }
                            }]
                    }
                }
            });
            
            return element;
        },
        
        importImage: (_vsdShape, element, image) => {
            element.attr('image/xlinkHref', image.base64);
        },
        
        importConnect: (vsdConnect, sourceElement, targetElement) => {
            
            if (!sourceElement)
                return null;
            
            const { vertices, z } = vsdConnect.toLinkAttributes(sourceElement, targetElement);
            
            const link = new standard.Link({
                vertices,
                z,
                source: { id: sourceElement.id },
                target: { id: targetElement.id },
                attrs: {
                    line: {
                        targetMarker: null,
                        stroke: sourceElement.prop('data/color'),
                        strokeWidth: 3
                    }
                }
            });
            
            return link;
        }
        
    });
    
    graph.resetCells(cells);
    
    paper.setDimensions(page.width, page.height);
    
    paper.on('element:image:pointerclick', (elementView, evt) => {
        evt.stopPropagation();
        const { model } = elementView;
        const image = model.attr('image/xlinkHref');
        const title = util.sanitizeHTML(`<p style="white-space:pre;">${model.prop('data/title')}<br><b>${model.prop('data/name')}</b></p>`);
        const lightbox = new ui.Lightbox({ image, title });
        lightbox.open();
    });
    
    paper.unfreeze();
};
