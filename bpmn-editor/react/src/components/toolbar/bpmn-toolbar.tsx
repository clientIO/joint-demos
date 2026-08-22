import { useState } from 'react';
import { useGraph, usePaper, useGraphHistory, useGraphHistoryStack } from '@joint/react-plus';
import { Undo2, Redo2, Printer } from 'lucide-react';
import { printDiagram, exportPNG, downloadJSON, downloadXML } from '../../actions/export-actions';
import { FileDropdown } from './file-dropdown';
import { ExportDialog } from './export-dialog';
import { Tip } from '../ui/tip';

export function BpmnToolbar() {

    const { graph } = useGraph();
    const { paper } = usePaper();
    const { undo, redo } = useGraphHistory();
    const { canUndo, canRedo } = useGraphHistoryStack();

    const [exportedPNG, setExportedPNG] = useState<string | null>(null);

    const onSavePNG = async() => {
        if (!paper) return;
        setExportedPNG(await exportPNG(paper));
    };

    return (
        <div className="bpmn-toolbar">
            <div className="toolbar-group toolbar-group-left">
                <FileDropdown />
                <div className="toolbar-separator" />
                <Tip label="Undo" side="bottom">
                    <button
                        type="button"
                        className="toolbar-button toolbar-icon-button"
                        disabled={!canUndo}
                        onClick={undo}
                    >
                        <Undo2 size={18} />
                    </button>
                </Tip>
                <Tip label="Redo" side="bottom">
                    <button
                        type="button"
                        className="toolbar-button toolbar-icon-button"
                        disabled={!canRedo}
                        onClick={redo}
                    >
                        <Redo2 size={18} />
                    </button>
                </Tip>
                <div className="toolbar-separator" />
                <Tip label="Print" side="bottom">
                    <button
                        type="button"
                        className="toolbar-button toolbar-icon-button"
                        onClick={() => paper && printDiagram(paper)}
                    >
                        <Printer size={18} />
                    </button>
                </Tip>
            </div>
            <div className="toolbar-group toolbar-group-right">
                <span className="toolbar-label">Save as:</span>
                <button
                    type="button"
                    className="toolbar-button toolbar-save-button"
                    onClick={onSavePNG}
                >
                    PNG
                </button>
                <button
                    type="button"
                    className="toolbar-button toolbar-save-button"
                    onClick={() => downloadJSON(graph)}
                >
                    JSON
                </button>
                <button
                    type="button"
                    className="toolbar-button toolbar-save-button"
                    onClick={() => paper && downloadXML(paper)}
                >
                    XML
                </button>
            </div>
            {exportedPNG && (
                <ExportDialog dataUrl={exportedPNG} onClose={() => setExportedPNG(null)} />
            )}
        </div>
    );
}
