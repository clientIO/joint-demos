import { type dia, shapes } from '@joint/core';
import { Event } from './Event';
import { Milestone } from './Milestone';
import { Category } from './Category';
import { StencilPlaceholder } from './StencilPlaceholder';

export { Event, Milestone, Category, StencilPlaceholder };

export interface ITimelineShape extends dia.Element {
    isConnectionValid: (type: string) => boolean;
    getEditableFields: () => { property: string, inputType: 'text' | 'textarea', attrPath: string }[];
}

Object.assign(shapes, {
    timeline: {
        Event,
        Milestone,
        Category,
        StencilPlaceholder
    }
});

declare module '@joint/core' {
    namespace shapes {
        namespace timeline {
            export {
                Event,
                Milestone,
                Category,
                StencilPlaceholder
            };
        }
    }
}
