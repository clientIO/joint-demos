import { shapes } from '@joint/plus';
import { activity } from './activity/activity-shapes';
import { annotation } from './annotation/annotation-shapes';
import { data } from './data/data-shapes';
import { event } from './event/event-shapes';
import { flow } from './flow/flow-shapes';
import { gateway } from './gateway/gateway-shapes';
import { group } from './group/group-shapes';
import { pool } from './pool/pool-shapes';

export const cellNamespace = {
    ...shapes,
    activity,
    annotation,
    data,
    event,
    flow,
    gateway,
    group,
    pool
};
