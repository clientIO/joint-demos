
export const loadExample = (graph) => {
    
    graph.fromJSON({
        'cells': [
            {
                'type': 'custom.HorizontalPool',
                'headerSide': 'top',
                'padding': { top: 40 },
                'headerTextMargin': 5,
                'contentMargin': 20,
                'minimumLaneSize': 60,
                'size': {
                    'width': 830,
                    'height': 550
                },
                'position': {
                    'x': 90,
                    'y': 90
                },
                'angle': 0,
                'id': 'e61cd250-af4e-4bbb-a159-33af78b90e75',
                'z': 713,
                'embeds': [
                    'be313881-be5d-48ea-8a02-bdf735c616dd',
                    '77bc6005-8d3d-4129-81ae-dc220599600b',
                    'e5945462-5df0-4663-838d-e0073438675c',
                    'fbf65bc4-3ad0-42d3-a3cd-7d3bec7ee52b',
                    'd3ee3bbf-5640-4b2b-a10f-2ab291554058',
                    'b8a5789f-abad-480e-bfcf-258ea261dda7',
                    'c1703607-e831-4614-a108-56151fd1ba67'
                ],
                'attrs': {
                    'headerText': {
                        'fontFamily': 'sans-serif',
                        'text': 'Business Operations'
                    }
                }
            },
            {
                'type': 'custom.HorizontalSwimlane',
                'headerSide': 'left',
                'headerSize': 30,
                'headerTextMargin': 5,
                'contentMargin': 20,
                'size': {
                    'width': 830,
                    'height': 160
                },
                'position': {
                    'x': 90,
                    'y': 480
                },
                'angle': 0,
                'id': 'e5945462-5df0-4663-838d-e0073438675c',
                'z': 714,
                'parent': 'e61cd250-af4e-4bbb-a159-33af78b90e75',
                'embeds': [
                    '1bfb1588-148d-43f3-8dcd-0ce0baf85772',
                    'ece5bad8-1927-4f03-9a88-6d640ad800a8',
                    '2b1494f9-7abd-444c-ae01-00beaddaecb1',
                    '32d5b068-b180-439a-8d44-e1f947fd819a',
                    '3eaec2ca-8112-42e4-84fd-e69031870c80'
                ],
                'attrs': {
                    'headerText': {
                        'fontFamily': 'sans-serif',
                        'text': 'Department A'
                    }
                }
            },
            {
                'type': 'custom.HorizontalSwimlane',
                'headerSide': 'left',
                'headerSize': 30,
                'headerTextMargin': 5,
                'contentMargin': 20,
                'size': {
                    'width': 830,
                    'height': 160
                },
                'position': {
                    'x': 90,
                    'y': 320
                },
                'angle': 0,
                'id': 'fbf65bc4-3ad0-42d3-a3cd-7d3bec7ee52b',
                'z': 714,
                'parent': 'e61cd250-af4e-4bbb-a159-33af78b90e75',
                'embeds': [
                    'a0df9fc1-8b4f-4a79-8bb8-df4ceed7838c',
                    '6c82cc14-3f99-47b8-8217-5a6e949ebefc',
                    '7ff728c7-e54d-40a1-9303-9eac99179eea'
                ],
                'attrs': {
                    'headerText': {
                        'fontFamily': 'sans-serif',
                        'text': 'Initiator'
                    }
                }
            },
            {
                'type': 'custom.HorizontalSwimlane',
                'headerSide': 'left',
                'headerSize': 30,
                'headerTextMargin': 5,
                'contentMargin': 20,
                'size': {
                    'width': 830,
                    'height': 160
                },
                'position': {
                    'x': 90,
                    'y': 160
                },
                'angle': 0,
                'id': 'd3ee3bbf-5640-4b2b-a10f-2ab291554058',
                'z': 714,
                'parent': 'e61cd250-af4e-4bbb-a159-33af78b90e75',
                'embeds': [
                    'f9ab7865-5cbe-407d-ad52-d2ff35599c0c',
                    'a26e3170-d9ef-4c57-9c15-b3dbf1a10430',
                    'b5d5d306-7818-40d2-a311-69890e73734e',
                    'b7f76687-d109-4a73-aa42-73397692c4b1',
                    '37af8b43-ce4a-42a6-85e5-5634e4b1568e',
                    '6d0c471f-17eb-4ebc-a4fb-ecc6111762fc',
                    '103decfd-5bb5-4214-b00a-3eac5e6ad70d'
                ],
                'attrs': {
                    'headerText': {
                        'fontFamily': 'sans-serif',
                        'text': 'Department B'
                    }
                }
            },
            {
                'type': 'custom.VerticalPhase',
                'headerSide': 'top',
                'headerSize': 30,
                'headerTextMargin': 5,
                'size': {
                    'width': 510,
                    'height': 510
                },
                'position': {
                    'x': 90,
                    'y': 130
                },
                'angle': 0,
                'id': 'b8a5789f-abad-480e-bfcf-258ea261dda7',
                'z': 715,
                'parent': 'e61cd250-af4e-4bbb-a159-33af78b90e75',
                'attrs': {
                    'headerText': {
                        'fontFamily': 'sans-serif',
                        'text': 'Phase 1'
                    }
                }
            },
            {
                'type': 'custom.VerticalPhase',
                'headerSide': 'top',
                'headerSize': 30,
                'headerTextMargin': 5,
                'size': {
                    'width': 320,
                    'height': 510
                },
                'position': {
                    'x': 600,
                    'y': 130
                },
                'angle': 0,
                'id': 'c1703607-e831-4614-a108-56151fd1ba67',
                'z': 715,
                'parent': 'e61cd250-af4e-4bbb-a159-33af78b90e75',
                'attrs': {
                    'headerText': {
                        'fontFamily': 'sans-serif',
                        'text': 'Phase 2'
                    }
                }
            },
            {
                'type': 'custom.Activity',
                'size': {
                    'width': 80,
                    'height': 60
                },
                'position': {
                    'x': 490,
                    'y': 530
                },
                'angle': 0,
                'id': '2b1494f9-7abd-444c-ae01-00beaddaecb1',
                'z': 716,
                'parent': 'e5945462-5df0-4663-838d-e0073438675c',
                'attrs': {
                    'label': {
                        'text': 'A.1-1'
                    }
                }
            },
            {
                'type': 'custom.Activity',
                'size': {
                    'width': 80,
                    'height': 60
                },
                'position': {
                    'x': 490,
                    'y': 210
                },
                'angle': 0,
                'id': 'b7f76687-d109-4a73-aa42-73397692c4b1',
                'z': 716,
                'parent': 'd3ee3bbf-5640-4b2b-a10f-2ab291554058',
                'attrs': {
                    'label': {
                        'text': 'B.1-2'
                    }
                }
            },
            {
                'type': 'custom.Activity',
                'size': {
                    'width': 80,
                    'height': 60
                },
                'position': {
                    'x': 660,
                    'y': 210
                },
                'angle': 0,
                'id': '37af8b43-ce4a-42a6-85e5-5634e4b1568e',
                'z': 716,
                'parent': 'd3ee3bbf-5640-4b2b-a10f-2ab291554058',
                'attrs': {
                    'label': {
                        'text': 'B.2-1'
                    }
                }
            },
            {
                'type': 'custom.Event',
                'size': {
                    'width': 40,
                    'height': 40
                },
                'position': {
                    'x': 160,
                    'y': 380
                },
                'angle': 0,
                'id': '6c82cc14-3f99-47b8-8217-5a6e949ebefc',
                'z': 716,
                'parent': 'fbf65bc4-3ad0-42d3-a3cd-7d3bec7ee52b',
                'attrs': {
                    'label': {
                        'text': 'Start'
                    }
                }
            },
            {
                'type': 'custom.Gateway',
                'size': {
                    'width': 60,
                    'height': 60
                },
                'position': {
                    'x': 320,
                    'y': 370
                },
                'angle': 0,
                'id': '7ff728c7-e54d-40a1-9303-9eac99179eea',
                'z': 716,
                'parent': 'fbf65bc4-3ad0-42d3-a3cd-7d3bec7ee52b',
                'attrs': {
                    'label': {
                        'text': 'Decision'
                    }
                }
            },
            {
                'type': 'custom.Event',
                'size': {
                    'width': 40,
                    'height': 40
                },
                'position': {
                    'x': 830,
                    'y': 540
                },
                'angle': 0,
                'id': '32d5b068-b180-439a-8d44-e1f947fd819a',
                'z': 716,
                'parent': 'e5945462-5df0-4663-838d-e0073438675c',
                'attrs': {
                    'border': {
                        'borderType': 'thick'
                    },
                    'label': {
                        'text': 'End A'
                    }
                }
            },
            {
                'type': 'custom.Event',
                'size': {
                    'width': 40,
                    'height': 40
                },
                'position': {
                    'x': 830,
                    'y': 220
                },
                'angle': 0,
                'id': '6d0c471f-17eb-4ebc-a4fb-ecc6111762fc',
                'z': 716,
                'parent': 'd3ee3bbf-5640-4b2b-a10f-2ab291554058',
                'attrs': {
                    'border': {
                        'borderType': 'thick'
                    },
                    'label': {
                        'text': 'End B'
                    }
                }
            },
            {
                'type': 'custom.Activity',
                'size': {
                    'width': 80,
                    'height': 60
                },
                'position': {
                    'x': 310,
                    'y': 210
                },
                'angle': 0,
                'id': '103decfd-5bb5-4214-b00a-3eac5e6ad70d',
                'z': 716,
                'parent': 'd3ee3bbf-5640-4b2b-a10f-2ab291554058',
                'attrs': {
                    'label': {
                        'text': 'B.1-1'
                    }
                }
            },
            {
                'type': 'custom.Activity',
                'size': {
                    'width': 80,
                    'height': 60
                },
                'position': {
                    'x': 660,
                    'y': 530
                },
                'angle': 0,
                'id': '3eaec2ca-8112-42e4-84fd-e69031870c80',
                'z': 716,
                'parent': 'e5945462-5df0-4663-838d-e0073438675c',
                'attrs': {
                    'label': {
                        'text': 'A.2-1'
                    }
                }
            },
            {
                'type': 'bpmn2.Flow',
                'source': {
                    'id': 'b7f76687-d109-4a73-aa42-73397692c4b1'
                },
                'target': {
                    'id': '37af8b43-ce4a-42a6-85e5-5634e4b1568e'
                },
                'id': 'b5d5d306-7818-40d2-a311-69890e73734e',
                'z': 734,
                'parent': 'd3ee3bbf-5640-4b2b-a10f-2ab291554058',
                'attrs': {}
            },
            {
                'type': 'bpmn2.Flow',
                'source': {
                    'id': '6c82cc14-3f99-47b8-8217-5a6e949ebefc'
                },
                'target': {
                    'id': '7ff728c7-e54d-40a1-9303-9eac99179eea'
                },
                'id': 'a0df9fc1-8b4f-4a79-8bb8-df4ceed7838c',
                'z': 740,
                'parent': 'fbf65bc4-3ad0-42d3-a3cd-7d3bec7ee52b',
                'attrs': {}
            },
            {
                'type': 'bpmn2.Flow',
                'source': {
                    'id': '7ff728c7-e54d-40a1-9303-9eac99179eea'
                },
                'target': {
                    'id': '2b1494f9-7abd-444c-ae01-00beaddaecb1'
                },
                'id': '77bc6005-8d3d-4129-81ae-dc220599600b',
                'z': 741,
                'parent': 'e61cd250-af4e-4bbb-a159-33af78b90e75',
                'attrs': {}
            },
            {
                'type': 'bpmn2.Flow',
                'source': {
                    'id': '37af8b43-ce4a-42a6-85e5-5634e4b1568e'
                },
                'target': {
                    'id': '6d0c471f-17eb-4ebc-a4fb-ecc6111762fc'
                },
                'id': 'a26e3170-d9ef-4c57-9c15-b3dbf1a10430',
                'z': 747,
                'parent': 'd3ee3bbf-5640-4b2b-a10f-2ab291554058',
                'attrs': {}
            },
            {
                'type': 'bpmn2.Flow',
                'source': {
                    'id': '7ff728c7-e54d-40a1-9303-9eac99179eea'
                },
                'target': {
                    'id': '103decfd-5bb5-4214-b00a-3eac5e6ad70d'
                },
                'id': 'be313881-be5d-48ea-8a02-bdf735c616dd',
                'z': 749,
                'parent': 'e61cd250-af4e-4bbb-a159-33af78b90e75',
                'attrs': {}
            },
            {
                'type': 'bpmn2.Flow',
                'source': {
                    'id': '103decfd-5bb5-4214-b00a-3eac5e6ad70d'
                },
                'target': {
                    'id': 'b7f76687-d109-4a73-aa42-73397692c4b1'
                },
                'id': 'f9ab7865-5cbe-407d-ad52-d2ff35599c0c',
                'z': 749,
                'parent': 'd3ee3bbf-5640-4b2b-a10f-2ab291554058',
                'attrs': {}
            },
            {
                'type': 'bpmn2.Flow',
                'source': {
                    'id': '2b1494f9-7abd-444c-ae01-00beaddaecb1'
                },
                'target': {
                    'id': '3eaec2ca-8112-42e4-84fd-e69031870c80'
                },
                'id': '1bfb1588-148d-43f3-8dcd-0ce0baf85772',
                'z': 751,
                'parent': 'e5945462-5df0-4663-838d-e0073438675c',
                'attrs': {}
            },
            {
                'type': 'bpmn2.Flow',
                'source': {
                    'id': '3eaec2ca-8112-42e4-84fd-e69031870c80'
                },
                'target': {
                    'id': '32d5b068-b180-439a-8d44-e1f947fd819a'
                },
                'id': 'ece5bad8-1927-4f03-9a88-6d640ad800a8',
                'z': 751,
                'parent': 'e5945462-5df0-4663-838d-e0073438675c',
                'attrs': {}
            }
        ]
    });
};
