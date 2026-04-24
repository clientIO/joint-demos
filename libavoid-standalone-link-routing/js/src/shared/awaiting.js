import { highlighters } from '@joint/core';

export function markAwaiting(linkView) {
    highlighters.addClass.add(linkView, 'line', 'awaiting-update', {
        className: 'awaiting-update'
    });
}

export function unmarkAwaiting(linkView) {
    highlighters.addClass.remove(linkView, 'awaiting-update');
}
