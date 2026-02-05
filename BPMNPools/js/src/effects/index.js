import { dia, highlighters } from '@joint/plus';
import { ShadowEffect } from './ShadowEffect';
import { SwimlanePreview } from './SwimlanePreview';
import { PhasePreview } from './PhasePreview';

export const EffectType = {
    Shadow: 'shadow',
    SelectionFrame: 'selection-frame',
    SourceSwimlane: 'source-swimlane',
    TargetPhase: 'target-phase',
    TargetPhaseElement: 'target-phase-element',
    TargetPool: 'target-pool',
    PreviewSwimlane: 'preview-swimlane',
    PreviewPhase: 'preview-phase',
    InvalidDrop: 'invalid-drop',
};

export function addEffect(cellView, effectType, options) {
    const cell = cellView.model;
    switch (effectType) {
        case EffectType.Shadow: {
            const selector = cell.attr(['root', 'highlighterSelector']);
            ShadowEffect.add(cellView, selector, EffectType.Shadow);
            break;
        }
        case EffectType.SourceSwimlane: {
            highlighters.addClass.add(cellView, 'root', EffectType.SourceSwimlane, {
                className: 'hgl-swimlane-source',
            });
            break;
        }
        case EffectType.TargetPhase: {
            highlighters.addClass.add(cellView, 'root', EffectType.TargetPhase, {
                className: 'hgl-phase',
            });
            break;
        }
        case EffectType.TargetPhaseElement: {
            highlighters.addClass.add(cellView, 'root', EffectType.TargetPhaseElement, {
                className: 'hgl-phase-element',
            });
            break;
        }
        case EffectType.TargetPool: {
            highlighters.mask.add(cellView, 'body', EffectType.TargetPool, {
                attrs: {
                    stroke: '#0075f2',
                    'stroke-width': 3,
                },
            });
            break;
        }
        case EffectType.SelectionFrame: {
            const selector = cell.attr(['root', 'frameSelector']) || 'root';
            highlighters.mask.add(cellView, selector, EffectType.SelectionFrame, {
                layer: dia.Paper.Layers.FRONT,
                attrs: {
                    stroke: '#0075f2',
                    'stroke-width': 2,
                },
            });
            break;
        }
        case EffectType.PreviewSwimlane: {
            SwimlanePreview.add(cellView, 'root', EffectType.PreviewSwimlane, {
                index: options.index,
                layer: dia.Paper.Layers.FRONT,
            });
            break;
        }
        case EffectType.PreviewPhase: {
            PhasePreview.add(cellView, 'root', EffectType.PreviewPhase, {
                x: options.x,
                y: options.y,
                layer: dia.Paper.Layers.FRONT,
            });
            break;
        }
        case EffectType.InvalidDrop: {
            highlighters.addClass.add(cellView, 'root', EffectType.InvalidDrop, {
                className: 'hgl-invalid-drop',
            });
            break;
        }
    }
}

export function removeEffect(paper, effectType) {
    switch (effectType) {
        case EffectType.Shadow: {
            ShadowEffect.removeAll(paper, EffectType.Shadow);
            break;
        }
        case EffectType.SourceSwimlane: {
            highlighters.addClass.removeAll(paper, EffectType.SourceSwimlane);
            break;
        }
        case EffectType.TargetPhase: {
            highlighters.addClass.removeAll(paper, EffectType.TargetPhase);
            break;
        }
        case EffectType.TargetPool: {
            highlighters.mask.removeAll(paper, EffectType.TargetPool);
            break;
        }
        case EffectType.SelectionFrame: {
            highlighters.mask.removeAll(paper, EffectType.SelectionFrame);
            break;
        }
        case EffectType.TargetPhaseElement: {
            highlighters.addClass.removeAll(paper, EffectType.TargetPhaseElement);
            break;
        }
        case EffectType.PreviewSwimlane: {
            SwimlanePreview.removeAll(paper, EffectType.PreviewSwimlane);
            break;
        }
        case EffectType.PreviewPhase: {
            PhasePreview.removeAll(paper, EffectType.PreviewPhase);
            break;
        }
        case EffectType.InvalidDrop: {
            highlighters.addClass.removeAll(paper, EffectType.InvalidDrop);
            break;
        }
    }
}
