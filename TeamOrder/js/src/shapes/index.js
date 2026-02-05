export * from './member';
export * from './link';

import { shapes } from '@joint/plus';
import { Member } from './member';
import { Link } from './link';

Object.assign(shapes, {
    teamOrder: {
        Member,
        Link
    }
});
