import { util } from '@joint/plus';
import { toBPMN, exportableObjects, createExtensionElement } from '@joint/format-bpmn-export';

class HorizontalPoolExportableObject extends exportableObjects.HorizontalPool {
    
    defineExtensionElements() {
        const pool = this.cell;
        const phaseElements = [];
        const phases = pool.getPhases();
        
        phases.forEach((phase) => {
            const phaseElement = createExtensionElement('phase');
            phaseElement.setAttribute('id', phase.id.toString());
            phaseElement.setAttribute('header-text', phase.attr('headerText/text'));
            const size = phase.size();
            const position = phase.position();
            phaseElement.setAttribute('width', size.width.toString());
            phaseElement.setAttribute('height', size.height.toString());
            phaseElement.setAttribute('x', position.x.toString());
            phaseElement.setAttribute('y', position.y.toString());
            
            phaseElements.push(phaseElement);
        });
        
        return phaseElements;
    }
}

class VerticalPoolExportableObject extends exportableObjects.VerticalPool {
    
    defineExtensionElements() {
        const pool = this.cell;
        const phaseElements = [];
        const phases = pool.getPhases();
        
        phases.forEach((phase) => {
            const phaseElement = createExtensionElement('phase');
            phaseElement.setAttribute('id', phase.id.toString());
            phaseElement.setAttribute('header-text', phase.attr('headerText/text'));
            const size = phase.size();
            const position = phase.position();
            phaseElement.setAttribute('width', size.width.toString());
            phaseElement.setAttribute('height', size.height.toString());
            phaseElement.setAttribute('x', position.x.toString());
            phaseElement.setAttribute('y', position.y.toString());
            
            phaseElements.push(phaseElement);
        });
        
        return phaseElements;
    }
}

export function exportXML(paper) {
    const exportResult = toBPMN(paper, {
        exportableObjectFactories: {
            'custom.HorizontalPool': (cellView) => new HorizontalPoolExportableObject(cellView),
            'custom.VerticalPool': (cellView) => new VerticalPoolExportableObject(cellView),
            'custom.Activity': (cellView) => new exportableObjects.Activity(cellView),
            'custom.Event': (cellView) => new exportableObjects.Event(cellView),
            'custom.Gateway': (cellView) => new exportableObjects.Gateway(cellView)
        }
    });
    return exportResult.xml;
}

export function downloadXMLExport(paper, name = 'diagram.bpmn') {
    const xmlString = new XMLSerializer().serializeToString(exportXML(paper));
    const uri = `data:text/xml,${encodeURIComponent(xmlString)}`;
    util.downloadDataUri(uri, name);
}
