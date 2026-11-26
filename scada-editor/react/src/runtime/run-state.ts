import type { CellKey, Plant } from '../plant/plant';
import type { DirectionFilter, LogEntry } from './log-model';
import { createStore } from './store';

/*
 * What the parts of run mode share (mounted in different places: the plant and the controls on the paper, the
 * log in a panel of the app): the plant of the run, the log of its messages and how it is shown, the cells the
 * log dims.
 */

/** The plant of the run (`null` while editing). */
export const plantStore = createStore<Plant | null>(null);

/** The messages of the run, the newest first. */
export const logEntriesStore = createStore<readonly LogEntry[]>([]);

/** How the log is shown: kept from an opening to the next one, and from a run to the next one. */
export interface LogOptions {
    readonly filter: string;
    readonly direction: DirectionFilter;
    /** The elements pinged when a message of them comes. */
    readonly pings: boolean;
    /** The cells without an ID grayed while the log is open (a click does not filter by them). */
    readonly grayUntagged: boolean;
}

export const logOptionsStore = createStore<LogOptions>({ filter: '', direction: 'all', pings: false, grayUntagged: false });

/** The tag of the messages marked (its cell marked on the diagram), none. */
export const markedTagStore = createStore<string | null>(null);

/** The cells dimmed by the log (their controls dimmed too). */
export const dimmedCellsStore = createStore<ReadonlySet<CellKey>>(new Set());
