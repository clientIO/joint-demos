import { createEquipment, createPipe } from '../plant/cells';
import type { PlantRecord } from '../plant/model';

/**
 * A water treatment plant: raw water is pumped through a filter into the clear
 * well, from which the distribution pump fills the elevated reservoir through a
 * control valve; a small generator drives the pump motor.
 */
export const WATER_TREATMENT: readonly PlantRecord[] = [
    createEquipment('tank', 'TK-201', { x: 60, y: 200 }, { name: 'Raw water', level: 74 }),
    createEquipment('handValve', 'HV-201', { x: 260, y: 346 }, { name: 'Intake', active: true }),
    createEquipment('pump', 'P-201', { x: 420, y: 306 }, { name: 'Intake pump' }),
    createEquipment('filter', 'FL-201', { x: 620, y: 296 }, { name: 'Sand filter' }),
    createEquipment('flowMeter', 'FT-201', { x: 760, y: 306 }, { name: 'Filtered flow' }),
    createEquipment('display', 'DI-201', { x: 960, y: 40 }, { name: 'Clear well level', source: 'TK-202' }),
    createEquipment('beacon', 'AL-201', { x: 1110, y: 50 }, { name: 'Level alarm', source: 'TK-202' }),
    createEquipment('tank', 'TK-202', { x: 960, y: 160 }, { name: 'Clear well', level: 35 }),
    createEquipment('pressureGauge', 'PI-201', { x: 1200, y: 160 }, { name: 'Discharge', source: 'P-202' }),
    createEquipment('pump', 'P-202', { x: 1180, y: 266 }, { name: 'Distribution pump' }),
    createEquipment('checkValve', 'NRV-201', { x: 1380, y: 276 }, { name: 'Non-return' }),
    createEquipment('controlValve', 'CV-201', { x: 1500, y: 266 }, { name: 'Reservoir inlet', active: true }),
    createEquipment('tank', 'TK-203', { x: 1680, y: 100 }, { name: 'Reservoir', level: 20 }),
    createEquipment('generator', 'G-201', { x: 60, y: 560 }, { name: 'Generator' }),
    createEquipment('breaker', 'CB-201', { x: 260, y: 560 }, { name: 'Pump feeder', active: true }),
    createEquipment('motor', 'M-201', { x: 420, y: 570 }, { name: 'Pump drive' }),

    createPipe('w1', { id: 'TK-201', port: 'out' }, { id: 'HV-201', port: 'in' }, 'water'),
    createPipe('w2', { id: 'HV-201', port: 'out' }, { id: 'P-201', port: 'in' }, 'water'),
    createPipe('w3', { id: 'P-201', port: 'out' }, { id: 'FL-201', port: 'in' }, 'water'),
    createPipe('w4', { id: 'FL-201', port: 'out' }, { id: 'FT-201', port: 'in' }, 'water'),
    createPipe('w5', { id: 'FT-201', port: 'out' }, { id: 'TK-202', port: 'in' }, 'water'),
    createPipe('w6', { id: 'TK-202', port: 'out' }, { id: 'P-202', port: 'in' }, 'water'),
    createPipe('w7', { id: 'P-202', port: 'out' }, { id: 'NRV-201', port: 'in' }, 'water'),
    createPipe('w8', { id: 'NRV-201', port: 'out' }, { id: 'CV-201', port: 'in' }, 'water'),
    createPipe('w9', { id: 'CV-201', port: 'out' }, { id: 'TK-203', port: 'in' }, 'water'),
    createPipe('e1', { id: 'G-201', port: 'e1' }, { id: 'CB-201', port: 'e1' }, 'power'),
    createPipe('e2', { id: 'CB-201', port: 'e2' }, { id: 'M-201', port: 'e1' }, 'power'),
];
