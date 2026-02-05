import type { dia } from '@joint/plus';
import { connectors } from '@joint/plus';
import { TREE_PARENT_GAP } from '../theme';

const connector: connectors.Connector = function(
    this: dia.LinkView,
    sourcePoint: dia.Point,
    targetPoint: dia.Point,
    route: dia.Point[]
) {
    const layout = this.model.getTargetCell().get('layout');
    const signX = (layout === 'L') ? -1 : 1;
    const args = {
        sourceTangent: { x: signX * TREE_PARENT_GAP, y: 0 },
        targetTangent: { x: signX * -TREE_PARENT_GAP, y: 0 },
    };
    return connectors.curve.call(this, sourcePoint, targetPoint, route, args, this);
};

export default connector;
