// A point along a routed SVG path — where a wire's net label goes.
//
// A <textPath> would follow the path's DIRECTION, rendering upside-down on
// right-to-left runs; a plain horizontally-set label at the anchor point is
// always readable. The library's `linkLabels` preset was considered and
// rejected for the same family of reasons: these labels must live INSIDE the
// renderLink group so they inherit its `data-iface` / `data-dimmed` theming
// and can append the live-mode voltage text — native labels render outside
// the React portal and none of that cascades. The router emits line commands
// plus small jump-over arcs and rounded corners; treating every command as a
// straight chord to its endpoint is accurate to a pixel or two at label scale.

export interface PathMidpoint {
  readonly x: number;
  readonly y: number;
  /** True when the segment under the midpoint runs vertically — the label
   * offsets sideways instead of upward so it doesn't sit on the wire. */
  readonly vertical: boolean;
}

const COMMANDS = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;

export function pathMidpoint(d: string, at = 0.5): PathMidpoint | null {
    const points: { x: number; y: number }[] = [];
    let x = 0;
    let y = 0;

    for (const match of d.matchAll(COMMANDS)) {
        const command = match[1] ?? '';
        const upper = command.toUpperCase();
        const relative = command !== upper;
        const numbers = (match[2] ?? '')
            .trim()
            .split(/[\s,]+/)
            .filter((token) => token !== '')
            .map(Number);
        if (numbers.some(Number.isNaN)) return null;

        // Consume the argument run; every step lands one point (chord endpoints).
        const step =
      upper === 'H' || upper === 'V' ? 1 : upper === 'C' ? 6 : upper === 'S' || upper === 'Q' ? 4 : upper === 'A' ? 7 : 2;
        if (upper === 'Z') continue;
        for (let at = 0; at + step <= numbers.length; at += step) {
            const endX = numbers[at + step - 2];
            const endY = numbers[at + step - 1];
            if (upper === 'H') {
                const value = numbers[at];
                if (value !== undefined) x = relative ? x + value : value;
            } else if (upper === 'V') {
                const value = numbers[at];
                if (value !== undefined) y = relative ? y + value : value;
            } else if (endX !== undefined && endY !== undefined) {
                x = relative ? x + endX : endX;
                y = relative ? y + endY : endY;
            }
            points.push({ x, y });
        }
    }

    if (points.length < 2) return null;

    let total = 0;
    const lengths: number[] = [];
    for (let index = 1; index < points.length; index += 1) {
        const a = points[index - 1];
        const b = points[index];
        const length = a === undefined || b === undefined ? 0 : Math.hypot(b.x - a.x, b.y - a.y);
        lengths.push(length);
        total += length;
    }
    if (total === 0) return null;

    const target = total * Math.min(1, Math.max(0, at));
    let walked = 0;
    for (let index = 0; index < lengths.length; index += 1) {
        const length = lengths[index] ?? 0;
        if (walked + length < target) {
            walked += length;
            continue;
        }
        const a = points[index];
        const b = points[index + 1];
        if (a === undefined || b === undefined) break;
        const t = length === 0 ? 0 : (target - walked) / length;
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            vertical: Math.abs(b.y - a.y) > Math.abs(b.x - a.x),
        };
    }
    const last = points[points.length - 1];
    return last === undefined ? null : { x: last.x, y: last.y, vertical: false };
}
