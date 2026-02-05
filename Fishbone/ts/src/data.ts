export interface FishboneData {
    name: string;
    children?: Array<FishboneData>
    direction: 'top' | 'bottom' | null;
}

export const poorProductQualityData: FishboneData = {
    name: 'Poor Product\nQuality',
    direction: null,
    children: [{
        name: '',
        direction: null,
        children: [{
            name: 'Management',
            direction: null,
            children: [{
                name: 'Leadership',
                direction: null,
                children: [{
                    name: 'Short term planning',
                    direction: null,
                }, {
                    name: 'Lack of planning',
                    direction: null,
                }, {
                    name: 'Lack of supervision',
                    direction: null,
                }]
            }]
        }, {
            name: 'Methods',
            direction: null,
            children: [{
                name: 'Procedures',
                direction: null,
                children: [{
                    name: 'Lack of procedures',
                    direction: null,
                }, {
                    name: 'Procedures\nnot followed',
                    direction: null,
                    children: [{
                        name: 'Procedures\ntoo rigid',
                        direction: null,
                    }, {
                        name: 'Procedures\nnot updated',
                        direction: null,
                    }]
                }, {
                    name: 'Conflicting procedures',
                    direction: null,
                }]
            }]
        }, {
            name: 'Machine',
            direction: null,
            children: [{
                name: 'Calibration',
                direction: null,
            }, {
                name: 'Capability',
                direction: null,
                children: [{
                    name: 'Outdated technology',
                    direction: null,
                }]
            }, {
                name: 'Maintenance',
                direction: null,
                children: [{
                    name: 'Wear and tear',
                    direction: null,
                }, {
                    name: 'Lack of tools',
                    direction: null,
                }]
            }]
        }, {
            name: 'Environment',
            direction: null,
            children: [{
                name: 'Vibration',
                direction: null,
            }, {
                name: 'Noise',
                direction: null,
            }, {
                name: 'Hygiene',
                direction: null,
            }, {
                name: 'Ventilation',
                direction: null,
            }, {
                name: 'Humidity control',
                direction: null,
            }, {
                name: 'Temperature control',
                direction: null,
            }]
        }, {
            name: 'Material',
            direction: null,
            children: [{
                name: 'Variation in composition',
                direction: null,
                children: [{
                    name: 'Supplier quality',
                    direction: null,
                }, {
                    name: 'Material storage',
                    direction: null,
                }, {
                    name: 'Material handling',
                    direction: null,
                }]
            }, {
                name: 'Unclear specification',
                direction: null,
                children: [{
                    name: 'Lack of standards',
                    direction: null,
                }, {
                    name: 'Inadequate testing',
                    direction: null,
                }, {
                    name: 'Inadequate inspection',
                    direction: null,
                }]
            }]
        }, {
            name: 'Manpower',
            direction: null,
            children: [{
                name: 'Skills',
                direction: null,
                children: [{
                    name: 'Lack of training',
                    direction: null,
                }, {
                    name: 'Qualification',
                    direction: null,
                }]
            }, {
                name: 'Motivation',
                direction: null,
                children: [{
                    name: 'Lack of interest',
                    direction: null,
                }, {
                    name: 'Fear',
                    direction: null,
                }, {
                    name: 'Stress',
                    direction: null,
                }]
            }]
        }]
    }]
};

// Fishbone nodes (problem => tail => a x cause => b x sub-cause => c x root cause)
export function generateFishboneNodes(a: number, b: number, c: number, d: number, e: number = 0, f: number = 0): FishboneData {
    return {
        name: 'Problem',
        direction: null,
        children: [{
            name: 'Tail',
            direction: null,
            children: Array.from({ length: a }, (_, i) => ({
                name: `Primary cause ${i + 1}`,
                direction: null,
                children: Array.from({ length: b }, (_, j) => ({
                    name: `Cause ${i + 1}.${j + 1}`,
                    direction: null,
                    children: Array.from({ length: c }, (_, k) => ({
                        name: `Sub-cause ${i + 1}.${j + 1}.${k + 1}`,
                        direction: null,
                        children: Array.from({ length: d }, (_, l) => ({
                            name: `Root cause ${i + 1}.${j + 1}.${k + 1}.${l + 1}`,
                            direction: null,
                            children: Array.from({ length: e }, (_, m) => ({
                                name: `Sub-root cause ${i + 1}.${j + 1}.${k + 1}.${l + 1}.${m + 1}`,
                                direction: null,
                                children: Array.from({ length: f }, (_, n) => ({
                                    name: `Final cause ${i + 1}.${j + 1}.${k + 1}.${l + 1}.${m + 1}.${n + 1}`,
                                    direction: null,
                                }) as FishboneData)
                            }) as FishboneData)
                        }) as FishboneData)
                    }) as FishboneData)
                }) as FishboneData)
            }) as FishboneData)
        }]
    };
}
