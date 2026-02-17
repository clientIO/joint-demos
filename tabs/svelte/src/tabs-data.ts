interface TabData {
    title: string;
    json: any;
}

export const TabsData: TabData[] = [];
// Tab 1.
TabsData.push({
    title: 'Dinner with friends',
    json: {
        id: 'dinner-with-friends',
        cells: [{
            id: 'dinner-with-friends-start',
            type: 'bpmn2.Event',
            position: { x: 100, y: 280 }
        }, {
            id: 'invites-friends',
            type: 'bpmn2.Activity',
            position: { x: 260, y: 250 },
            attrs: {
                label: {
                    text: 'Invites friends\n to dinner',
                }
            }
        }, {
            id: 'meal-preparations',
            subgraphId: 'meal-preparations',
            type: 'bpmn2.Activity',
            position: { x: 460, y: 250 },
            attrs: {
                label: {
                    text: 'Meal preparations'
                },
                markers: {
                    iconTypes: ['sub-process']
                }
            }
        }, {
            id: 'eat-meal',
            type: 'bpmn2.Activity',
            position: { x: 660, y: 250 },
            attrs: {
                label: {
                    text: 'Eat meal',
                }
            }
        }, {
            id: 'dinner-with-friends-end',
            type: 'bpmn2.Event',
            position: { x: 900, y: 280 },
            attrs: {
                border: {
                    borderType: 'thick'
                }
            }
        }, {
            type: 'bpmn2.Flow',
            source: {
                id: 'dinner-with-friends-start'
            },
            target: {
                id: 'invites-friends'
            }
        }, {
            type: 'bpmn2.Flow',
            source: {
                id: 'invites-friends'
            },
            target: {
                id: 'meal-preparations'
            }
        }, {
            type: 'bpmn2.Flow',
            source: {
                id: 'meal-preparations'
            },
            target: {
                id: 'eat-meal'
            }
        }, {
            type: 'bpmn2.Flow',
            source: {
                id: 'eat-meal'
            },
            target: {
                id: 'dinner-with-friends-end'
            }
        }]
    }
});
// Tab 2.
TabsData.push({
    title: 'Meal preparations',
    json: {
        id: 'meal-preparations',
        cells: [{
            id: 'meal-preparation-start',
            type: 'bpmn2.Event',
            position: { x: 100, y: 280 }
        }, {
            id: 'choose-recipe',
            type: 'bpmn2.Activity',
            position: { x: 260, y: 250 },
            attrs: {
                label: {
                    text: 'Choose recipe'
                }
            }
        }, {
            id: 'prepare-meal',
            type: 'bpmn2.Activity',
            position: { x: 460, y: 250 },
            attrs: {
                label: {
                    text: 'Prepare meal'
                }
            }
        }, {
            id: 'meal-preparation-end',
            type: 'bpmn2.Event',
            position: { x: 700, y: 280 },
            subgraphId: 'dinner-with-friends',
            attrs: {
                border: {
                    borderType: 'thick'
                },
                label: {
                    text: 'Dinner with friends'
                }
            }
        }, {
            type: 'bpmn2.Flow',
            source: {
                id: 'meal-preparation-start'
            },
            target: {
                id: 'choose-recipe'
            }
        }, {
            type: 'bpmn2.Flow',
            source: {
                id: 'choose-recipe'
            },
            target: {
                id: 'prepare-meal'
            }
        }, {
            type: 'bpmn2.Flow',
            source: {
                id: 'prepare-meal'
            },
            target: {
                id: 'meal-preparation-end'
            }
        }, {
            id: 'include-guests',
            subgraphId: 'include-guests',
            type: 'bpmn2.Activity',
            position: { x: 100, y: 50 },
            attrs: {
                border: {
                    borderStyle: 'dotted'
                },
                icon: {
                    iconType: 'message1'
                },
                label: {
                    text: 'Include guests'
                }
            }
        }, {
            id: 'provide-meal',
            subgraphId: 'provide-meal',
            type: 'bpmn2.Activity',
            position: { x: 250, y: 50 },
            attrs: {
                border: {
                    borderStyle: 'dotted'
                },
                icon: {
                    iconType: 'error1'
                },
                label: {
                    text: 'Provide meal'
                }
            }
        }]
    }
});
// Tab 3.
TabsData.push({
    title: 'Include guests',
    json: {
        id: 'include-guests',
        cells: [{
            id: 'guest-announced',
            type: 'bpmn2.Event',
            position: { x: 100, y: 280 },
            attrs: {
                icon: {
                    iconType: 'message1'
                },
                border: {
                    borderStyle: 'dashed'
                },
                label: {
                    text: 'A new guest\nhas announced\nhimself'
                }
            }

        }, {
            id: 'guest-noticed',
            type: 'bpmn2.Activity',
            position: { x: 260, y: 250 },
            attrs: {
                label: {
                    text: 'Take new guest\ninto account'
                }
            }
        }, {
            id: 'include-guest-end',
            type: 'bpmn2.Event',
            position: { x: 500, y: 280 },
            subgraphId: 'meal-preparations',
            attrs: {
                border: {
                    borderType: 'thick'
                },
                label: {
                    text: 'Meal preparations'
                }
            }
        }, {
            type: 'bpmn2.Flow',
            source: {
                id: 'guest-announced'
            },
            target: {
                id: 'guest-noticed'
            }
        }, {
            type: 'bpmn2.Flow',
            source: {
                id: 'guest-noticed'
            },
            target: {
                id: 'include-guest-end'
            }
        }]
    }
});
// Tab 4.
TabsData.push({
    title: 'Provide meal',
    json: {
        id: 'provide-meal',
        cells: [{
            id: 'cooking-meal-failed',
            type: 'bpmn2.Event',
            position: { x: 100, y: 280 },
            attrs: {
                icon: {
                    iconType: 'error1'
                },
                label: {
                    text: 'Cooking meal\nfailed'
                }
            }

        }, {
            id: 'order-meal',
            type: 'bpmn2.Activity',
            position: { x: 260, y: 250 },
            attrs: {
                label: {
                    text: 'Order Meal'
                }
            }
        }, {
            id: 'provide-meal-end',
            subgraphId: 'meal-preparations',
            type: 'bpmn2.Event',
            position: { x: 500, y: 280 },
            attrs: {
                border: {
                    borderType: 'thick'
                },
                label: {
                    text: 'Meal preparations'
                }
            }
        }, {
            type: 'bpmn2.Flow',
            source: {
                id: 'cooking-meal-failed'
            },
            target: {
                id: 'order-meal'
            }
        }, {
            type: 'bpmn2.Flow',
            source: {
                id: 'order-meal'
            },
            target: {
                id: 'provide-meal-end'
            }
        }]
    }
});
