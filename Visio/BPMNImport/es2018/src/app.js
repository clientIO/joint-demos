import { dia, shapes } from '@joint/plus';
import { VisioArchive, types } from '@joint/format-visio';

const { VisioSectionType } = types;
const { bpmn2, standard } = shapes;

export const init = async () => {
    
    const navigationEl = document.getElementById('navigation');
    const paperEl = document.getElementById('paper');
    const appEl = document.body;
    
    
    const graph = new dia.Graph();
    const paper = new dia.Paper({
        el: paperEl,
        width: 1000,
        height: 1000,
        drawGrid: true,
        sorting: dia.Paper.sorting.APPROX,
        model: graph,
        interactive: { linkMove: false },
        async: true,
        frozen: true,
    });
    
    const { document: vsdDocument } = await VisioArchive.fromURL('./assets/bpmn.vsdx');
    
    vsdDocument.getPages().forEach(page => {
        const pageEl = document.createElement('li');
        pageEl.textContent = page.name;
        pageEl.dataset.pageId = `${page.id}`;
        navigationEl.appendChild(pageEl);
    });
    
    navigationEl.addEventListener('click', ({ target }) => {
        if (navigationEl === target)
            return;
        renderPage(Number(target.dataset.pageId));
    });
    
    const [page0] = vsdDocument.getPages();
    renderPage(page0.id);
    
    async function renderPage(pageId) {
        appEl.classList.add('loading');
        Array.from(navigationEl.childNodes).forEach((pageEl) => {
            pageEl.classList.toggle('active', Number(pageEl.dataset.pageId) === pageId);
        });
        const page = vsdDocument.getPage(pageId);
        paper.setDimensions(page.width, page.height);
        const pageContent = await page.getContent();
        appEl.classList.remove('loading');
        renderPageContent(pageContent);
    }
    
    function renderPageContent(pageContent) {
        
        const cells = pageContent.toGraphCells({
            
            importShape: (vsdShape) => {
                
                let element;
                let fontSize = 10;
                
                const data = vsdShape.getComputedSection(VisioSectionType.Property);
                if (!data)
                    return null;
                
                const shapeName = data.getProperty('BpmnElementType');
                
                // Element Type
                switch (shapeName) {
                    case 'Event': {
                        element = new bpmn2.Event();
                        const eventType = data.getProperty('BpmnEventType');
                        const icon = (data.getProperty('BpmnTriggerOrResult') || 'none').toLowerCase();
                        const iconType = {
                            'none': 'none',
                            'message': 'message1',
                            'terminate': 'termination1',
                            'timer': 'timer1',
                            'error': 'error1',
                            'cancel': 'cancel1',
                            'compensation': 'compensation1',
                            'conditional': 'conditional1',
                            'link': 'link1',
                            'signal': 'signal1',
                            'multiple': 'multiple1',
                            'escalation': 'escalation1',
                            'parallel multiple': 'parallel1',
                        }[icon];
                        const iconType2 = {
                            'none': 'none',
                            'message': 'message2',
                            'terminate': 'termination2',
                            'timer': 'timer2',
                            'error': 'error2',
                            'cancel': 'cancel2',
                            'compensation': 'compensation2',
                            'conditional': 'conditional2',
                            'link': 'link2',
                            'signal': 'signal2',
                            'multiple': 'multiple2',
                            'escalation': 'escalation2',
                            'parallel multiple': 'parallel2',
                        }[icon];
                        
                        switch (eventType) {
                            case 'Start': {
                                element.attr('border/borderStyle', 'solid');
                                element.attr('icon/iconType', iconType);
                                break;
                            }
                            case 'Start (Non-Interrupting)': {
                                element.attr('border/borderStyle', 'dashed');
                                element.attr('icon/iconType', iconType);
                                break;
                            }
                            case 'Intermediate': {
                                element.attr('border/borderStyle', 'solid');
                                element.attr('border/borderType', 'double');
                                element.attr('icon/iconType', iconType);
                                break;
                            }
                            case 'Intermediate (Non-Interrupting)': {
                                element.attr('border/borderStyle', 'dashed');
                                element.attr('border/borderType', 'double');
                                element.attr('icon/iconType', iconType);
                                break;
                            }
                            case 'Intermediate (Throwing)': {
                                element.attr('border/borderStyle', 'solid');
                                element.attr('border/borderType', 'double');
                                element.attr('icon/iconType', iconType2);
                                break;
                            }
                            case 'End': {
                                element = new bpmn2.Event();
                                element.attr('border/borderType', 'thick');
                                element.attr('icon/iconType', iconType2);
                                break;
                            }
                        }
                        break;
                    }
                    case 'Artifact': {
                        const bpmnType = (data.getProperty('BpmnArtifactType') || '').toLowerCase();
                        
                        switch (bpmnType) {
                            case 'data object': {
                                element = new bpmn2.DataObject();
                                const collection = data.getProperty('BpmnCollection'); // 0 or 1
                                if (collection === '1') {
                                    element.attr('collectionIcon/collection', 'true');
                                }
                                break;
                            }
                            case 'group': {
                                element = new bpmn2.Group();
                                break;
                            }
                            case 'annotation': {
                                element = new bpmn2.Annotation();
                                fontSize = 13;
                                break;
                            }
                            default: {
                                element = new bpmn2.DataStore();
                                break;
                            }
                        }
                        break;
                    }
                    case 'Sub-Process':
                    case 'Task': {
                        element = new bpmn2.Activity();
                        const boundaryType = data.getProperty('BpmnBoundaryType');
                        const activityType = data.getProperty('BpmnTaskType');
                        const isCollapsed = data.getProperty('BpmnIsCollapsed') === '1';
                        
                        // markers
                        const markers = [];
                        const loopType = data.getProperty('BpmnLoopType');
                        const isAdHoc = data.getProperty('BpmnAdHoc') === '1';
                        const isForCompensation = data.getProperty('BpmnIsForCompensation') === '1';
                        
                        
                        // task icon
                        if (!isCollapsed && activityType) {
                            // Available Task Types
                            // data.getProperty('BpmnTaskType', 'format').split(';');
                            const icon = activityType.toLowerCase();
                            const iconType = {
                                'receive': 'receive',
                                'service': 'service',
                                'send': 'send',
                                'manual': 'manual',
                                'user': 'user',
                                'none': 'none',
                                'script': 'script',
                                'business rule': 'business-rule',
                                'instantiating receive': 'receive'
                            }[icon];
                            element.attr('icon/iconType', iconType);
                        }
                        
                        // markers
                        switch (loopType) {
                            case 'Standard': {
                                markers.push('loop');
                                break;
                            }
                            case 'Parallel MultiInstance': {
                                markers.push('parallel');
                                break;
                            }
                            case 'Sequential MultiInstance': {
                                markers.push('sequential');
                                break;
                            }
                        }
                        
                        if (isForCompensation && !markers.find(m => m === 'compensation')) {
                            markers.push('compensation');
                        }
                        if (isCollapsed && !markers.find(m => m === 'sub-process')) {
                            markers.push('sub-process');
                        }
                        if (isAdHoc) {
                            markers.push('ad-hoc');
                        }
                        
                        element.attr('markers/iconTypes', markers);
                        
                        switch (boundaryType) {
                            case 'Call': {
                                element.attr('border/borderType', 'thick');
                                break;
                            }
                            case 'Transaction': {
                                element.attr('border/borderType', 'double');
                                break;
                            }
                            case 'Event': {
                                element.attr('border/borderStyle', 'dotted');
                                break;
                            }
                            case 'Default':
                            default: {
                                element.attr('border/borderType', 'single');
                                break;
                            }
                        }
                        break;
                    }
                    case 'Expanded Sub-Process': {
                        element = new bpmn2.Activity();
                        break;
                    }
                    case 'Gateway': {
                        element = new bpmn2.Gateway();
                        
                        const gatewayType = data.getProperty('BpmnGatewayType');
                        const isMarkerVisible = data.getProperty('BpmnMarkerVisible') === '1';
                        const exclusiveType = data.getProperty('BpmnExclusiveType');
                        
                        if (gatewayType) {
                            // Available Gateway Types
                            // data.getProperty('BpmnGatewayType', 'format').split(';');
                            const iconType = {
                                'Exclusive': 'exclusive',
                                'Exclusive Event (Instantiate)': 'exclusive_event',
                                'Inclusive': 'inclusive',
                                'Parallel': 'parallel',
                                'Parallel Event (Instantiate)': 'parallel_event',
                                'Complex': 'complex'
                            }[gatewayType];
                            element.attr('icon/iconType', iconType);
                        }
                        
                        if (exclusiveType === 'Data' && gatewayType === 'Exclusive' && !isMarkerVisible) {
                            element.attr('icon/iconType', 'none');
                        }
                        
                        if (exclusiveType === 'Event' && gatewayType === 'Exclusive') {
                            element.attr('icon/iconType', 'event');
                        }
                        break;
                    }
                    default: {
                        element = new standard.Rectangle();
                        break;
                    }
                }
                
                // Element Name
                const name = data.getProperty('BpmnName');
                if (name) {
                    element.attr('label/text', name);
                    element.attr('label/fontSize', fontSize);
                }
                
                // Size & Position
                const { x, y, width, height } = vsdShape.getPageBBox();
                element.set({
                    position: { x, y },
                    size: { width, height },
                    z: 2
                });
                
                return element;
            },
            
            importConnect: (vsdConnect, sourceElement, targetElement) => {
                
                let link;
                
                const vsdShape = vsdConnect.getShape();
                const data = vsdShape.getComputedSection(VisioSectionType.Property);
                const connectionObjectType = (data.getProperty('BpmnConnectingObjectType') || '').toLowerCase();
                
                switch (connectionObjectType) {
                    case 'sequence flow': {
                        link = new bpmn2.Flow();
                        const conditionType = data.getProperty('BpmnConditionType');
                        if (conditionType) {
                            // Available Condition Types
                            // data.getProperty('BpmnConnectingObjectType', 'format').split(';');
                            const { FLOW_TYPES } = bpmn2.Flow;
                            const flowType = {
                                'Default': FLOW_TYPES.default,
                                'Expression': FLOW_TYPES.conditional,
                                'None': FLOW_TYPES.sequence
                            }[conditionType];
                            link.attr('line/flowType', flowType);
                        }
                        break;
                    }
                    
                    case 'association': {
                        link = new bpmn2.DataAssociation();
                        const sourceBBox = sourceElement.getBBox();
                        const side = sourceBBox.sideNearestToPoint(targetElement.getBBox().center());
                        const direction = data.getProperty('BpmnDirection');
                        
                        switch (direction) {
                            case 'None': {
                                link.attr('line/targetMarker', null);
                                break;
                            }
                            
                            case 'One': {
                                break;
                            }
                            
                            case 'Both': {
                                link.attr('line/sourceMarker', {
                                    'type': 'path',
                                    'd': 'M 10 -7 0 0 10 7',
                                    'stroke-width': 2,
                                    'fill': 'none'
                                });
                                break;
                            }
                        }
                        
                        switch (side) {
                            case 'top': {
                                sourceElement.attr('border/annotationD/side', 'top');
                                sourceElement.attr('label/textAnchor', 'middle');
                                sourceElement.attr('label/refX', '50%');
                                break;
                            }
                            case 'right': {
                                sourceElement.attr('border/annotationD/side', 'right');
                                sourceElement.attr('label/textAnchor', 'end');
                                sourceElement.attr('label/refX', '100%');
                                sourceElement.attr('label/refX2', '-4');
                                break;
                            }
                            case 'bottom': {
                                sourceElement.attr('border/annotationD/side', 'bottom');
                                sourceElement.attr('label/textAnchor', 'middle');
                                sourceElement.attr('label/textVerticalAnchor', 'bottom');
                                sourceElement.attr('label/refX', '50%');
                                sourceElement.attr('label/refY', '100%');
                                sourceElement.attr('label/refY2', '-6');
                                break;
                            }
                            case 'left':
                            default: {
                                sourceElement.attr('border/annotationD/side', 'left');
                                sourceElement.attr('label/textAnchor', 'start');
                                break;
                            }
                        }
                        
                        break;
                    }
                    
                    case 'message flow': {
                        link = new bpmn2.Flow();
                        link.attr('line/flowType', 'message');
                        break;
                    }
                    
                    default: {
                        link = new standard.Link();
                        break;
                    }
                }
                
                const { vertices } = vsdConnect.toLinkAttributes(sourceElement, targetElement);
                link.set({
                    vertices,
                    source: { id: sourceElement.id },
                    target: { id: targetElement.id },
                    z: 1
                });
                
                return link;
            },
            
            
            importLabels: (vsdShape, link) => {
                
                const data = vsdShape.getComputedSection(VisioSectionType.Property);
                const name = data.getProperty('BpmnName');
                if (name) {
                    link.appendLabel({
                        attrs: {
                            body: {
                                fill: '#F4F7F6'
                            },
                            label: {
                                text: name,
                                fontWeight: 'bold',
                                fontSize: 10
                            }
                        },
                        position: 0.5
                    });
                }
                
                return [];
            }
            
        });
        
        graph.resetCells(cells);
        paper.unfreeze();
        
    }
};
