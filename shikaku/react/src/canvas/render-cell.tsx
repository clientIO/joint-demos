/**
 * How the board draws.
 *
 * Plain SVG rather than an `HTMLHost`: a 25x25 board is 625 squares plus a card
 * per rectangle, and neither is more than a rounded rectangle with a number in
 * it — there is no layout here worth a `foreignObject` and a `ResizeObserver`
 * per element.
 *
 * Every color comes from a CSS custom property, applied through `style` rather
 * than as an attribute — `fill` and `stroke` are CSS properties on SVG, so
 * `var()` resolves in them, while a presentation attribute would not. That is
 * what lets the light and dark palettes live entirely in `index.css`: switching
 * themes restyles the board without React rendering anything or a single
 * element being rewritten.
 */
import { SVGText } from '@joint/react-plus';
import type { CellData, RegionData, SquareData } from './cells';
import { CELL, REGION_RADIUS, SQUARE_RADIUS } from './grid';

/** Fill opacity while a rectangle is still under the cursor. */
const PENDING_OPACITY = 0.45;

/** Outline pattern for a drag that cannot be placed. */
const REJECT_DASH = '7 5';

const OUTLINE_WIDTH = 2;

function ClueText({ x, y, value }: { x: number; y: number; value: number }) {
    return (
        <SVGText
            x={x}
            y={y}
            textAnchor="middle"
            textVerticalAnchor="middle"
            fontSize={18}
            fontWeight={600}
            fontFamily="inherit"
            style={{ fill: 'var(--clue-color)' }}
        >
            {String(value)}
        </SVGText>
    );
}

function Square({ clue }: SquareData) {
    return (
        <>
            <rect
                width={CELL}
                height={CELL}
                rx={SQUARE_RADIUS}
                ry={SQUARE_RADIUS}
                strokeWidth={1}
                style={{ fill: 'var(--square-fill)', stroke: 'var(--square-stroke)' }}
            />
            {clue !== null && <ClueText x={CELL / 2} y={CELL / 2} value={clue} />}
        </>
    );
}

/**
 * One rectangle.
 *
 * A placed rectangle is opaque and carries its own number, so it hides the
 * squares it covers outright — which is what makes it read as one shape rather
 * than as the squares it was drawn over.
 *
 * A pending one is translucent instead, and draws nothing of its own: the
 * numbers under it are the ones the player is still reading, and they have to
 * stay legible while the rectangle is being sized. How many squares it covers
 * belongs to the readout above the board — a label inside the shape is one more
 * thing to read in exactly the place the shape is already saying something.
 */
function Region({ color, pending, rejected, width, height, clue }: RegionData) {
    const fill = rejected ? 'var(--reject-fill)' : `var(--region-fill-${color})`;
    const stroke = rejected ? 'var(--reject-stroke)' : `var(--region-stroke-${color})`;

    return (
        <>
            <rect
                width={width}
                height={height}
                rx={REGION_RADIUS}
                ry={REGION_RADIUS}
                fillOpacity={pending ? PENDING_OPACITY : 1}
                strokeWidth={OUTLINE_WIDTH}
                strokeDasharray={rejected ? REJECT_DASH : undefined}
                style={{ fill, stroke }}
            />
            {clue && <ClueText x={clue.x} y={clue.y} value={clue.value} />}
        </>
    );
}

export function RenderCell(data: CellData) {
    return data.kind === 'square' ? <Square {...data} /> : <Region {...data} />;
}
