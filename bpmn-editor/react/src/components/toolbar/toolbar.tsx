import { useState } from 'react';
import { useGraph, usePaper, useGraphHistory, useGraphHistoryStack, useOnKeyboardEvents } from '@joint/react-plus';
import { Undo2, Redo2, Printer, Sun, Moon, Keyboard } from 'lucide-react';
import { printDiagram, exportPNG, downloadJSON, downloadXML } from '../../actions/export';
import { FileDropdown } from './file-dropdown';
import { ExportDialog } from '../export-dialog/export-dialog';
import { ShortcutsDialog } from '../shortcuts-dialog/shortcuts-dialog';
import { Tip } from '../tooltip/tooltip';
import './toolbar.css';

/**
 * The app toolbar: file loading, undo/redo, print and the PNG/JSON/XML
 * exports.
 */
export function Toolbar() {

    const { graph } = useGraph();
    const { paper } = usePaper();
    const { undo, redo } = useGraphHistory();
    const { canUndo, canRedo } = useGraphHistoryStack();

    const [exportedPNG, setExportedPNG] = useState<string | null>(null);
    const [isDark, setIsDark] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);

    const toggleTheme = () => {
        const dark = !isDark;
        setIsDark(dark);
        // The theme variables are defined on `:root` (see css/variables.css)
        // because parts of the UI render in portals outside of the editor.
        document.documentElement.dataset.theme = dark ? 'dark' : '';
    };

    // `F1` is the platform's help key, and the shortcut list is the help.
    useOnKeyboardEvents({
        'F1': (evt) => {
            evt.preventDefault();
            setShowShortcuts(true);
        }
    });

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
                        aria-label="Undo"
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
                        aria-label="Redo"
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
                        aria-label="Print"
                        onClick={() => paper && printDiagram(paper)}
                    >
                        <Printer size={18} />
                    </button>
                </Tip>
                <Tip label="Keyboard shortcuts" side="bottom">
                    <button
                        type="button"
                        className="toolbar-button toolbar-icon-button"
                        aria-label="Keyboard shortcuts"
                        aria-haspopup="dialog"
                        onClick={() => setShowShortcuts(true)}
                    >
                        <Keyboard size={18} />
                    </button>
                </Tip>
                <div className="toolbar-separator" />
                {/* The toggle keeps ONE name ("Dark theme") — the on/off
                    state is aria-pressed. A name that flips with the state
                    breaks voice-control targeting (WCAG 2.5.3). */}
                <Tip label="Dark theme" side="bottom">
                    <button
                        type="button"
                        className="toolbar-button toolbar-icon-button"
                        aria-label="Dark theme"
                        aria-pressed={isDark}
                        onClick={toggleTheme}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </Tip>
            </div>
            {/* The visible "Save as:" prefix reaches AT through the group
                label, so each button announces as e.g. "PNG, Save as, group". */}
            <div className="toolbar-group toolbar-group-right" role="group" aria-label="Save as">
                <span className="toolbar-label" aria-hidden="true">Save as:</span>
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
            {showShortcuts && (
                <ShortcutsDialog onClose={() => setShowShortcuts(false)} />
            )}
        </div>
    );
}
