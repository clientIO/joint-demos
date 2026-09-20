import { HTMLHost, useCellId } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { useEditor } from '../editor-context';
import { MoreButton } from './buttons';

/** The start of the diagram, a white circle with a dark outline, or one of its ends, a dark one: their label inside. */
export function TerminalView({ kind }: { kind: 'start' | 'end' }): ReactNode {
    const id = useCellId();
    const editor = useEditor();
    return (
        <HTMLHost className={`terminal ${kind}${editor.selectedId === id ? ' selected' : ''}`}>
            <span className="label">{kind === 'start' ? 'Start' : 'End'}</span>
            <MoreButton />
        </HTMLHost>
    );
}
