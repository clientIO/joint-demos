import { useState } from 'react';
import { ContentTab } from './content-tab';
import { AppearanceForm } from './appearance-form';
import { useSelectedCell } from '../../hooks/use-selected-cell';

import type { AppElement, AppLink } from '../../shapes/shapes-typing';

type InspectorView = 'CONTENT' | 'APPEARANCE';

function canAccessContentView(cell: AppElement | AppLink | null): boolean {
    if (!cell) return false;
    const hasMarkers = cell.isElement() && !!cell.getMarkers && cell.getMarkers().length > 0;
    const hasShapes = cell.getShapeList().length > 0;
    return hasMarkers || hasShapes;
}

export function InspectorPanel() {

    // The inspector shows the single selected cell.
    const cell = useSelectedCell() as AppElement | AppLink | null;

    const [view, setView] = useState<InspectorView>('CONTENT');

    const canContent = canAccessContentView(cell);
    // Fall back to the appearance view for shapes with no markers/alternatives.
    const effectiveView: InspectorView = view === 'CONTENT' && canContent ? 'CONTENT' : 'APPEARANCE';

    return (
        <div className="inspector-container">
            <div className="inspector-controls">
                <button
                    type="button"
                    className={`inspector-content-button${cell && effectiveView === 'CONTENT' ? ' active' : ''}`}
                    disabled={!canContent}
                    onClick={() => setView('CONTENT')}
                >
                    Content
                </button>
                <button
                    type="button"
                    className={`inspector-appearance-button${cell && effectiveView === 'APPEARANCE' ? ' active' : ''}`}
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
        </div>
    );
}
