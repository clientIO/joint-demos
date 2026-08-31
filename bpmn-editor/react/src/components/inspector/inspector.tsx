import { useRef, useState } from 'react';
import { usePaper, useOnKeyboardEvents } from '@joint/react-plus';
import { ContentTab } from './content-tab';
import { AppearanceForm } from './appearance-form';
import { useSelectedCell } from '../../hooks/use-selected-cell';

import type { KeyboardEvent } from 'react';
import type { dia } from '@joint/plus';
import type { AppElement, AppLink } from '../../shapes/shapes-typing';
import './inspector.css';

type InspectorView = 'CONTENT' | 'APPEARANCE';

/**
 * Whether the cell has any content to show (markers or shape morphing).
 */
function canAccessContentView(cell: AppElement | AppLink | null): boolean {
    if (!cell) return false;
    const hasMarkers = cell.isElement() && !!cell.getMarkers && cell.getMarkers().length > 0;
    const hasShapes = cell.getShapeList().length > 0;
    return hasMarkers || hasShapes;
}

/**
 * The inspector panel for the selected cell: a Content tab (markers, shape
 * morphing) and an Appearance tab, with an empty-state placeholder.
 */
export function Inspector() {

    const { paper } = usePaper();

    // The inspector shows the single selected cell.
    const cell = useSelectedCell() as AppElement | AppLink | null;

    const [view, setView] = useState<InspectorView>('CONTENT');
    const panelRef = useRef<HTMLElement>(null);

    // Reaching the inspector otherwise means tabbing past every cell in the
    // diagram. `alt+enter` is the platform's shortcut for the properties of
    // whatever is selected, which is what this panel is.
    useOnKeyboardEvents({
        'alt+enter': (evt: dia.Event) => {
            if (!cell) return;
            evt.preventDefault();
            // The panel itself, not its first control: focusing the region
            // is what makes assistive technology announce where the focus
            // went, and `tab` carries on into the controls from there.
            panelRef.current?.focus();
        }
    });

    // And back again. The canvas reads `escape` as "select nothing", which
    // is not what it means in here, so it stops at the panel.
    const onKeyDown = (evt: KeyboardEvent<HTMLElement>) => {
        if (evt.key !== 'Escape' || !cell) return;

        evt.stopPropagation();

        const cellView = paper?.findViewByModel(cell);
        (cellView?.el as SVGElement | undefined)?.focus?.();
    };

    const canContent = canAccessContentView(cell);
    // Fall back to the appearance view for shapes with no markers/alternatives.
    const effectiveView: InspectorView = view === 'CONTENT' && canContent ? 'CONTENT' : 'APPEARANCE';

    return (
        <aside
            ref={panelRef}
            className="inspector-container"
            aria-label="Inspector"
            // Focusable from the shortcut, but not a stop in the tab order.
            tabIndex={-1}
            onKeyDown={onKeyDown}
        >
            <div className="inspector-controls" role="group" aria-label="Inspector view">
                <button
                    type="button"
                    className={`inspector-content-button${cell && effectiveView === 'CONTENT' ? ' active' : ''}`}
                    aria-pressed={!!cell && effectiveView === 'CONTENT'}
                    disabled={!canContent}
                    onClick={() => setView('CONTENT')}
                >
                    Content
                </button>
                <button
                    type="button"
                    className={`inspector-appearance-button${cell && effectiveView === 'APPEARANCE' ? ' active' : ''}`}
                    aria-pressed={!!cell && effectiveView === 'APPEARANCE'}
                    disabled={!cell}
                    onClick={() => setView('APPEARANCE')}
                >
                    Appearance
                </button>
            </div>
            <div className="inspector">
                {!cell && (
                    <div className="inspector-empty">
                        <div className="inspector-empty-icon" />
                        <span>Start by selecting an element or link</span>
                    </div>
                )}
                {cell && effectiveView === 'CONTENT' && <ContentTab key={String(cell.id)} cell={cell} />}
                {cell && effectiveView === 'APPEARANCE' && <AppearanceForm key={String(cell.id)} cell={cell} />}
            </div>
        </aside>
    );
}
