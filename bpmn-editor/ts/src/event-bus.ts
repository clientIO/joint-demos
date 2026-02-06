import { mvc } from '@joint/plus';

export const eventBus = Object.assign({}, mvc.Events);

export enum EventBusEvents {
    GRAPH_REPLACE_CELL = 'graph-change-cell',
}
