import { describe, expect, it } from 'vitest';
import { element, link } from '../plant/plant-test-diagram';
import { flowWrites } from './flows';
import { dimmedCellsOf, filterWordsOf, keptCellsOf, MAX_MESSAGES, matchesEntry, toggleFilterTag, withEntry, type LogEntry } from './log-model';

const entry = (id: number, kind: LogEntry['kind'], tag: string, property = 'value'): LogEntry => ({ id, kind, tag, property, value: 1, time: new Date(0) });

describe('flows', () => {
    it('flows a pipe unless a stopped pump or a closed valve is at one of its ends', () => {
        const cells = [
            element('P-1', 'Pump', { power: 0 }),
            element('T-1', 'LiquidTank', { level: 50 }),
            element('V-1', 'HandValve', { open: true }),
            element('B-1', 'Beacon', { power: 0 }),
            link('a', 'Pipe', 'P-1', 'T-1'),
            link('b', 'Pipe', 'T-1', 'V-1'),
            link('c', 'Pipe', 'B-1', 'T-1'),
            link('d', 'Pipe', 'T-1', 'other-link'),
        ];
        expect(flowWrites(cells).map(({ id, data }) => [id, data.flowing])).toEqual([['b', true], ['c', true], ['d', true]]);
    });

    it('makes a wire live while it is energized; writes only what changed', () => {
        const cells = [link('w', 'Wire', 'a', 'b', { energized: true }), link('x', 'Wire', 'a', 'b', { flowing: true }), link('s', 'SignalLine', 'a', 'b')];
        expect(flowWrites(cells).map(({ id, data }) => [id, data.flowing])).toEqual([['w', true], ['x', undefined]]);
    });
});

describe('log', () => {
    it('keeps the last messages, the newest first', () => {
        let entries: readonly LogEntry[] = [];
        for (let id = 0; id < MAX_MESSAGES + 5; id++) {
            entries = withEntry(entries, entry(id, 'update', 'P-101'));
        }
        expect(entries).toHaveLength(MAX_MESSAGES);
        expect(entries[0].id).toBe(MAX_MESSAGES + 4);
    });

    it('filters by words without case and dashes, and by the direction', () => {
        const update = entry(1, 'update', 'P-101', 'power');
        const command = entry(2, 'command', 'HV-101', 'open');
        expect(matchesEntry(update, 'all', filterWordsOf('p101'))).toBe(true);
        expect(matchesEntry(update, 'all', filterWordsOf('POWER'))).toBe(true);
        expect(matchesEntry(update, 'all', filterWordsOf('hv101 p101'))).toBe(true);
        expect(matchesEntry(update, 'command', [])).toBe(false);
        expect(matchesEntry(command, 'command', [])).toBe(true);
        expect(matchesEntry(command, 'all', filterWordsOf('level'))).toBe(false);
    });

    it('toggles the tag of a clicked element in the filter', () => {
        expect(toggleFilterTag('', 'P-101')).toBe('P-101');
        expect(toggleFilterTag('HV-101 P-101', 'P-101')).toBe('HV-101');
        expect(toggleFilterTag('p101', 'P-101')).toBe('');
    });

    it('grays the cells the filter leaves out and, if asked, the cells without an ID', () => {
        const cells = [element('P-101', 'Pump'), element('GRP-101', 'Group'), element('FM-101', 'FlowMeter'), { ...element('x', 'Label'), data: { kind: 'Label' } }];
        const words = filterWordsOf('p101');
        const kept = keptCellsOf(cells, [entry(1, 'update', 'FM-101')], words);
        expect([...kept].sort()).toEqual(['FM-101', 'P-101']);
        expect([...dimmedCellsOf(cells, kept, false)].sort()).toEqual(['GRP-101', 'x']);
        expect([...dimmedCellsOf(cells, new Set(), true)]).toEqual(['x']);
        expect(keptCellsOf(cells, [], []).size).toBe(0);
    });
});
