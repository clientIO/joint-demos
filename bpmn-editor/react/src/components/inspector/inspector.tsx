import { useState } from 'react';
import { ContentTab } from './content-tab';
import { AppearanceForm } from './appearance-form';
import { useSelectedCell } from '../../hooks/use-selected-cell';

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

    // The inspector shows the single selected cell.
    const cell = useSelectedCell() as AppElement | AppLink | null;

    const [view, setView] = useState<InspectorView>('CONTENT');

    const canContent = canAccessContentView(cell);
    // Fall back to the appearance view for shapes with no markers/alternatives.
    const effectiveView: InspectorView = view === 'CONTENT' && canContent ? 'CONTENT' : 'APPEARANCE';

    return (
        <aside className="inspector-container" aria-label="Inspector">
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
