import { dia, util, shapes } from '@joint/plus';
import { VisioArchive, VisioShape, types, util as vsdUtil } from '@joint/format-visio';

export const init = async () => {
    
    const { VisioCellName, VisioUnitType, VisioSectionType } = types;
    
    const appGraph = new dia.Graph({ type: 'bpmn' });
    const appPaper = new dia.Paper({
        el: document.getElementById('paper'),
        width: 1000,
        height: 600,
        sorting: dia.Paper.sorting.APPROX,
        model: appGraph,
        async: true,
        interactive: false,
        defaultRouter: { name: 'normal' },
        defaultConnectionPoint: { name: 'boundary', args: { stroke: true } }
    });
    
    document.getElementById('export-button').onclick = (() => exportPaperToVSDX(appPaper));
    
    addDemoCells(appGraph);
    
    async function exportPaperToVSDX(paper) {
        
        const archive = await VisioArchive.fromURL('./assets/bpmn.vsdx');
        const { document: vsdDocument } = archive;
        const masters = vsdDocument.getMastersNameMap();
        const [page0] = vsdDocument.getPages();
        
        await page0.fromPaper(paper, {
            
            exportLink: async (_linkView, vsdPage) => {
                const master = masters['Sequence Flow'];
                return VisioShape.fromMaster(master, vsdPage);
            },
            
            exportElement: async (elementView, vsdPage) => {
                const { model, paper } = elementView;
                // map Joint Cell to a Visio Master from the loaded document
                // do not map if master is not found (can also fall back to default)
                let master;
                switch (model.get('type')) {
                    case 'bpmn2.Event': {
                        const border = model.attr('border').borderType;
                        const masterType = border === 'thick' ? 'End Event' : 'Start Event';
                        
                        master = masters[masterType];
                        break;
                    }
                    case 'bpmn2.Activity': {
                        master = masters['Task'];
                        break;
                    }
                    case 'bpmn2.Gateway': {
                        master = masters['Gateway'];
                        break;
                    }
                }
                
                if (!master) {
                    return null;
                }
                
                // create a raw shape based on a stencil Master
                const vsdShape = await VisioShape.fromMaster(master, vsdPage);
                
                // calculate position in Visio coordinate system
                const center = model.getBBox().center();
                const paperSize = paper.getArea();
                
                const x = vsdUtil.fromPixels(center.x, VisioUnitType.IN);
                const y = vsdUtil.fromPixels(paperSize.height - center.y, VisioUnitType.IN);
                
                // set position related Visio cells
                vsdShape.setCell(VisioCellName.PinX, { value: x, units: VisioUnitType.IN });
                vsdShape.setCell(VisioCellName.PinY, { value: y, units: VisioUnitType.IN });
                
                // set shape text
                const { text } = model.attr('label');
                vsdShape.setText(text);
                
                // set other type specific cells
                const data = vsdShape.getComputedSection(VisioSectionType.Property);
                switch (model.get('type')) {
                    case 'bpmn2.Activity': {
                        const { iconType } = model.attr('icon');
                        const vsdIcon = bpmnToVisioIcon[iconType];
                        
                        if (vsdIcon) {
                            const row = data.getRow('BpmnTaskType');
                            
                            if (!row) {
                                break;
                            }
                            
                            const formatCell = row.getCell('format');
                            const format = formatCell.value || '';
                            const index = format.split(';').indexOf(vsdIcon);
                            
                            if (index > -1) {
                                row.setCell(VisioCellName.Value, {
                                    value: vsdIcon,
                                    formula: `INDEX(${index},Prop.BpmnTaskType.Format)`
                                });
                            }
                        }
                        break;
                    }
                    case 'bpmn2.Gateway': {
                        const row = data.getRow('BpmnMarkerVisible');
                        row.setCell(VisioCellName.Value, {
                            value: '1',
                            formula: null,
                            units: VisioUnitType.BOOL
                        });
                        break;
                    }
                }
                
                return vsdShape;
            }
        });
        
        const blob = await archive.toVSDX();
        
        util.downloadBlob(blob, 'project.vsdx');
    }
    
    function addDemoCells(graph) {
        
        const { bpmn2 } = shapes;
        
        const start = new bpmn2.Event({
            position: { x: 50, y: 280 },
            attrs: { label: { text: 'Received order' } },
        }).addTo(graph);
        
        const a1 = new bpmn2.Activity({
            position: { x: 150, y: 250 },
            attrs: {
                label: { text: 'Retrieve data' },
                icon: { iconType: 'script' }
            }
        }).addTo(graph);
        
        new bpmn2.Flow({
            source: { id: start.id },
            target: { id: a1.id },
            attrs: { line: { stroke: '#AAA' } }
        }).addTo(graph);
        
        const a2 = new bpmn2.Activity({
            position: { x: 350, y: 250 },
            attrs: {
                label: { text: 'Approve Data' },
                icon: { iconType: 'user' }
            }
        }).addTo(graph);
        
        new bpmn2.Flow({
            source: { id: a1.id },
            target: { id: a2.id },
            attrs: { line: { stroke: '#AAA' } }
        }).addTo(graph);
        
        const e1 = new bpmn2.Gateway({
            position: { x: 550, y: 270 },
            attrs: {
                label: { text: 'Approved?' },
                icon: { iconType: 'exclusive' }
            }
        }).addTo(graph);
        
        new bpmn2.Flow({
            source: { id: a2.id },
            target: { id: e1.id },
            attrs: { line: { stroke: '#AAA' } }
        }).addTo(graph);
        
        const a3 = new bpmn2.Activity({
            position: { x: 750, y: 100 },
            attrs: {
                label: { text: 'Order items' },
                icon: { iconType: 'script' }
            }
        }).addTo(graph);
        
        new bpmn2.Flow({
            source: { id: e1.id },
            target: { id: a3.id },
            vertices: [{ x: 579, y: 150 }],
            attrs: { line: { stroke: '#AAA' } },
            labels: [{ attrs: { text: { text: 'YES' } } }]
        }).addTo(graph);
        
        const a4 = new bpmn2.Activity({
            position: { x: 750, y: 400 },
            attrs: {
                label: { text: 'Send rejection mail' },
                icon: { iconType: 'script' }
            }
        }).addTo(graph);
        
        new bpmn2.Flow({
            source: { id: e1.id },
            target: { id: a4.id },
            vertices: [{ x: 579, y: 450 }],
            attrs: { line: { stroke: '#AAA' } },
            z: -1,
            labels: [{ attrs: { text: { text: 'NO' } } }]
        }).addTo(graph);
        
        const e2 = new bpmn2.Event({
            position: { x: 900, y: 130 },
            attrs: {
                label: { text: 'Order processed' },
                border: { borderType: 'thick' }
            }
        }).addTo(graph);
        
        new bpmn2.Flow({
            source: { id: a3.id },
            target: { id: e2.id },
            attrs: { line: { stroke: '#AAA' } }
        }).addTo(graph);
        
        const e3 = new bpmn2.Event({
            position: { x: 900, y: 430 },
            attrs: {
                label: { text: 'Order not\nprocessed' },
                border: { borderType: 'thick' }
            }
        }).addTo(graph);
        
        new bpmn2.Flow({
            source: { id: a4.id },
            target: { id: e3.id },
            attrs: { line: { stroke: '#AAA' } }
        }).addTo(graph);
    }
    
    const bpmnToVisioIcon = {
        script: 'Script',
        user: 'User'
    };
};
