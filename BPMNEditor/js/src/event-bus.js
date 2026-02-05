import { mvc } from '@joint/plus';

export const eventBus = Object.assign({}, mvc.Events);

export var EventBusEvents;
(function (EventBusEvents) {
    EventBusEvents["GRAPH_REPLACE_CELL"] = "graph-change-cell";
})(EventBusEvents || (EventBusEvents = {}));
