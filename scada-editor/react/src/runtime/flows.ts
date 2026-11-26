import type { CellWrite } from '../plant/mock/mock-plant';
import type { CellKey, PlantCell } from '../plant/plant';

/*
 * What flows in run mode, as the links show it (`flowing` of a connection, see `connections.ts`): the liquid
 * through a pipe unless one of its ends stops it (a switched off pump, a closed valve), the current through a
 * wire while it is energized (by the plant).
 */

const PIPE = 'Pipe';
const WIRE = 'Wire';
// A beacon has power, but no liquid goes through it.
const NOT_PASSING_POWER = 'Beacon';

/** Whether the liquid passes the element: a switched off pump or a closed valve stops it. */
function isPassing(element: PlantCell | undefined): boolean {
    const plant = element?.data.plant;
    if (!element || !plant) {
        return true;
    }
    if (Object.hasOwn(plant, 'power') && element.data.kind !== NOT_PASSING_POWER) {
        return Boolean(plant.power);
    }
    if (Object.hasOwn(plant, 'open')) {
        return Boolean(plant.open);
    }
    return true;
}

/** Whether the link flows (a pipe, a wire), or `null` for a link that never does. */
function isFlowing(link: PlantCell, elements: ReadonlyMap<CellKey, PlantCell>): boolean | null {
    switch (link.data.kind) {
        case PIPE: {
            const end = (id: CellKey | undefined) => (id === undefined ? undefined : elements.get(id));
            return isPassing(end(link.source)) && isPassing(end(link.target));
        }
        case WIRE:
            return link.data.energized === true;
        default:
            return null;
    }
}

/** The links whose `flowing` is not as the plant is now: their new data. */
export function flowWrites(cells: readonly PlantCell[]): CellWrite[] {
    const elements = new Map(cells.filter((cell) => !cell.isLink).map((cell) => [cell.id, cell]));
    return cells.flatMap((cell) => {
        if (!cell.isLink) {
            return [];
        }
        const flowing = isFlowing(cell, elements);
        if (flowing === null || (cell.data.flowing === true) === flowing) {
            return [];
        }
        return [{ id: cell.id, data: { ...cell.data, flowing: flowing ? true : undefined } }];
    });
}
