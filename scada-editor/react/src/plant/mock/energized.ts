import type { CellKey, PlantCell } from '../plant';

/*
 * The electrical circuits of the mock plant: which elements and wires are energized (a real plant sends it with
 * its data, as the `energized` of the cells). The power comes from the sources (a running generator or wind
 * turbine, a battery, a solar array) through the wires and every element on the way, but an open breaker or
 * disconnector: it is energized itself (on its side of the source), what is behind it is not.
 */

const ALWAYS_SOURCES = new Set(['Battery', 'BatteryBank', 'SolarArray']);
const RUNNING_SOURCES = new Set(['Generator', 'DieselGenerator', 'WindTurbine']);
const SWITCHES = new Set(['CircuitBreaker', 'Disconnector']);
const WIRE = 'Wire';

/** Whether the element is a source of the power now. */
function isSource({ data }: PlantCell): boolean {
    if (ALWAYS_SOURCES.has(data.kind)) {
        return true;
    }
    return RUNNING_SOURCES.has(data.kind) && Boolean(data.plant?.power);
}

/** Whether the current passes the element (to its other terminals). */
function isPassing({ data }: PlantCell): boolean {
    return SWITCHES.has(data.kind) ? !data.plant?.open : true;
}

/** The energized elements and wires of the diagram, by their ids. */
export function energizedOf(cells: readonly PlantCell[]): ReadonlySet<CellKey> {
    const elements = new Map<CellKey, PlantCell>();
    const wiresOf = new Map<CellKey, PlantCell[]>();
    const wires: PlantCell[] = [];
    for (const cell of cells) {
        if (!cell.isLink) {
            elements.set(cell.id, cell);
        } else if (cell.data.kind === WIRE) {
            wires.push(cell);
        }
    }
    for (const wire of wires) {
        for (const end of [wire.source, wire.target]) {
            if (end !== undefined) {
                wiresOf.set(end, [...(wiresOf.get(end) ?? []), wire]);
            }
        }
    }
    const reached = new Set<CellKey>();
    const queue = [...elements.values()].filter(isSource);
    queue.forEach((element) => reached.add(element.id));
    for (let element = queue.shift(); element; element = queue.shift()) {
        if (!isPassing(element)) {
            continue;
        }
        for (const wire of wiresOf.get(element.id) ?? []) {
            for (const endId of [wire.source, wire.target]) {
                const end = endId === undefined ? undefined : elements.get(endId);
                if (end && !reached.has(end.id)) {
                    reached.add(end.id);
                    queue.push(end);
                }
            }
        }
    }
    const energized = new Set<CellKey>(reached);
    for (const wire of wires) {
        const isSourceReached = wire.source !== undefined && elements.has(wire.source) && reached.has(wire.source);
        const isTargetReached = wire.target !== undefined && elements.has(wire.target) && reached.has(wire.target);
        if (isSourceReached && isTargetReached) {
            energized.add(wire.id);
        }
    }
    return energized;
}
