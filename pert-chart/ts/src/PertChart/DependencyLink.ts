
import { shapes, util } from '@joint/plus';
import { DEPENDENCY_COLOR } from './theme';

// A link representing a dependency between two tasks.
export class DependencyLink extends shapes.standard.Link {

    defaults(): any {
        return {
            ...super.defaults,
            type: 'dependency',
            z: 1,
            attrs: util.defaultsDeep({
                line: {
                    stroke: DEPENDENCY_COLOR,
                    strokeWidth: 2,
                    targetMarker: {
                        type: 'path',
                        d: 'M 10 -5 -2 0 10 5'
                    },
                },
                // @ts-expect-error
            }, super.defaults.attrs)
        };
    }
}
