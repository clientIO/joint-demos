import { createEquipment, createPipe } from '../plant/cells';
import type { PlantRecord } from '../plant/model';

/**
 * The example plant: a feedwater tank feeds a boiler, its steam heats a
 * process through a control valve and returns as condensate; a fuel pump fires
 * the burner; a small generator powers the feed pump motor. The positions line
 * the stubs up, so the pipes run straight.
 */
export const BOILER_HOUSE: readonly PlantRecord[] = [
    createEquipment('display', 'DI-101', { x: 60, y: 170 }, { name: 'Feedwater level', source: 'TK-101' }),
    createEquipment('tank', 'TK-101', { x: 60, y: 300 }, { name: 'Feedwater', level: 62 }),
    createEquipment('handValve', 'HV-101', { x: 260, y: 446 }, { name: 'Suction', active: true }),
    createEquipment('pump', 'P-101', { x: 420, y: 406 }, { name: 'Feed pump' }),
    createEquipment('checkValve', 'NRV-101', { x: 620, y: 416 }, { name: 'Non-return' }),
    createEquipment('flowMeter', 'FT-101', { x: 760, y: 406 }, { name: 'Feed flow' }),
    createEquipment('thermometer', 'TI-101', { x: 905, y: 250 }, { name: 'Drum temp.', source: 'B-101' }),
    createEquipment('boiler', 'B-101', { x: 960, y: 337 }, { name: 'Steam boiler' }),
    createEquipment('pressureGauge', 'PI-101', { x: 1110, y: 360 }, { name: 'Drum pressure', source: 'B-101' }),
    createEquipment('beacon', 'AL-101', { x: 1210, y: 365 }, { name: 'Overpressure', source: 'B-101' }),
    createEquipment('controlValve', 'CV-101', { x: 1150, y: 170 }, { name: 'Steam supply', active: true }),
    createEquipment('heatExchanger', 'E-101', { x: 1310, y: 170 }, { name: 'Process heater' }),
    createEquipment('tank', 'TK-102', { x: 700, y: 560 }, { name: 'Fuel oil', level: 80 }),
    createEquipment('pump', 'P-102', { x: 900, y: 666 }, { name: 'Fuel pump' }),
    createEquipment('generator', 'G-101', { x: 60, y: 800 }, { name: 'Generator' }),
    createEquipment('breaker', 'CB-101', { x: 260, y: 800 }, { name: 'Main breaker', active: true }),
    createEquipment('transformer', 'T-101', { x: 400, y: 790 }, { name: '400/230 V' }),
    createEquipment('motor', 'M-101', { x: 580, y: 810 }, { name: 'Pump drive' }),

    createPipe('w1', { id: 'TK-101', port: 'out' }, { id: 'HV-101', port: 'in' }, 'water'),
    createPipe('w2', { id: 'HV-101', port: 'out' }, { id: 'P-101', port: 'in' }, 'water'),
    createPipe('w3', { id: 'P-101', port: 'out' }, { id: 'NRV-101', port: 'in' }, 'water'),
    createPipe('w4', { id: 'NRV-101', port: 'out' }, { id: 'FT-101', port: 'in' }, 'water'),
    createPipe('w5', { id: 'FT-101', port: 'out' }, { id: 'B-101', port: 'in' }, 'water'),
    createPipe('s1', { id: 'B-101', port: 'steam' }, { id: 'CV-101', port: 'in' }, 'steam'),
    createPipe('s2', { id: 'CV-101', port: 'out' }, { id: 'E-101', port: 'in' }, 'steam'),
    {
        ...createPipe('c1', { id: 'E-101', port: 'out' }, { id: 'TK-101', port: 'in' }, 'water'),
        vertices: [{ x: 1560, y: 200 }, { x: 1560, y: 110 }, { x: 20, y: 110 }, { x: 20, y: 330 }],
    },
    createPipe('f1', { id: 'TK-102', port: 'out' }, { id: 'P-102', port: 'in' }, 'fuel'),
    createPipe('f2', { id: 'P-102', port: 'out' }, { id: 'B-101', port: 'fuel' }, 'fuel'),
    createPipe('e1', { id: 'G-101', port: 'e1' }, { id: 'CB-101', port: 'e1' }, 'power'),
    createPipe('e2', { id: 'CB-101', port: 'e2' }, { id: 'T-101', port: 'e1' }, 'power'),
    createPipe('e3', { id: 'T-101', port: 'e2' }, { id: 'M-101', port: 'e1' }, 'power'),
];
