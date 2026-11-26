import type { SVGProps } from 'react';
import { LABEL_COLOR } from '../instruments/values';
import { wrapText } from '../instruments/wrap-text';
import { outlineWidthPx } from '../style';
import type { SymbolProps } from '../types';
import { cellValue, columnLayout, columnsOf, HEAD_HEIGHT, ROW_HEIGHT, rowCountOf, TITLE_HEIGHT, type Column } from './table-layout';
import './charts.css';

const FONT_FAMILY = 'sans-serif';
const FONT_SIZE = 13;
const TITLE_SIZE = 15;
// The space between the text of a cell and its sides
const CELL_PADDING = 8;
// A text centered on its line
const CENTERED = '0.35em';
const PLACEHOLDER = '–';
// The widths of the lines of the grid and of the border (none of its own outline width)
const GRID_WIDTH = 1;
const BORDER_WIDTH = 1.5;
// A state: a dot in its color (an unknown one: an empty circle)
const STATE_RADIUS = 6;
const LINE_COLOR = 'var(--shape-table-line)';
const STATE_COLORS: Readonly<Record<string, string>> = { on: 'var(--color-green)', off: LINE_COLOR, alarm: 'var(--color-red)' };

/** A text on one line of the width, cut with an ellipsis. */
function fitted(text: string, width: number, fontSize: number): string {
    return wrapText(text, { width, height: fontSize }, { size: fontSize, family: FONT_FAMILY, weight: 'bold' })[0] ?? '';
}

interface CellProps {
    readonly column: Column;
    readonly start: number;
    readonly width: number;
    readonly y: number;
    readonly value: string;
}

/** A state of a cell: its dot, or an empty circle when unknown. */
function StateDot({ cx, cy, value, className }: { readonly cx: number; readonly cy: number; readonly value: string; readonly className: string }) {
    const color = STATE_COLORS[value];
    return <circle className={className} cx={cx} cy={cy} r={STATE_RADIUS} strokeWidth={1} pointerEvents="none" fill={color ?? 'none'} stroke={color ? 'none' : LINE_COLOR} />;
}

/**
 * A cell by the kind of its column: a text from the left, a number to the right, a state a dot in the middle. Its value
 * is the plant's to send: shown in run mode, a placeholder while the diagram is edited (see `charts.css`).
 */
function TableCell({ column, start, width, y, value }: CellProps) {
    if (column.kind === 'state') {
        const cx = start + width / 2;
        return (
            <>
                <StateDot className="scada-table-idle" cx={cx} cy={y} value="" />
                <StateDot className="scada-table-live" cx={cx} cy={y} value={value} />
            </>
        );
    }
    const isNumber = column.kind === 'number';
    const text: SVGProps<SVGTextElement> = { x: isNumber ? start + width - CELL_PADDING : start + CELL_PADDING, y, dy: CENTERED, textAnchor: isNumber ? 'end' : 'start', fontFamily: FONT_FAMILY, fontSize: FONT_SIZE, fill: LABEL_COLOR, pointerEvents: 'none' };
    return (
        <>
            <text className="scada-table-idle" {...text}>
                {PLACEHOLDER}
            </text>
            <text className="scada-table-live" {...text}>
                {value || PLACEHOLDER}
            </text>
        </>
    );
}

/**
 * A table: a title above it with a header, the names of the columns if shown, the values of its rows (as many as its
 * height takes); its color the fill, its outline the border and the grid, its accent the head of the names.
 */
export function TableDrawing({ width, height, data, surface }: SymbolProps) {
    const columns = columnsOf(data);
    const hasHeader = Boolean(data.header);
    const hasNames = Boolean(data.names);
    const rows = rowCountOf(data, height);
    const top = hasHeader ? TITLE_HEIGHT : 0;
    const bodyTop = top + (hasNames ? HEAD_HEIGHT : 0);
    const { starts, widths } = columnLayout(columns, width);
    // The lines under the title and the names, between the rows, between the columns
    const rowLines = Array.from({ length: Math.max(rows - 1, 0) }, (_, row) => bodyTop + (row + 1) * ROW_HEIGHT);
    const ys = new Set([...(hasHeader ? [top] : []), ...(hasNames ? [bodyTop] : []), ...rowLines]);
    const grid = [...[...ys].filter((y) => y > 0 && y < height).map((y) => `M 0 ${y} H ${width}`), ...starts.slice(1).map((x) => `M ${x} ${top} V ${height}`)].join(' ');
    const stroke = surface.styled('outline', LINE_COLOR);
    // Its own outline width only: the diagram's would thicken every table
    const ownWidth = data.style?.outlineWidth ? outlineWidthPx(data.style.outlineWidth) : undefined;
    const values = data.plant?.values;
    return (
        <>
            <rect width={width} height={height} rx={4} ry={4} fill={surface.styled('color', 'var(--shape-face)')} />
            {hasNames && <rect y={top} width={width} height={HEAD_HEIGHT} fill={surface.styled('accent', 'var(--shape-table-header)')} />}
            <path d={grid} fill="none" stroke={stroke} strokeWidth={ownWidth ?? GRID_WIDTH} />
            {/* The border over the head and the grid */}
            <rect width={width} height={height} rx={4} ry={4} fill="none" stroke={stroke} strokeWidth={ownWidth ?? BORDER_WIDTH} />
            {hasHeader && (
                <text x={width / 2} y={TITLE_HEIGHT / 2} dy={CENTERED} textAnchor="middle" fontFamily={FONT_FAMILY} fontSize={TITLE_SIZE} fontWeight="bold" fill={LABEL_COLOR} pointerEvents="none">
                    {fitted(String(data.title ?? ''), width - 2 * CELL_PADDING, TITLE_SIZE)}
                </text>
            )}
            {hasNames &&
                columns.map((column, index) => (
                    <text
                        key={index}
                        x={starts[index] + widths[index] / 2}
                        y={top + HEAD_HEIGHT / 2}
                        dy={CENTERED}
                        textAnchor="middle"
                        fontFamily={FONT_FAMILY}
                        fontSize={FONT_SIZE}
                        fontWeight="bold"
                        fill={LABEL_COLOR}
                        pointerEvents="none"
                    >
                        {fitted(column.name, widths[index] - 2 * CELL_PADDING, FONT_SIZE)}
                    </text>
                ))}
            {Array.from({ length: rows }, (_, row) =>
                columns.map((column, index) => (
                    <TableCell key={`${row}-${index}`} column={column} start={starts[index]} width={widths[index]} y={bodyTop + (row + 0.5) * ROW_HEIGHT} value={cellValue(values, row, index)} />
                )),
            )}
        </>
    );
}
