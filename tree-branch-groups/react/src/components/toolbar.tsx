import type { ReactNode } from 'react';

import { useEditor } from '../editor-context';
import { setTheme, useTheme } from '../theme';
import { TipButton } from './tooltip';

const ICONS = {
    undo: 'M -7 -2 L -3 -6 M -7 -2 L -3 2 M -7 -2 H 2 A 4.5 4.5 0 0 1 2 7 H -2',
    redo: 'M 7 -2 L 3 -6 M 7 -2 L 3 2 M 7 -2 H -2 A 4.5 4.5 0 0 0 -2 7 H 2',
    zoomIn: 'M -1.5 -1.5 m -5.5 0 a 5.5 5.5 0 1 0 11 0 a 5.5 5.5 0 1 0 -11 0 M 2.5 2.5 L 7 7 M -4 -1.5 H 1 M -1.5 -4 V 1',
    zoomOut: 'M -1.5 -1.5 m -5.5 0 a 5.5 5.5 0 1 0 11 0 a 5.5 5.5 0 1 0 -11 0 M 2.5 2.5 L 7 7 M -4 -1.5 H 1',
    fit: 'M -7 -3 V -7 H -3 M 3 -7 H 7 V -3 M 7 3 V 7 H 3 M -3 7 H -7 V 3 M -3 -3 H 3 V 3 H -3 Z',
    reset: 'M -6 -8 H 2 L 6 -4 V 8 H -6 Z M 2 -8 V -4 H 6',
    sun: 'M 0 0 m -3.5 0 a 3.5 3.5 0 1 0 7 0 a 3.5 3.5 0 1 0 -7 0 M 0 -8 V -6 M 0 6 V 8 M -8 0 H -6 M 6 0 H 8 M -5.7 -5.7 L -4.2 -4.2 M 4.2 4.2 L 5.7 5.7 M -5.7 5.7 L -4.2 4.2 M 4.2 -4.2 L 5.7 -5.7',
    moon: 'M 2 -7.5 A 7 7 0 1 0 7.5 1 A 5.5 5.5 0 0 1 2 -7.5 Z'
};

interface ToolButtonProps {
    icon: keyof typeof ICONS;
    title: string;
    disabled?: boolean;
    onClick: () => void;
}

function ToolButton({ icon, title, disabled, onClick }: ToolButtonProps): ReactNode {
    return (
        <TipButton tip={title} className="tool-button" disabled={disabled} onClick={onClick}>
            <svg viewBox="-10 -10 20 20" width="18" height="18" aria-hidden="true">
                <path d={ICONS[icon]} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </TipButton>
    );
}

/** The toolbar: undo and redo, disabled when there is nothing to undo or redo; the zoom; a new diagram; the theme, light or dark. */
export function Toolbar(): ReactNode {
    const editor = useEditor();
    const theme = useTheme();
    return (
        <div className="toolbar" role="toolbar">
            <ToolButton icon="undo" title="Undo (Ctrl+Z)" disabled={!editor.canUndo} onClick={editor.undo} />
            <ToolButton icon="redo" title="Redo (Ctrl+Shift+Z)" disabled={!editor.canRedo} onClick={editor.redo} />
            <span className="separator" />
            <ToolButton icon="zoomOut" title="Zoom out" onClick={editor.zoomOut} />
            <ToolButton icon="zoomIn" title="Zoom in" onClick={editor.zoomIn} />
            <ToolButton icon="fit" title="Zoom to fit" onClick={editor.fit} />
            <span className="separator" />
            <ToolButton icon="reset" title="New diagram" onClick={editor.reset} />
            <span className="separator" />
            <ToolButton icon={theme === 'dark' ? 'sun' : 'moon'} title={theme === 'dark' ? 'Light theme' : 'Dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
        </div>
    );
}
