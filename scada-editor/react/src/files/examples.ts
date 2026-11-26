import boilerHouse from '../diagrams/boiler-house.json';
import cementPlant from '../diagrams/cement-plant.json';
import microgrid from '../diagrams/microgrid.json';

/** An example diagram, as a saved file: offered by the inspector panel when nothing is selected. */
export interface Example {
    readonly name: string;
    readonly description: string;
    readonly json: unknown;
}

/** The examples, the first one opened on load. */
export const EXAMPLES: readonly Example[] = [
    {
        name: 'Boiler House',
        description: 'Steam: the boilers, the feedwater, the charts of the plant',
        json: boilerHouse,
    },
    {
        name: 'Microgrid',
        description: 'Power: the wind, the sun, a diesel backup and a battery on a bus',
        json: microgrid,
    },
    {
        name: 'Cement Plant',
        description: 'Solids: the limestone up a belt, the raw meal through the preheater, the gas to the stack',
        json: cementPlant,
    },
];
