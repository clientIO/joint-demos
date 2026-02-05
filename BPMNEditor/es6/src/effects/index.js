import { dia, highlighters } from '@joint/plus';
import { ShadowEffect } from './shadow-effect';
import { SwimlanePreview } from './swimlane-preview';
import { ERROR_COLOR, MAIN_COLOR } from '../configs/theme';

export const EffectType = {
    Shadow: 'shadow',
    SourceSwimlane: 'source-swimlane',
    TargetPool: 'target-pool',
    PreviewSwimlane: 'preview-swimlane',
    Error: 'error',
    ActivityBoundaryEmbed: 'activity-boundary-embed',
    TargetSwimlaneEmbed: 'target-swimlane-embed',
    MarkUnavailable: 'mark-unavailable',
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
                className: 'highlighter-swimlane-source',
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
        case EffectType.PreviewSwimlane: {
            SwimlanePreview.add(cellView, 'root', EffectType.PreviewSwimlane, {
                index: options === null || options === void 0 ? void 0 : options.index,
                layer: dia.Paper.Layers.FRONT,
            });
            break;
        }
        case EffectType.Error: {
            highlighters.addClass.add(cellView, 'root', EffectType.Error, {
                className: 'highlighter-error',
            });
            break;
        }
        case EffectType.ActivityBoundaryEmbed: {
            highlighters.mask.add(cellView, 'background', EffectType.ActivityBoundaryEmbed, {
                padding: 0,
                attrs: {
                    stroke: MAIN_COLOR,
                    strokeWidth: 3
                }
            });
            break;
        }
        case EffectType.TargetSwimlaneEmbed: {
            highlighters.addClass.add(cellView, 'root', EffectType.TargetSwimlaneEmbed, {
                className: 'highlighter-swimlane-target'
            });
            break;
        }
        case EffectType.MarkUnavailable: {
            const selector = cell.attr(['root', 'highlighterSelector']);
            
            if (options === null || options === void 0 ? void 0 : options.applyAll) {
                highlighters.mask.add(cellView, selector, `${EffectType.MarkUnavailable}-mask`, {
                    padding: 0,
                    attrs: {
                        stroke: ERROR_COLOR,
                        strokeWidth: 2
                    }
                });
            }
            
            highlighters.addClass.add(cellView, 'root', EffectType.MarkUnavailable, {
                className: 'highlighter-invalid'
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
        case EffectType.TargetPool: {
            highlighters.mask.removeAll(paper, EffectType.TargetPool);
            break;
        }
        case EffectType.PreviewSwimlane: {
            SwimlanePreview.removeAll(paper, EffectType.PreviewSwimlane);
            break;
        }
        case EffectType.Error: {
            highlighters.addClass.removeAll(paper, EffectType.Error);
            break;
        }
        case EffectType.ActivityBoundaryEmbed: {
            highlighters.mask.removeAll(paper, EffectType.ActivityBoundaryEmbed);
            break;
        }
        case EffectType.TargetSwimlaneEmbed: {
            highlighters.addClass.removeAll(paper, EffectType.TargetSwimlaneEmbed);
            break;
        }
        case EffectType.MarkUnavailable: {
            highlighters.mask.removeAll(paper, `${EffectType.MarkUnavailable}-mask`);
            highlighters.addClass.removeAll(paper, EffectType.MarkUnavailable);
            break;
        }
    }
}
