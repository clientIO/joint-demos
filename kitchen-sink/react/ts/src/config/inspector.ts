
const BORDER_COLOR = '#374151';
const options = {
    colorPalette: [
        { content: 'transparent', icon: 'assets/transparent-icon.svg' },
        { content: '#000000' },
        { content: '#1B1B1B' },
        { content: '#353535' },
        { content: '#626262' },
        { content: '#D4D4D4' },
        { content: '#E4ECF7' },
        { content: '#FFFFFF' },
        { content: '#F5242C' },
        { content: '#7E4AD3' },
        { content: '#FB54A9' },
        { content: '#33B6D1' },
        { content: '#2A3A4E' },
        { content: '#3771B8' },
        { content: '#F27F31' },
        { content: '#1CA25D' }
    ],

    colorPaletteReset: [
        { content: 'transparent', icon: 'assets/no-color-icon.svg' },
        { content: '#000000' },
        { content: '#1B1B1B' },
        { content: '#353535' },
        { content: '#626262' },
        { content: '#D4D4D4' },
        { content: '#E4ECF7' },
        { content: '#FFFFFF' },
        { content: '#F5242C' },
        { content: '#7E4AD3' },
        { content: '#FB54A9' },
        { content: '#33B6D1' },
        { content: '#2A3A4E' },
        { content: '#3771B8' },
        { content: '#F27F31' },
        { content: '#1CA25D' }
    ],

    fontWeight: [
        { value: '300', content: '<span style="font-weight: 300">Light</span>' },
        { value: 'Normal', content: '<span style="font-weight: Normal">Normal</span>' },
        { value: 'Bold', content: '<span style="font-weight: Bolder">Bold</span>' }
    ],

    fontFamily: [
        { value: 'Open Sans', content: '<span style="font-family: Open Sans">Open Sans</span>' },
        { value: 'DM Sans', content: '<span style="font-family: DM Sans">DM Sans</span>' },
        { value: 'Roboto Flex', content: '<span style="font-family: Roboto Flex">Roboto Flex</span>' }
    ],

    strokeStyle: [
        { value: '0', content: 'Solid' },
        { value: '2,5', content: 'Dotted' },
        { value: '10,5', content: 'Dashed' }
    ],

    side: [
        { value: 'top', content: 'Top Side' },
        { value: 'right', content: 'Right Side' },
        { value: 'bottom', content: 'Bottom Side' },
        { value: 'left', content: 'Left Side' }
    ],

    portLabelPositionRectangle: [
        { value: { name: 'top', args: { y: -12 }}, content: 'Above' },
        { value: { name: 'right', args: { y: 0 }}, content: 'On Right' },
        { value: { name: 'bottom', args: { y: 12 }}, content: 'Below' },
        { value: { name: 'left', args: { y: 0 }}, content: 'On Left' }
    ],

    portLabelPositionEllipse: [
        { value: 'radial', content: 'Horizontal' },
        { value: 'radialOriented', content: 'Angled' }
    ],

    imageIcons: [
        { value: 'assets/image-icon1.svg', content: '<img height="42px" src="assets/image-icon1.svg"/>' },
        { value: 'assets/image-icon2.svg', content: '<img height="80px" src="assets/image-icon2.svg"/>' },
        { value: 'assets/image-icon3.svg', content: '<img height="80px" src="assets/image-icon3.svg"/>' },
        { value: 'assets/image-icon4.svg', content: '<img height="80px" src="assets/image-icon4.svg"/>' }
    ],

    imageGender: [
        { value: 'assets/member-male.png', content: '<img height="50px" src="assets/member-male.png" style="margin: 5px 0 0 2px;"/>' },
        { value: 'assets/member-female.png', content: '<img height="50px" src="assets/member-female.png" style="margin: 5px 0 0 2px;"/>' }
    ],

    arrowheadSize: [
        { value: 'M 0 0 0 0', content: 'None' },
        { value: 'M 0 -3 -6 0 0 3 z', content: 'Small' },
        { value: 'M 0 -5 -10 0 0 5 z', content: 'Medium' },
        { value: 'M 0 -10 -15 0 0 10 z', content: 'Large' },
    ],

    strokeWidth: [
        { value: 1, content: `<div style="background:${BORDER_COLOR};width:2px;height:30px;margin:0 14px;border-radius: 2px;"/>` },
        { value: 2, content: `<div style="background:${BORDER_COLOR};width:4px;height:30px;margin:0 13px;border-radius: 2px;"/>` },
        { value: 4, content: `<div style="background:${BORDER_COLOR};width:8px;height:30px;margin:0 11px;border-radius: 2px;"/>` },
        { value: 8, content: `<div style="background:${BORDER_COLOR};width:16px;height:30px;margin:0 8px;border-radius: 2px;"/>` }
    ],

    router: [
        {
            value: 'normal',
            content: `<p style="background:${BORDER_COLOR};width:2px;height:30px;margin:0 14px;border-radius: 2px;"/>`,
            attrs: {
                '.select-button-group-button': {
                    'data-tooltip': 'Normal',
                    'data-tooltip-position': 'right',
                    'data-tooltip-position-selector': '.inspector-container'
                }
            }
        },
        {
            value: 'orthogonal',
            content: `<p style="width:20px;height:30px;margin:0 5px;border-bottom: 2px solid ${BORDER_COLOR};border-left: 2px solid ${BORDER_COLOR};"/>`,
            attrs: {
                '.select-button-group-button': {
                    'data-tooltip': 'Orthogonal',
                    'data-tooltip-position': 'right',
                    'data-tooltip-position-selector': '.inspector-container'
                }
            }
        },
        {
            value: 'rightAngle',
            content: `<p style="width:20px;height:30px;margin:0 5px;border: 2px solid ${BORDER_COLOR};border-top: none;"/>`,
            attrs: {
                '.select-button-group-button': {
                    'data-tooltip': 'Right Angle',
                    'data-tooltip-position': 'right',
                    'data-tooltip-position-selector': '.inspector-container'
                }
            }
        }
    ],

    connector: [
        {
            value: 'normal',
            content: `<p style="width:20px;height:20px;margin:5px;border-top:2px solid ${BORDER_COLOR};border-left:2px solid ${BORDER_COLOR};"/>`,
            attrs: {
                '.select-button-group-button': {
                    'data-tooltip': 'Normal',
                    'data-tooltip-position': 'right',
                    'data-tooltip-position-selector': '.inspector-container'
                }
            }
        },
        {
            value: 'rounded',
            content: `<p style="width:20px;height:20px;margin:5px;border-top-left-radius:30%;border-top:2px solid ${BORDER_COLOR};border-left:2px solid ${BORDER_COLOR};"/>`,
            attrs: {
                '.select-button-group-button': {
                    'data-tooltip': 'Rounded',
                    'data-tooltip-position': 'right',
                    'data-tooltip-position-selector': '.inspector-container'
                }
            }
        },
        {
            value: 'smooth',
            content: `<p style="width:20px;height:20px;margin:5px;border-top-left-radius:100%;border-top:2px solid ${BORDER_COLOR};border-left:2px solid ${BORDER_COLOR};"/>`,
            attrs: {
                '.select-button-group-button': {
                    'data-tooltip': 'Smooth',
                    'data-tooltip-position': 'right',
                    'data-tooltip-position-selector': '.inspector-container'
                }
            }
        }
    ],

    labelPosition: [
        { value: 30, content: 'Close to source' },
        { value: 0.5, content: 'In the middle' },
        { value: -30, content: 'Close to target' },
    ],

    portMarkup: [{
        value: [{
            tagName: 'rect',
            selector: 'portBody',
            attributes: {
                'width': 20,
                'height': 20,
                'x': -10,
                'y': -10
            }
        }],
        content: 'Rectangle'
    }, {
        value: [{
            tagName: 'circle',
            selector: 'portBody',
            attributes: {
                'r': 10
            }
        }],
        content: 'Circle'
    }, {
        value: [{
            tagName: 'path',
            selector: 'portBody',
            attributes: {
                'd': 'M -10 -10 10 -10 0 10 z'
            }
        }],
        content: 'Triangle'
    }]
};

