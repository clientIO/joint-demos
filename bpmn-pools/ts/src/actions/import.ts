import type { dia } from '@joint/plus';
import { shapes } from '@joint/plus';
import { fromBPMN, findExtensionElements } from '@joint/format-bpmn-import';
import {
    HorizontalPool,
    VerticalPool,
    HorizontalSwimlane,
    VerticalSwimlane,
    Activity,
    HorizontalPhase,
    VerticalPhase,
    Event,
    Gateway,
    POOL_HEADER_SIZE,
    PHASE_HEADER_SIZE
} from '../shapes';

export function importXML(graph: dia.Graph, xml: XMLDocument) {

    const result = fromBPMN(xml, {
        bpmn2Shapes: {
            ...shapes.bpmn2,
            'HeaderedHorizontalPool': HorizontalPool,
            'HeaderedVerticalPool': VerticalPool,
            'HorizontalSwimlane': HorizontalSwimlane,
            'VerticalSwimlane': VerticalSwimlane,
            'Activity': Activity,
            'Event': Event,
            'Gateway': Gateway
        },
        cellFactories: {
            'participant': (xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
                const pool = defaultFactory() as shapes.bpmn2.CompositePool;
                const extensionElements = findExtensionElements(xmlNode);
                const phaseExtensionElements = extensionElements.filter(el => el.localName === 'phase');

                if (phaseExtensionElements.length) {
                    const phaseAttributes = phaseExtensionElements.map(extensionElement => {
                        return {
                            id: extensionElement.getAttribute('id'),
                            headerText: extensionElement.getAttribute('header-text'),
                            width: Number(extensionElement.getAttribute('width')),
                            height: Number(extensionElement.getAttribute('height')),
                            x: Number(extensionElement.getAttribute('x')),
                            y: Number(extensionElement.getAttribute('y'))
                        };
                    });

                    pool.set('xmlPhases', phaseAttributes);
                    // make sure that positions of swimlanes will be correct after adding phases
                    if (pool.isHorizontal()) {
                        pool.set('padding', { top: POOL_HEADER_SIZE + PHASE_HEADER_SIZE, left: 0 });
                    } else {
                        pool.set('padding', { top: 0, left: POOL_HEADER_SIZE + PHASE_HEADER_SIZE });
                    }
                }

                return pool;
            }
        },
        useLegacyPool: false
    });
    if (result.errors.length) {
        console.error(result.errors);
    }

    const cells = result.cells;
    graph.resetCells(cells);

    cells.filter(cell => cell instanceof shapes.bpmn2.CompositePool).forEach((cell: HorizontalPool | VerticalPool) => {
        let phaseConstructor: typeof HorizontalPhase | typeof VerticalPhase;
        if (cell.isHorizontal()) {
            cell.set('padding', { top: POOL_HEADER_SIZE, left: 0 });
            phaseConstructor = VerticalPhase;
        } else {
            cell.set('padding', { top: 0, left: POOL_HEADER_SIZE });
            phaseConstructor = HorizontalPhase;
        }

        const xmlPhases: any[] = cell.prop('xmlPhases') || [];

        xmlPhases.forEach((xmlPhase) => {
            const attributes = {
                id: xmlPhase.id,
                position: { x: xmlPhase.x, y: xmlPhase.y },
                size: { width: xmlPhase.width, height: xmlPhase.height },
                attrs: {
                    headerText: {
                        text: xmlPhase.headerText
                    }
                }
            };

            const phase = new phaseConstructor(attributes);
            graph.addCell(phase);
            cell.embed(phase);
        });

        cell.removeProp('xmlPhases');
        // correctly assign z value for pool cells
        cell.afterPhasesEmbedded();
    });
}

export function setupXMLImport(graph: dia.Graph, paperContainerEl: HTMLElement) {

    function dropHandler(evt: DragEvent) {
        paperContainerEl.classList.remove('drag-over');
        // Prevent default behavior (Prevent file from being opened)
        evt.preventDefault();

        let file: File;
        if (evt.dataTransfer.items) {
            // Use DataTransferItemList interface to access the file(s)
            const item = Array.from(evt.dataTransfer.items).find((item) => item.kind === 'file');
            if (item) {
                file = item.getAsFile();
            }
        } else {
            // Use DataTransfer interface to access the file(s)
            [file] = Array.from(evt.dataTransfer.files);
        }

        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const xmlString = reader.result as string;
            const xml = new DOMParser().parseFromString(xmlString, 'application/xml');
            importXML(graph, xml);
        };
        reader.readAsText(file);
    }

    function dragOverHandler(evt: DragEvent) {
        paperContainerEl.classList.add('drag-over');
        // Prevent default behavior (Prevent file from being opened)
        evt.preventDefault();
    }

    function dragLeaveHandler() {
        paperContainerEl.classList.remove('drag-over');
    }

    paperContainerEl.addEventListener('drop', dropHandler);
    paperContainerEl.addEventListener('dragover', dragOverHandler);
    paperContainerEl.addEventListener('dragleave', dragLeaveHandler);
}
