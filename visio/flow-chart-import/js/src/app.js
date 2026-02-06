import { dia, util, linkTools, shapes } from '@joint/plus';
import { VisioArchive, types } from '@joint/format-visio';

const { VisioSectionType } = types;
const { standard, bpmn2 } = shapes;

export const init = async () => {
    
    const graph = new dia.Graph();
    
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
        background: { color: '#F3F7F6' },
        defaultConnectionPoint: { name: 'boundary', args: { stroke: true } }
    });
    
    const { document: vsdDocument } = await VisioArchive.fromURL('./assets/process.vsdx');
    const [page] = vsdDocument.getPages();
    const pageContent = await page.getContent();
    
    let poolLabel = '';
    
    const cells = pageContent.toGraphCells({
        
        importShape: (vsdShape) => {
            
            const master = vsdShape.getMaster();
            if (!master)
                return null;
            
            let element;
            switch (master.name) {
                case 'CFF Container': {
                    const [, vsdLabelShape] = vsdShape.getSubShapes();
                    poolLabel = vsdLabelShape.getText();
                    return null;
                }
                case 'Process': {
                    element = new standard.Rectangle({
                        attrs: {
                            body: {
                                fill: '#3276CE'
                            },
                            label: {
                                fill: '#FFFFFF',
                                fontFamily: 'sans-serif',
                                textWrap: {
                                    width: -10,
                                    height: -10
                                }
                            }
                        }
                    });
                    break;
                }
                case 'Decision': {
                    element = new standard.Polygon({
                        attrs: {
                            body: {
                                refPoints: '10 0 20 10 10 20 0 10',
                                fill: '#3E549E'
                            },
                            label: {
                                fill: '#FFFFFF',
                                fontFamily: 'sans-serif',
                                textWrap: {
                                    width: -30,
                                    height: -10
                                }
                            }
                        }
                    });
                    break;
                }
                default: {
                    return null;
                }
            }
            
            
            const data = vsdShape.getComputedSection(VisioSectionType.Property);
            const lane = data.getProperty('Function');
            const text = vsdShape.getText();
            const { x, y, width, height } = vsdShape.getPageBBox();
            
            element.prop({
                position: { x, y },
                size: { width, height },
                z: vsdShape.getPageZIndex(),
                lane,
                attrs: {
                    label: {
                        text
                    }
                }
            });
            
            return element;
        },
        
        importConnect: (vsdConnect, sourceElement, targetElement) => {
            
            if (!sourceElement)
                return null;
            
            const { vertices, z } = vsdConnect.toLinkAttributes(sourceElement, targetElement);
            const link = new standard.Link({
                vertices,
                z,
                source: { id: sourceElement.id },
                target: { id: targetElement.id }
            });
            
            return link;
        },
        
        importLabels: (vsdShape, link) => {
            
            const text = vsdShape.getText();
            if (text) {
                link.appendLabel({
                    attrs: {
                        text: {
                            text,
                            fontFamily: 'sans-serif'
                        }
                    }
                });
            }
        }
        
    });
    
    
    graph.resetCells(cells);
    
    // Pool
    
    const elements = cells.filter(cell => cell.isElement());
    const lanesMap = new Map();
    util.sortBy(elements, [el => el.attributes.position.y]).forEach(el => {
        const laneName = el.get('lane');
        let record = lanesMap.get(laneName);
        if (!record) {
            record = { els: [], label: laneName };
            lanesMap.set(laneName, record);
        }
        record.els.push(el);
    });
    lanesMap.forEach(record => {
        const { y, height } = graph.getCellsBBox(record.els);
        record.y1 = y;
        record.y2 = y + height;
    });
    
    const headerSize = 30;
    const poolBBox = graph.getBBox().inflate(headerSize + 30, 50);
    const poolLanes = Array.from(lanesMap.values()).map((record, index, lanes) => {
        const poolLane = { label: record.label };
        const nextRecord = lanes[index + 1];
        if (nextRecord) {
            const y1 = record.y2;
            const y2 = nextRecord.y1;
            const y0 = (y1 + y2) / 2;
            nextRecord.y = y0;
            poolLane.size = y0 - ((index > 0) ? record.y : poolBBox.y);
        }
        return poolLane;
    });
    
    const pool = new bpmn2.HeaderedPool({
        z: -1,
        position: {
            x: poolBBox.x,
            y: poolBBox.y
        },
        size: {
            width: poolBBox.width,
            height: poolBBox.height
        },
        lanes: poolLanes,
        attrs: {
            header: {
                fill: '#E1DFDD',
                stroke: '#333333'
            },
            headerLabel: {
                text: poolLabel
            },
            laneHeaders: {
                fill: '#F3F2F1'
            },
            laneLabels: {
                fontWeight: 'bold',
                fill: '#333333'
            }
        }
    });
    
    graph.addCell(pool);
    cells.forEach(cell => pool.embed(cell));
    
    paper.fitToContent({ useModelGeometry: true, padding: 10, allowNewOrigin: 'any' });
    paper.unfreeze();
    
    paper.on({
        
        'link:mouseenter': function (linkView) {
            const toolsView = new dia.ToolsView({
                tools: [
                    new linkTools.Vertices(),
                    new linkTools.Segments()
                ]
            });
            linkView.addTools(toolsView);
        },
        
        'link:mouseleave': function (linkView) {
            linkView.removeTools();
        }
        
    });
};
