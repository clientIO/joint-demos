// The architecture block symbol: a chamfered subsystem tile. Its typed
// interface PORTS (stub, label, colored tick, magnet) are native JointJS
// ports derived with the cell (symbols/port-markup). The chamfer (top-left + bottom-right) is the JointJS diagonal,
// the same joinery the app chrome uses.

import { SVGText } from '@joint/react-plus';
import type { Subsystem } from '@/model/design';

const CHAMFER = 12;

export interface ArchBlockProps {
  readonly subsystem: Subsystem;
  /** Display name of the subsystem's board (boards are user-editable data). */
  readonly boardName: string;
}

export function ArchBlock({ subsystem, boardName }: ArchBlockProps) {
    const { width, height } = subsystem.size;
    return (
    // The drawing is presentational — the CELL's aria-label carries the name,
    // so none of the SVG text should leak into the accessibility tree.
        <g aria-hidden>
            <polygon
                className="esd-block"
                points={`${CHAMFER},0 ${width},0 ${width},${height - CHAMFER} ${width - CHAMFER},${height} 0,${height} 0,${CHAMFER}`}
            />
            {/* Names are user-edited free text — <SVGText textWrap> bounds them to
          the block width (breakText + ellipsis) instead of letting a long
          rename overflow the fixed geometry. */}
            <SVGText
                className="esd-block-name"
                x={width / 2}
                y={height / 2 + 1}
                textAnchor="middle"
                width={width - 20}
                textWrap={{ ellipsis: true, maxLineCount: 1 }}
            >
                {subsystem.name}
            </SVGText>
            <SVGText
                className="esd-board-tag"
                x={width / 2}
                y={height / 2 + 18}
                textAnchor="middle"
                width={width - 20}
                textWrap={{ ellipsis: true, maxLineCount: 1 }}
            >
                {boardName}
            </SVGText>
        </g>
    );
}
