import { describe, expect, it } from 'vitest';
import { busbarMinWidth } from '../shapes/electrical/electrical';
import { memberCountOf } from './group-levels';
import { connectedPortsOf } from './selectors';

const cells = [
    { id: 'g', type: 'element', data: { kind: 'Group' } },
    { id: 'a', type: 'element', parent: 'g', data: { kind: 'Pump' } },
    { id: 'b', type: 'element', parent: 'g', data: { kind: 'Pump' } },
    { id: 'l', type: 'link', parent: 'g', source: { id: 'a', port: 'out' }, target: { id: 'bus', port: 'top4' }, data: { kind: 'Pipe' } },
    { id: 'm', type: 'link', source: { id: 'bus', port: 'bottom2' }, target: { x: 0, y: 0 }, data: { kind: 'Wire' } },
];

describe('the editor', () => {
    it('counts the elements of a group, not its links', () => {
        expect(memberCountOf(cells, 'g')).toBe(2);
        expect(memberCountOf(cells, 'a')).toBe(0);
    });

    it('lists the ports links are connected to', () => {
        expect(connectedPortsOf(cells, 'bus')).toBe('bottom2 top4');
        expect(connectedPortsOf(cells, 'a')).toBe('out');
        expect(connectedPortsOf(cells, 'none')).toBe('');
    });

    it('keeps a busbar long enough for its last connected tap', () => {
        expect(busbarMinWidth([])).toBe(120);
        expect(busbarMinWidth(['left', 'right', 'top1'])).toBe(120);
        expect(busbarMinWidth(['top4', 'bottom19'])).toBe(1520);
    });
});