export const inspectorDefinitions: Record<string, { inputs: any, groups: any }> = {
    'app.Link': {
        inputs: {
            attrs: {
                line: {
                    strokeWidth: {
                        type: 'select-button-group',
                        options: options.strokeWidth,
                        group: 'connection',
                        label: 'Link thickness',
                        when: { ne: { 'attrs/line/stroke': 'transparent' }},
                        index: 5
                    },
                    strokeDasharray: {
                        type: 'select-box',
                        options: options.strokeStyle,
                        group: 'connection',
                        label: 'Link style',
                        when: { ne: { 'attrs/line/stroke': 'transparent' }},
                        index: 6
                    },
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        group: 'connection',
                        label: 'Fill',
                        index: 7
                    },
                    sourceMarker: {
                        d: {
                            type: 'select-box',
                            options: options.arrowheadSize,
                            group: 'marker-source',
                            label: 'Source arrowhead',
                            index: 1
                        },
                        fill: {
                            type: 'color-palette',
                            options: options.colorPaletteReset,
                            group: 'marker-source',
                            label: 'Fill',
                            when: { ne: { 'attrs/line/sourceMarker/d': 'M 0 0 0 0' }},
                            index: 2
                        }
                    },
                    targetMarker: {
                        d: {
                            type: 'select-box',
                            options: options.arrowheadSize,
                            group: 'marker-target',
                            label: 'Target arrowhead',
                            index: 1
                        },
                        fill: {
                            type: 'color-palette',
                            options: options.colorPaletteReset,
                            group: 'marker-target',
                            label: 'Fill',
                            when: { ne: { 'attrs/line/targetMarker/d': 'M 0 0 0 0' }},
                            index: 2
                        }
                    }
                }
            },
            router: {
                name: {
                    type: 'select-button-group',
                    options: options.router,
                    group: 'connection',
                    label: 'Connection type',
                    index: 1
                },
                args: {
                    sourceDirection: {
                        type: 'select-box',
                        options: options.side,
                        placeholder: 'Pick a side',
                        group: 'connection',
                        label: 'Source anchor side',
                        when: { eq: { 'router/name': 'rightAngle' }, otherwise: { unset: true }},
                        index: 2
                    },
                    targetDirection: {
                        type: 'select-box',
                        options: options.side,
                        placeholder: 'Pick a side',
                        group: 'connection',
                        label: 'Target anchor side',
                        when: { eq: { 'router/name': 'rightAngle' }, otherwise: { unset: true }},
                        index: 3
                    }
                }
            },
            connector: {
                name: {
                    type: 'select-button-group',
                    options: options.connector,
                    group: 'connection',
                    label: 'Connection style',
                    index: 4
                }
            },
            labels: {
                type: 'list',
                group: 'labels',
                label: 'Labels',
                attrs: {
                    label: {
                        'data-tooltip': 'Set (possibly multiple) labels for the link',
                        'data-tooltip-position': 'right',
                        'data-tooltip-position-selector': '.joint-inspector'
                    }
                },
                item: {
                    type: 'object',
                    properties: {
                        attrs: {
                            text: {
                                text: {
                                    type: 'content-editable',
                                    label: 'text',
                                    defaultValue: 'label',
                                    index: 1,
                                    attrs: {
                                        label: {
                                            'data-tooltip': 'Set text of the label',
                                            'data-tooltip-position': 'right',
                                            'data-tooltip-position-selector': '.joint-inspector'
                                        }
                                    }
                                },
                                fill: {
                                    type: 'color-palette',
                                    options: options.colorPaletteReset,
                                    defaultValue: '#353535',
                                    label: 'Text Color',
                                    index: 5
                                }
                            },
                            rect: {
                                fill: {
                                    type: 'color-palette',
                                    options: options.colorPaletteReset,
                                    defaultValue: '#FFFFFF',
                                    label: 'Fill',
                                    index: 3
                                },
                                stroke: {
                                    type: 'color-palette',
                                    options: options.colorPaletteReset,
                                    defaultValue: '#353535',
                                    label: 'Outline',
                                    index: 4
                                }
                            }
                        },
                        position: {
                            type: 'select-box',
                            options: options.labelPosition || [],
                            selectBoxOptionsClass: 'list-select-box',
                            defaultValue: 0.5,
                            label: 'Position',
                            placeholder: 'Custom',
                            index: 2,
                            attrs: {
                                label: {
                                    'data-tooltip': 'Position the label relative to the source of the link',
                                    'data-tooltip-position': 'right',
                                    'data-tooltip-position-selector': '.joint-inspector'
                                }
                            }
                        }
                    }
                }
            }
        },
        groups: {
            connection: {
                label: 'Connection',
                index: 1
            },
            'marker-source': {
                label: 'Source marker',
                index: 2
            },
            'marker-target': {
                label: 'Target marker',
                index: 3
            },
            labels: {
                label: 'Labels',
                index: 4
            }
        }
    },
    'standard.Rectangle': {
        inputs: {
            attrs: {
                label: {
                    text: {
                        type: 'content-editable',
                        label: 'Text',
                        group: 'text',
                        index: 1
                    },
                    fontSize: {
                        type: 'range',
                        min: 5,
                        max: 80,
                        unit: 'px',
                        label: 'Font size',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 2
                    },
                    fontFamily: {
                        type: 'select-box',
                        options: options.fontFamily,
                        label: 'Font family',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 3
                    },
                    fontWeight: {
                        type: 'select-box',
                        options: options.fontWeight,
                        label: 'Font thickness',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 4
                    },
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Text Color',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 5
                    }
                },
                body: {
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Fill',
                        group: 'presentation',
                        index: 1
                    },
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Outline',
                        group: 'presentation',
                        index: 2
                    },
                    strokeWidth: {
                        type: 'range',
                        min: 0,
                        max: 30,
                        step: 1,
                        unit: 'px',
                        label: 'Outline thickness',
                        group: 'presentation',
                        when: { ne: { 'attrs/body/stroke': 'transparent' }},
                        index: 3
                    },
                    strokeDasharray: {
                        type: 'select-box',
                        options: options.strokeStyle,
                        label: 'Outline style',
                        group: 'presentation',
                        when: {
                            and: [
                                { ne: { 'attrs/body/stroke': 'transparent' }},
                                { ne: { 'attrs/body/strokeWidth': 0 }}
                            ]
                        },
                        index: 4
                    }
                }
            }
        },
        groups: {
            presentation: {
                label: 'Presentation',
                index: 1
            },
            text: {
                label: 'Text',
                index: 2
            }
        }
    },
    'standard.Ellipse': {
        inputs: {
            attrs: {
                label: {
                    text: {
                        type: 'content-editable',
                        label: 'Text',
                        group: 'text',
                        index: 1
                    },
                    fontSize: {
                        type: 'range',
                        min: 5,
                        max: 80,
                        unit: 'px',
                        label: 'Font size',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 2
                    },
                    fontFamily: {
                        type: 'select-box',
                        options: options.fontFamily,
                        label: 'Font family',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 3
                    },
                    fontWeight: {
                        type: 'select-box',
                        options: options.fontWeight,
                        label: 'Font thickness',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 4
                    },
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Text Color',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 5
                    }
                },
                body: {
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Fill',
                        group: 'presentation',
                        index: 1
                    },
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Outline',
                        group: 'presentation',
                        index: 2
                    },
                    strokeWidth: {
                        type: 'range',
                        min: 0,
                        max: 30,
                        step: 1,
                        unit: 'px',
                        label: 'Outline thickness',
                        group: 'presentation',
                        when: { ne: { 'attrs/body/stroke': 'transparent' }},
                        index: 3
                    },
                    strokeDasharray: {
                        type: 'select-box',
                        options: options.strokeStyle,
                        label: 'Outline style',
                        group: 'presentation',
                        when: {
                            and: [
                                { ne: { 'attrs/body/stroke': 'transparent' }},
                                { ne: { 'attrs/body/stroke-width': 0 }}
                            ]
                        },
                        index: 4
                    }
                }
            }
        },
        groups: {
            presentation: {
                label: 'Presentation',
                index: 1
            },
            text: {
                label: 'Text',
                index: 2
            }
        }
    },
    'standard.Polygon': {
        inputs: {
            attrs: {
                label: {
                    text: {
                        type: 'content-editable',
                        label: 'Text',
                        group: 'text',
                        index: 1
                    },
                    fontSize: {
                        type: 'range',
                        min: 5,
                        max: 80,
                        unit: 'px',
                        label: 'Font size',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 2
                    },
                    fontFamily: {
                        type: 'select-box',
                        options: options.fontFamily,
                        label: 'Font family',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 3
                    },
                    fontWeight: {
                        type: 'select-box',
                        options: options.fontWeight,
                        label: 'Font thickness',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 4
                    },
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Text Color',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 5
                    }
                },
                body: {
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Fill',
                        group: 'presentation',
                        index: 1
                    },
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Outline',
                        group: 'presentation',
                        index: 2
                    },
                    strokeWidth: {
                        type: 'range',
                        min: 0,
                        max: 30,
                        step: 1,
                        unit: 'px',
                        label: 'Outline thickness',
                        group: 'presentation',
                        when: { ne: { 'attrs/body/stroke': 'transparent' }},
                        index: 3
                    },
                    strokeDasharray: {
                        type: 'select-box',
                        options: options.strokeStyle,
                        label: 'Outline style',
                        group: 'presentation',
                        when: {
                            and: [
                                { ne: { 'attrs/body/stroke': 'transparent' }},
                                { ne: { 'attrs/body/strokeWidth': 0 }}
                            ]
                        },
                        index: 4
                    }
                }
            }
        },
        groups: {
            presentation: {
                label: 'Presentation',
                index: 1
            },
            text: {
                label: 'Text',
                index: 2
            }
        }
    },
    'standard.Polyline': {
        inputs: {
            attrs: {
                body: {
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Fill',
                        group: 'presentation',
                        index: 1
                    },
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Outline',
                        group: 'presentation',
                        index: 2
                    },
                    strokeWidth: {
                        type: 'range',
                        min: 0,
                        max: 30,
                        step: 1,
                        unit: 'px',
                        label: 'Thickness',
                        group: 'presentation',
                        index: 3
                    },
                    strokeDasharray: {
                        type: 'select-box',
                        options: options.strokeStyle,
                        label: 'Style',
                        group: 'presentation',
                        when: { ne: { 'attrs/line/strokeWidth': 0 }},
                        index: 4
                    }
                },
                label: {
                    text: {
                        type: 'content-editable',
                        label: 'Text',
                        group: 'text',
                        index: 1
                    },
                    fontSize: {
                        type: 'range',
                        min: 5,
                        max: 80,
                        unit: 'px',
                        label: 'Font size',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 2
                    },
                    fontFamily: {
                        type: 'select-box',
                        options: options.fontFamily,
                        label: 'Font family',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 3
                    },
                    fontWeight: {
                        type: 'select-box',
                        options: options.fontWeight,
                        label: 'Font thickness',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 4
                    },
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Text Color',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 5
                    }
                }
            }
        },
        groups: {
            presentation: {
                label: 'Presentation',
                index: 1
            },
            text: {
                label: 'Text',
                index: 2
            }
        }
    },
    'standard.Path': {
        inputs: {
            attrs: {
                body: {
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Color',
                        group: 'presentation',
                        index: 1
                    },
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Outline',
                        group: 'presentation',
                        index: 2
                    },
                    strokeWidth: {
                        type: 'range',
                        min: 0,
                        max: 30,
                        step: 1,
                        unit: 'px',
                        label: 'Thickness',
                        group: 'presentation',
                        index: 3
                    },
                    strokeDasharray: {
                        type: 'select-box',
                        options: options.strokeStyle,
                        label: 'Style',
                        group: 'presentation',
                        when: { ne: { 'attrs/body/strokeWidth': 0 }},
                        index: 4
                    }
                },
                label: {
                    text: {
                        type: 'content-editable',
                        label: 'Text',
                        group: 'text',
                        index: 1
                    },
                    fontSize: {
                        type: 'range',
                        min: 5,
                        max: 80,
                        unit: 'px',
                        label: 'Font size',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 2
                    },
                    fontFamily: {
                        type: 'select-box',
                        options: options.fontFamily,
                        label: 'Font family',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 3
                    },
                    fontWeight: {
                        type: 'select-box',
                        options: options.fontWeight,
                        label: 'Font thickness',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 4
                    },
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Text Color',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 5
                    }
                }
            }
        },
        groups: {
            presentation: {
                label: 'Presentation',
                index: 1
            },
            text: {
                label: 'Text',
                index: 2
            }
        }
    },
    'standard.Image': {
        inputs: {
            attrs: {
                label: {
                    text: {
                        type: 'content-editable',
                        label: 'Text',
                        group: 'text',
                        index: 1
                    },
                    fontSize: {
                        type: 'range',
                        min: 5,
                        max: 80,
                        unit: 'px',
                        label: 'Font size',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 2
                    },
                    fontFamily: {
                        type: 'select-box',
                        options: options.fontFamily,
                        label: 'Font family',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 3
                    },
                    fontWeight: {
                        type: 'select-box',
                        options: options.fontWeight,
                        label: 'Font thickness',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 4
                    },
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Text Color',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 5
                    }
                },
                image: {
                    xlinkHref: {
                        type: 'image-picker',
                        label: 'Image',
                        group: 'presentation',
                        index: 1
                    }
                }
            }
        },
        groups: {
            presentation: {
                label: 'Presentation',
                index: 1
            },
            text: {
                label: 'Text',
                index: 2
            }
        }
    },
    'standard.EmbeddedImage': {
        inputs: {
            attrs: {
                label: {
                    text: {
                        type: 'content-editable',
                        label: 'Text',
                        group: 'text',
                        index: 1
                    },
                    fontSize: {
                        type: 'range',
                        min: 5,
                        max: 80,
                        unit: 'px',
                        label: 'Font size',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 2
                    },
                    fontFamily: {
                        type: 'select-box',
                        options: options.fontFamily,
                        label: 'Font family',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 3
                    },
                    fontWeight: {
                        type: 'select-box',
                        options: options.fontWeight,
                        label: 'Font thickness',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 4
                    },
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Text Color',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 5
                    }
                },
                body: {
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Color',
                        group: 'presentation',
                        index: 1
                    },
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Outline',
                        group: 'presentation',
                        index: 2
                    },
                    strokeWidth: {
                        type: 'range',
                        min: 0,
                        max: 30,
                        step: 1,
                        unit: 'px',
                        label: 'Outline thickness',
                        group: 'presentation',
                        when: { ne: { 'attrs/body/stroke': 'transparent' }},
                        index: 3
                    },
                    strokeDasharray: {
                        type: 'select-box',
                        options: options.strokeStyle,
                        label: 'Outline style',
                        group: 'presentation',
                        when: {
                            and: [
                                { ne: { 'attrs/body/stroke': 'transparent' }},
                                { ne: { 'attrs/body/strokeWidth': 0 }}
                            ]
                        },
                        index: 4
                    }
                },
                image: {
                    xlinkHref: {
                        type: 'image-picker',
                        label: 'Image',
                        group: 'presentation',
                        index: 5
                    }
                }
            }
        },
        groups: {
            presentation: {
                label: 'Presentation',
                index: 2
            },
            text: {
                label: 'Text',
                index: 3
            }
        }
    },
    'standard.HeaderedRectangle': {
        inputs: {
            attrs: {
                header: {
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Color',
                        group: 'header',
                        index: 1
                    },
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Outline',
                        group: 'header',
                        index: 2
                    },
                    strokeWidth: {
                        type: 'range',
                        min: 0,
                        max: 30,
                        step: 1,
                        unit: 'px',
                        label: 'Outline thickness',
                        group: 'header',
                        when: { ne: { 'attrs/header/stroke': 'transparent' }},
                        index: 3
                    },
                    strokeDasharray: {
                        type: 'select-box',
                        options: options.strokeStyle,
                        label: 'Outline style',
                        group: 'header',
                        when: {
                            and: [
                                { ne: { 'attrs/header/stroke': 'transparent' }},
                                { ne: { 'attrs/header/strokeWidth': 0 }}
                            ]
                        },
                        index: 4
                    }
                },
                headerText: {
                    text: {
                        type: 'content-editable',
                        label: 'Text',
                        group: 'headerText',
                        index: 1
                    },
                    fontSize: {
                        type: 'range',
                        min: 5,
                        max: 80,
                        unit: 'px',
                        label: 'Font size',
                        group: 'headerText',
                        when: { ne: { 'attrs/headerText/text': '' }},
                        index: 2
                    },
                    fontFamily: {
                        type: 'select-box',
                        options: options.fontFamily,
                        label: 'Font family',
                        group: 'headerText',
                        when: { ne: { 'attrs/headerText/text': '' }},
                        index: 3
                    },
                    fontWeight: {
                        type: 'select-box',
                        options: options.fontWeight,
                        label: 'Font thickness',
                        group: 'headerText',
                        when: { ne: { 'attrs/headerText/text': '' }},
                        index: 4
                    },
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Text Color',
                        group: 'headerText',
                        when: { ne: { 'attrs/headerText/text': '' }},
                        index: 5
                    }
                },
                body: {
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Color',
                        group: 'body',
                        index: 1
                    },
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Outline',
                        group: 'body',
                        index: 2
                    },
                    strokeWidth: {
                        type: 'range',
                        min: 0,
                        max: 30,
                        step: 1,
                        unit: 'px',
                        label: 'Outline thickness',
                        group: 'body',
                        when: { ne: { 'attrs/body/stroke': 'transparent' }},
                        index: 3
                    },
                    strokeDasharray: {
                        type: 'select-box',
                        options: options.strokeStyle,
                        label: 'Outline style',
                        group: 'body',
                        when: {
                            and: [
                                { ne: { 'attrs/body/stroke': 'transparent' }},
                                { ne: { 'attrs/body/strokeWidth': 0 }}
                            ]
                        },
                        index: 4
                    }
                },
                bodyText: {
                    text: {
                        type: 'content-editable',
                        label: 'Text',
                        group: 'bodyText',
                        index: 1
                    },
                    fontSize: {
                        type: 'range',
                        min: 5,
                        max: 80,
                        unit: 'px',
                        label: 'Font size',
                        group: 'bodyText',
                        when: { ne: { 'attrs/bodyText/text': '' }},
                        index: 2
                    },
                    fontFamily: {
                        type: 'select-box',
                        options: options.fontFamily,
                        label: 'Font family',
                        group: 'bodyText',
                        when: { ne: { 'attrs/bodyText/text': '' }},
                        index: 3
                    },
                    fontWeight: {
                        type: 'select-box',
                        options: options.fontWeight,
                        label: 'Font thickness',
                        group: 'bodyText',
                        when: { ne: { 'attrs/bodyText/text': '' }},
                        index: 4
                    },
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Text Color',
                        group: 'bodyText',
                        when: { ne: { 'attrs/boduText/text': '' }},
                        index: 5
                    }
                }
            }
        },
        groups: {
            header: {
                label: 'Header Presentation',
                index: 1
            },
            headerText: {
                label: 'Header Text',
                index: 2
            },
            body: {
                label: 'Body Presentation',
                index: 3
            },
            bodyText: {
                label: 'Body Text',
                index: 4
            }
        }
    },
    'standard.InscribedImage': {
        inputs: {
            attrs: {
                label: {
                    text: {
                        type: 'content-editable',
                        label: 'Text',
                        group: 'text',
                        index: 1
                    },
                    fontSize: {
                        type: 'range',
                        min: 5,
                        max: 80,
                        unit: 'px',
                        label: 'Font size',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 2
                    },
                    fontFamily: {
                        type: 'select-box',
                        options: options.fontFamily,
                        label: 'Font family',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 3
                    },
                    fontWeight: {
                        type: 'select-box',
                        options: options.fontWeight,
                        label: 'Font thickness',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 4
                    },
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Text Color',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 5
                    }
                },
                background: {
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Color',
                        group: 'presentation',
                        index: 2
                    }
                },
                border: {
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Outline',
                        group: 'presentation',
                        index: 3
                    },
                    strokeWidth: {
                        type: 'range',
                        min: 0,
                        max: 10,
                        step: 1,
                        unit: 'px',
                        label: 'Outline thickness',
                        group: 'presentation',
                        when: { ne: { 'attrs/border/stroke': 'transparent' }},
                        index: 4
                    }
                },
                image: {
                    xlinkHref: {
                        type: 'image-picker',
                        label: 'Image',
                        group: 'presentation',
                        index: 5
                    }
                }
            },
        },
        groups: {
            presentation: {
                label: 'Presentation',
                index: 1
            },
            text: {
                label: 'Text',
                index: 2
            }
        }
    },
    'standard.Cylinder': {
        inputs: {
            attrs: {
                label: {
                    text: {
                        type: 'content-editable',
                        label: 'Text',
                        group: 'text',
                        index: 1
                    },
                    fontSize: {
                        type: 'range',
                        min: 5,
                        max: 80,
                        unit: 'px',
                        label: 'Font size',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 2
                    },
                    fontFamily: {
                        type: 'select-box',
                        options: options.fontFamily,
                        label: 'Font family',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 3
                    },
                    fontWeight: {
                        type: 'select-box',
                        options: options.fontWeight,
                        label: 'Font thickness',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 4
                    },
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Text Color',
                        group: 'text',
                        when: { ne: { 'attrs/label/text': '' }},
                        index: 5
                    }
                },
                body: {
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Color',
                        group: 'presentation',
                        index: 1
                    },
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Outline',
                        group: 'presentation',
                        index: 2
                    },
                    strokeWidth: {
                        type: 'range',
                        min: 0,
                        max: 30,
                        step: 1,
                        unit: 'px',
                        label: 'Outline thickness',
                        group: 'presentation',
                        when: { ne: { 'attrs/body/stroke': 'transparent' }},
                        index: 3
                    },
                    strokeDasharray: {
                        type: 'select-box',
                        options: options.strokeStyle,
                        label: 'Outline style',
                        group: 'presentation',
                        when: {
                            and: [
                                { ne: { 'attrs/body/stroke': 'transparent' }},
                                { ne: { 'attrs/body/strokeWidth': 0 }}
                            ]
                        },
                        index: 4
                    }
                },
                top: {
                    fill: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Fill',
                        group: 'top',
                        index: 1
                    },
                    stroke: {
                        type: 'color-palette',
                        options: options.colorPalette,
                        label: 'Outline',
                        group: 'top',
                        index: 2
                    },
                    strokeWidth: {
                        type: 'range',
                        min: 0,
                        max: 30,
                        step: 1,
                        unit: 'px',
                        label: 'Outline thickness',
                        group: 'top',
                        when: { ne: { 'attrs/body/stroke': 'transparent' }},
                        index: 3
                    },
                    strokeDasharray: {
                        type: 'select-box',
                        options: options.strokeStyle,
                        label: 'Outline style',
                        group: 'top',
                        when: {
                            and: [
                                { ne: { 'attrs/body/stroke': 'transparent' }},
                                { ne: { 'attrs/body/strokeWidth': 0 }}
                            ]
                        },
                        index: 4
                    }
                }
            }
        },
        groups: {
            presentation: {
                label: 'Presentation',
                index: 1
            },
            top: {
                label: 'Top',
                index: 2
            },
            text: {
                label: 'Text',
                index: 3
            }
        }
    }
};
