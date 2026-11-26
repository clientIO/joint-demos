import type { ShapeData } from '../types';

/*
 * The layout of a table: its title (with a header), the names of the columns (if shown), its rows - each on the grid
 * (a step of resizing its bottom is a row); its width shared by the columns.
 */

/** The heights of the title, of the names of the columns, of a row. */
export const TITLE_HEIGHT = 40;
export const HEAD_HEIGHT = 20;
export const ROW_HEIGHT = 20;
// How narrow a column of an auto width can get; how wide a column of states is (unless set)
const MIN_COLUMN_WIDTH = 50;
const STATE_COLUMN_WIDTH = 32;

/** What a column shows: texts (from the left), numbers (to the right), states (a dot in the color of the state). */
export type ColumnKind = 'text' | 'number' | 'state';

/** A column of a table: its name, the kind of its values, its width (none or 0: auto, a share of the rest). */
export interface Column {
    readonly name: string;
    readonly kind?: ColumnKind;
    readonly width?: number;
}

/** The default columns: the names and the values of the rows. */
export const TABLE_COLUMNS: readonly Column[] = [
    { name: 'Name', kind: 'text' },
    { name: 'Value', kind: 'number' },
];

/** The columns of a list of the states: a state, its value, the unit. */
export const STATE_LIST_COLUMNS: readonly Column[] = [
    { name: 'State', kind: 'state' },
    { name: 'Value', kind: 'number' },
    { name: 'Unit', kind: 'text' },
];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isColumnKind = (value: unknown): value is ColumnKind => value === 'text' || value === 'number' || value === 'state';

/** The columns of the table's data; none - no columns. */
export function columnsOf(data: ShapeData): readonly Column[] {
    if (!Array.isArray(data.columns)) {
        return [];
    }
    return data.columns.filter(isRecord).map((column) => ({
        name: typeof column.name === 'string' ? column.name : '',
        kind: isColumnKind(column.kind) ? column.kind : 'text',
        width: typeof column.width === 'number' ? column.width : undefined,
    }));
}

/** The height of the title and the names of the columns (those the table shows). */
export function headHeightOf(data: ShapeData): number {
    return (data.header ? TITLE_HEIGHT : 0) + (data.names ? HEAD_HEIGHT : 0);
}

/** As many rows as the height takes, one at least. */
export function rowCountOf(data: ShapeData, height: number): number {
    return Math.max(1, Math.round((height - headHeightOf(data)) / ROW_HEIGHT));
}

/** The width of a column that is not auto: its own, or of a column of states. */
function fixedWidth({ kind, width }: Column): number | null {
    if (width && width > 0) {
        return width;
    }
    return kind === 'state' ? STATE_COLUMN_WIDTH : null;
}

/** Where the columns start and how wide they are: the fixed ones as wide as they are, the auto ones sharing the rest. */
export function columnLayout(columns: readonly Column[], width: number): { readonly starts: number[]; readonly widths: number[] } {
    const fixed = columns.map(fixedWidth);
    const autos = fixed.filter((columnWidth) => columnWidth === null).length;
    const rest = width - fixed.reduce<number>((sum, columnWidth) => sum + (columnWidth ?? 0), 0);
    const widths = fixed.map((columnWidth) => columnWidth ?? rest / autos);
    // With no auto column, the last one takes the rest
    if (autos === 0 && widths.length > 0) {
        widths[widths.length - 1] += rest;
    }
    const starts = widths.map((_, column) => widths.slice(0, column).reduce((sum, columnWidth) => sum + columnWidth, 0));
    return { starts, widths };
}

/** How narrow a table of the columns can get: the fixed ones, some room for each auto one. */
export function minTableWidth(columns: readonly Column[]): number {
    return columns.reduce((sum, column) => sum + (fixedWidth(column) ?? MIN_COLUMN_WIDTH), 0);
}

/** The value of a cell as a text: of a state column `on`, `off` or `alarm`. */
export function cellValue(values: readonly unknown[] | undefined, row: number, column: number): string {
    const cells = values?.[row];
    const value = Array.isArray(cells) ? cells[column] : undefined;
    return value === undefined || value === null ? '' : String(value);
}
