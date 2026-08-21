import { type dia, format } from '@joint/plus';
import { toBPMN } from '@joint/format-bpmn-export';
import { bpmnExportOptions } from '../shapes/factories';

export function printDiagram(paper: dia.Paper) {
    format.print(paper, { grid: true });
}

// Renders the diagram to a PNG data URL (shown in the export dialog).
export function exportPNG(paper: dia.Paper): Promise<string> {
    return new Promise((resolve) => {
        paper.hideTools();
        format.toPNG(paper, (dataURL: string) => {
            paper.showTools();
            resolve(dataURL);
        }, {
            padding: 10,
            useComputedStyles: 'full',
            grid: true,
            embedFonts: true
        });
    });
}

export function downloadJSON(graph: dia.Graph) {
    const str = JSON.stringify(graph.toJSON());
    const bytes = new TextEncoder().encode(str);
    const blob = new Blob([bytes], { type: 'application/json' });
    downloadBlob(blob, 'jj-plus-bpmn-diagram.json');
}

export function downloadXML(paper: dia.Paper) {
    const { xml } = toBPMN(paper, bpmnExportOptions);
    const xmlString = new XMLSerializer().serializeToString(xml);
    const blob = new Blob([xmlString], { type: 'application/xml' });
    downloadBlob(blob, 'jj-plus-bpmn-diagram.bpmn');
}

function downloadBlob(blob: Blob, fileName: string) {
    const el = window.document.createElement('a');
    el.href = window.URL.createObjectURL(blob);
    el.download = fileName;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    window.URL.revokeObjectURL(el.href);
}
