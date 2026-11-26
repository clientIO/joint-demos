import type { CellKey, PlantCell, PlantEvent, PlantMessage } from '../plant/plant';
import { tagOf } from '../plant/plant';

/*
 * The log of the messages between the diagram and the plant (in run mode): the updates the plant sends and the
 * commands of the operator - the tag of a cell, a property, its value. The newest first, the last 200 of a run;
 * filtered by the words typed (dashes and case ignored: `p101` finds `P-101`) and by the direction.
 */

/** The messages kept (the newest ones). */
export const MAX_MESSAGES = 200;

/** A message logged: of an event of the plant. */
export interface LogEntry extends PlantMessage {
    /** Unique in the run: the key of its row. */
    readonly id: number;
    readonly kind: PlantEvent;
}

/** The direction of the messages shown: all of them, the updates or the commands. */
export type DirectionFilter = 'all' | PlantEvent;

export const DIRECTION_FILTERS: ReadonlyArray<readonly [DirectionFilter, string]> = [['all', 'All'], ['update', 'Updates'], ['command', 'Commands']];

/** From the plant (down to the diagram), to it (up). */
export const KIND_ARROWS: Readonly<Record<PlantEvent, string>> = { update: '↓', command: '↑' };

/** The message logged at the top, the oldest one dropped past the limit. */
export function withEntry(entries: readonly LogEntry[], entry: LogEntry): readonly LogEntry[] {
    return [entry, ...entries.slice(0, MAX_MESSAGES - 1)];
}

/** A text as it is searched: no case, no dashes. */
export function normalizeSearch(text: string): string {
    return text.toLowerCase().replaceAll('-', '');
}

/** The words of the filter, as they are searched. */
export function filterWordsOf(filter: string): string[] {
    return normalizeSearch(filter).split(/\s+/).filter(Boolean);
}

/** Of the direction, with any of the words (the tags of several elements clicked). */
export function matchesEntry(entry: LogEntry, direction: DirectionFilter, words: readonly string[]): boolean {
    if (direction !== 'all' && entry.kind !== direction) {
        return false;
    }
    const text = normalizeSearch(`${entry.tag} ${entry.property}`);
    return words.length === 0 || words.some((word) => text.includes(word));
}

/** The tag in the text filter, or out of it if it is there (an element clicked on the diagram). */
export function toggleFilterTag(filter: string, tag: string): string {
    const words = filter.split(/\s+/).filter(Boolean);
    const index = words.findIndex((word) => normalizeSearch(word) === normalizeSearch(tag));
    if (index === -1) {
        words.push(tag);
    } else {
        words.splice(index, 1);
    }
    return words.join(' ');
}

/**
 * The cells the filter by words keeps as they are: of the tags of the messages shown, and those whose tags start
 * with a word of the filter (`p101`: P-101, not GRP-101; a cell clicked before its first message). Empty when
 * not filtered by words: nothing dimmed by it.
 */
export function keptCellsOf(cells: readonly PlantCell[], shown: readonly LogEntry[], words: readonly string[]): ReadonlySet<CellKey> {
    const kept = new Set<CellKey>();
    if (words.length === 0) {
        return kept;
    }
    const shownTags = new Set(shown.map(({ tag }) => tag));
    for (const cell of cells) {
        const tag = tagOf(cell.data);
        if (tag && (shownTags.has(tag) || words.some((word) => normalizeSearch(tag).startsWith(word)))) {
            kept.add(cell.id);
        }
    }
    return kept;
}

/** The cells dimmed: the ones the filter leaves out (if it keeps any), the ones without an ID if asked. */
export function dimmedCellsOf(cells: readonly PlantCell[], kept: ReadonlySet<CellKey>, grayUntagged: boolean): ReadonlySet<CellKey> {
    return new Set(cells
        .filter((cell) => (kept.size > 0 && !kept.has(cell.id)) || (grayUntagged && !tagOf(cell.data)))
        .map((cell) => cell.id));
}

const MILLISECOND_DIGITS = 3;

/** The time of a message: `14:03:27.042`. */
export function formatLogTime(time: Date): string {
    return `${time.toLocaleTimeString([], { hour12: false })}.${String(time.getMilliseconds()).padStart(MILLISECOND_DIGITS, '0')}`;
}
