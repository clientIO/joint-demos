import type { dia } from '@joint/core';
import { shapes, util } from '@joint/core';
import type { ITimelineShape } from './index';

export class Milestone extends shapes.standard.Rectangle implements ITimelineShape {

    defaults(): Partial<shapes.standard.RectangleAttributes> {
        return util.defaultsDeep({
            type: 'timeline.Milestone',
            size: { width: 72, height: 38 },
            attrs: {
                body: {
                    rx: 18,
                    ry: 18,
                    stroke: null,
                    fill: '#30608F',
                    cursor: 'pointer'
                },
                label: {
                    fill: '#FFFFFF',
                    fontFamily: 'Nunito Sans',
                    fontWeight: 'bold',
                    fontSize: 19,
                    pointerEvents: 'none'
                }
            }
        }, super.defaults);
    }

    isConnectionValid(type: string): boolean {
        return type === 'timeline.Category';
    }

    getEditableFields(): { property: string, inputType: 'text' | 'textarea', attrPath: string }[] {
        return [];
    }

    static create(id: dia.Cell.ID): Milestone {
        return new Milestone({
            id: id,
            attrs: {
                label: {
                    text: String(id)
                }
            }
        });
    }
}
