import type { PlantRecord } from '../plant/model';
import { BOILER_HOUSE } from './boiler-house';
import { MICROGRID } from './microgrid';
import { WATER_TREATMENT } from './water-treatment';

/** A plant to open from the toolbar. */
export interface Example {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly cells: readonly PlantRecord[];
}

/** The plants to open from the toolbar, the first one on load. */
export const EXAMPLES: readonly Example[] = [
    { id: 'boiler-house', name: 'Boiler house', description: 'Feedwater, a fired boiler, steam to a process and back', cells: BOILER_HOUSE },
    { id: 'water-treatment', name: 'Water treatment', description: 'Intake, a sand filter, the clear well, a reservoir', cells: WATER_TREATMENT },
    { id: 'microgrid', name: 'Microgrid', description: 'Two generators, a transformer, a feeder to motors', cells: MICROGRID },
];
