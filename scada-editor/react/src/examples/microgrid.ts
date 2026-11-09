import { createEquipment, createPipe } from '../plant/cells';
import type { PlantRecord } from '../plant/model';

/**
 * A microgrid: two generators, each behind its breaker, feed a transformer; a
 * feeder breaker passes the power on to two motors. A fan blows air through the
 * transformer's cooler.
 */
export const MICROGRID: readonly PlantRecord[] = [
    createEquipment('generator', 'G-301', { x: 60, y: 100 }, { name: 'Generator 1' }),
    createEquipment('breaker', 'CB-301', { x: 260, y: 100 }, { name: 'G1 breaker', active: true }),
    createEquipment('generator', 'G-302', { x: 60, y: 300 }, { name: 'Generator 2' }),
    createEquipment('breaker', 'CB-302', { x: 260, y: 300 }, { name: 'G2 breaker' }),
    createEquipment('transformer', 'T-301', { x: 420, y: 190 }, { name: 'Step-down' }),
    createEquipment('breaker', 'CB-303', { x: 600, y: 200 }, { name: 'Feeder', active: true }),
    createEquipment('motor', 'M-301', { x: 780, y: 120 }, { name: 'Pump motor' }),
    createEquipment('motor', 'M-302', { x: 780, y: 320 }, { name: 'Mixer motor' }),
    createEquipment('display', 'DI-301', { x: 60, y: -40 }, { name: 'G1 output', source: 'G-301' }),
    createEquipment('display', 'DI-302', { x: 60, y: 440 }, { name: 'G2 output', source: 'G-302' }),
    createEquipment('fan', 'F-301', { x: 420, y: 470 }, { name: 'Cooling fan' }),
    createEquipment('heatExchanger', 'E-301', { x: 620, y: 490 }, { name: 'Transformer cooler' }),

    createPipe('e1', { id: 'G-301', port: 'e1' }, { id: 'CB-301', port: 'e1' }, 'power'),
    createPipe('e2', { id: 'G-302', port: 'e1' }, { id: 'CB-302', port: 'e1' }, 'power'),
    createPipe('e3', { id: 'CB-301', port: 'e2' }, { id: 'T-301', port: 'e1' }, 'power'),
    createPipe('e4', { id: 'CB-302', port: 'e2' }, { id: 'T-301', port: 'e1' }, 'power'),
    createPipe('e5', { id: 'T-301', port: 'e2' }, { id: 'CB-303', port: 'e1' }, 'power'),
    createPipe('e6', { id: 'CB-303', port: 'e2' }, { id: 'M-301', port: 'e1' }, 'power'),
    createPipe('e7', { id: 'CB-303', port: 'e2' }, { id: 'M-302', port: 'e1' }, 'power'),
    createPipe('a1', { id: 'F-301', port: 'out' }, { id: 'E-301', port: 'in' }, 'air'),
];
