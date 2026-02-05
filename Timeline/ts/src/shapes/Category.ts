import type { dia } from '@joint/core';
import { shapes, util } from '@joint/core';
import { TOP_COLOR, BOTTOM_COLOR, TOP_TEXT_COLOR, BOTTOM_TEXT_COLOR } from '../config';
import { measureTextSize } from '../utils';
import type { ITimelineShape } from './index';

const HORIZONTAL_PADDING = 20;
const MIN_WIDTH = 80;
const MAX_WIDTH = 240;

export class Category extends shapes.standard.Rectangle implements ITimelineShape {

    defaults(): Partial<shapes.standard.RectangleAttributes> {
        return util.defaultsDeep({
            type: 'timeline.Category',
            size: { width: 1, height: 1 },
            attrs: {
                body: {
                    stroke: null,
                    fill: TOP_COLOR,
                    rx: 16,
                    ry: 16,
                    cursor: 'grab'
                },
                label: {
                    fill: TOP_TEXT_COLOR,
                    fontFamily: 'Nunito Sans',
                    fontWeight: 'bold',
                    fontSize: 17,
                    textWrap: {
                        width: -HORIZONTAL_PADDING,
                        height: 'calc(h - 10)',
                        ellipsis: true
                    },
                    cursor: 'text',
                    event: 'edit',
                }
            }
        }, super.defaults);
    }

    preinitialize(attributes?: shapes.standard.RectangleAttributes, options?: any): void {
        super.preinitialize(attributes, options);

        this.on('change:direction', (el, direction: 'T' | 'B') => {
            const isTop = direction === 'T';
            const bodyColor = isTop ? TOP_COLOR : BOTTOM_COLOR;
            const labelColor = isTop ? TOP_TEXT_COLOR : BOTTOM_TEXT_COLOR;

            el.attr({
                root: {
                    'data-direction': direction
                },
                body: {
                    fill: bodyColor
                },
                label: {
                    fill: labelColor
                }
            });
        });
    }

    isConnectionValid(type: string): boolean {
        return type === 'timeline.Event';
    }

    getEditableFields(): { property: string, inputType: 'text' | 'textarea', attrPath: string }[] {
        return [{ property: 'label', inputType: 'text', attrPath: 'label/text' }];
    }

    updateSize() {
        const text = this.attr('label/text') || '';
        const { fontSize, fontFamily } = this.attr('label') as any;
        const padding = HORIZONTAL_PADDING;

        const { width } = measureTextSize(text, fontSize, fontFamily);
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width + (padding * 2)));

        this.resize(newWidth, 48);
    }

    static create(id: dia.Cell.ID, label: string, direction: 'T' | 'B'): Category {

        const fill = direction === 'T' ? TOP_COLOR : BOTTOM_COLOR;

        const category = new Category({
            id: id,
            direction,
            attrs: {
                root: {
                    'data-direction': direction
                },
                label: {
                    text: label
                },
                body: {
                    fill
                }
            }
        });

        category.updateSize();

        return category;
    }
}
