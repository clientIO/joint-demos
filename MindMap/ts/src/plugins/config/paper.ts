import { dia } from '@joint/plus';
import anchor from '../../shapes/anchor';
import connector from '../../shapes/connector';
import { BACKGROUND_COLOR } from '../../theme';

export default {
    interactive: false,
    frozen: false,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: {
        color: BACKGROUND_COLOR
    },
    defaultConnectionPoint: {
        name: 'anchor',
    },
    clickThreshold: 20,
    defaultAnchor: anchor,
    defaultConnector: connector,
} as Partial<dia.Paper.Options>;
