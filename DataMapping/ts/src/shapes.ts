import { shapes, util } from '@joint/plus';

export class Link extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep({
            type: 'mapping.Link',
            z: -1,
            attrs: {
                line: {
                    targetMarker: {
                        'type': 'path',
                        'd': 'M 10 -5 0 0 10 5 z'
                    },
                    sourceMarker: {
                        'type': 'path',
                        'd': 'M 0 -5 10 0 0 5 z'
                    },
                    stroke: '#7C90A6',
                    strokeWidth: 1
                }
            }
        }, super.defaults);
    }
}

export class Constant extends shapes.standard.BorderedRecord {
    defaults() {
        return util.defaultsDeep({
            type: 'mapping.Constant',
            itemHeight: 20,
            itemOffset: 5,
            itemMinLabelWidth: 10,
            itemIcon: { padding: 4 },
            attrs: {
                root: {
                    magnet: false
                },
                body: {
                    stroke: '#EBEEF0'
                },
                itemLabels: {
                    fontSize: 12,
                    fontFamily: 'Sans-serif',
                },
                itemLabels_1: {
                    magnet: true
                },
                itemBodies_0: {
                    stroke: '#7C90A6'
                },
                itemBodies: {
                    stroke: 'none'
                }
            },
            items: [
                [{
                    id: 'icon',
                    icon: 'assets/images/clipboard.svg',
                }],
                [{
                    id: 'value',
                    label: '',
                    span: 2
                }],
                [

                ]
            ]
        }, super.defaults);
    }

    setValue(value: string, opt?: object) {
        return this.prop(['items', 1, 0, 'label'], '"' + value + '"', opt);
    }

    getDefaultItem() {
        return {
            id: util.uuid(),
            label: '""',
            icon: 'assets/images/clipboard.svg'
        };
    }

    getItemTools() {
        return [
            { action: 'edit', content: 'Edit Constant' }
        ];
    }

    getTools() {
        return [
            { action: 'remove', content: warning('Remove Constant') }
        ];
    }

    getInspectorConfig() {
        return {
            label: {
                label: 'Label',
                type: 'content-editable'
            }
        };
    }
}

export class Concat extends shapes.standard.HeaderedRecord {
    defaults() {
        return util.defaultsDeep({
            type: 'mapping.Concat',
            itemHeight: 20,
            itemOffset: 5,
            padding: { top: 35, left: 10, right: 0, bottom: 0 },
            itemMinLabelWidth: 50,
            itemOverflow: true,
            attrs: {
                root: {
                    magnet: false
                },
                body: {
                    stroke: '#EBEEF0'
                },
                header: {
                    height: 35,
                    fill: '#F8FAFC',
                    stroke: '#EBEEF0'
                },
                tabColor: {
                    height: 5,
                    x: 0,
                    y: 0,
                    width: 'calc(w)',
                    fill: '#FF4365',
                    stroke: '#FF4365'
                },
                headerLabel: {
                    y: 5,
                    fontFamily: 'Sans-serif',
                    fontWeight: 300,
                    textWrap: {
                        text: 'concat',
                        ellipsis: true,
                        height: 30
                    }
                },
                itemLabels: {
                    magnet: true,
                    fontSize: 12,
                    fontFamily: 'Sans-serif',
                },
                itemLabels_0: {
                    magnet: 'passive',
                    cursor: 'pointer'
                },
                itemBodies_0: {
                    stroke: '#EBEEF0'
                }
            },
            items: [
                [{
                    id: 'value_1',
                    label: 'Value 1',
                    icon: 'assets/images/link.svg',
                }, {
                    id: 'value_2',
                    label: 'Value 2',
                    icon: 'assets/images/link.svg',
                }, {
                    id: 'value_3',
                    label: 'Value 3',
                    icon: 'assets/images/link.svg',
                }], [{
                    id: 'result',
                    label: 'Result ⇛',
                    height: 40
                }]
            ]
        }, super.defaults);
    }

    preinitialize(): void {
        this.markup = [{
            tagName: 'rect',
            selector: 'body'
        }, {
            tagName: 'rect',
            selector: 'header'
        }, {
            tagName: 'rect',
            selector: 'tabColor'
        }, {
            tagName: 'text',
            selector: 'headerLabel'
        }];
    }

    getNumberOfValues() {
        return this.prop(['items', 0]).length;
    }

    getDefaultItem() {
        return {
            id: util.uuid(),
            label: 'Value ' + (this.getNumberOfValues() + 1),
            icon: 'assets/images/link.svg'
        };
    }

    getItemTools(itemId: string) {
        const groupIndex = this.getItemGroupIndex(itemId);
        if (groupIndex !== 0) return null;
        const tools = [
            { action: 'edit', content: 'Edit Value' },
            { action: 'add-next-sibling', content: 'Add Value' }
        ];
        if (this.getNumberOfValues() > 2) {
            tools.push({ action: 'remove', content: warning('Remove Value') });
        }
        tools.push();
        return tools;
    }

    getTools() {
        return [
            { action: 'add-item', content: 'Add Value' },
            { action: 'remove', content: warning('Remove Concat') }
        ];
    }

    getInspectorConfig(itemId: string) {
        const groupIndex = this.getItemGroupIndex(itemId);
        if (groupIndex !== 0) return null;
        return {
            label: {
                label: 'Label',
                type: 'content-editable'
            }
        };
    }
}

export class GetDate extends shapes.standard.HeaderedRecord {
    defaults() {
        return util.defaultsDeep({
            type: 'mapping.GetDate',
            itemHeight: 20,
            itemOffset: 5,
            padding: { top: 35, left: 10, right: 0, bottom: 0 },
            itemMinLabelWidth: 50,
            itemOverflow: true,
            attrs: {
                root: {
                    magnet: false
                },
                body: {
                    stroke: '#EBEEF0'
                },
                header: {
                    height: 35,
                    fill: '#F8FAFC',
                    stroke: '#EBEEF0'
                },
                tabColor: {
                    height: 5,
                    x: 0,
                    y: 0,
                    width: 'calc(w)',
                    fill: '#00BC9A',
                    stroke: '#00BC9A'
                },
                headerLabel: {
                    y: 5,
                    fontFamily: 'Sans-serif',
                    fontWeight: 300,
                    textWrap: {
                        text: 'get-date',
                        ellipsis: true,
                        height: 30
                    }
                },
                itemLabels: {
                    magnet: true,
                    fontSize: 12,
                    fontFamily: 'Sans-serif',
                },
                itemLabels_0: {
                    magnet: 'passive',
                    cursor: 'pointer'
                },
                itemBodies: {
                    stroke: '#EBEEF0'
                }
            },
            items: [
                [{
                    id: 'value',
                    label: '⇛ Value',
                    height: 60
                }],
                [{
                    id: 'year',
                    label: 'year',
                    icon: 'assets/images/link.svg',
                }, {
                    id: 'month',
                    label: 'month',
                    icon: 'assets/images/link.svg',
                }, {
                    id: 'day',
                    label: 'day',
                    icon: 'assets/images/link.svg',
                }]
            ]
        }, super.defaults);
    }

    preinitialize(): void {
        this.markup = [{
            tagName: 'rect',
            selector: 'body'
        }, {
            tagName: 'rect',
            selector: 'header'
        }, {
            tagName: 'rect',
            selector: 'tabColor'
        }, {
            tagName: 'text',
            selector: 'headerLabel'
        }];
    }

    getDefaultItem() {
        return {
            id: util.uuid(),
            label: 'item',
            icon: 'assets/images/document.svg'
        };
    }

    getItemTools(): void {
        return null;
    }

    getTools() {
        return [
            { action: 'remove', content: warning('Remove GetDate') }
        ];
    }

    getInspectorConfig(): null {
        return null;
    }
}

export class Record extends shapes.standard.HeaderedRecord {
    defaults() {
        return util.defaultsDeep({
            type: 'mapping.Record',
            itemHeight: 20,
            itemOffset: 15,
            itemMinLabelWidth: 70,
            itemAboveViewSelector: 'header',
            itemBelowViewSelector: 'footer',
            padding: { top: 35, left: 15, right: 10, bottom: 10 },
            scrollTop: 0,
            size: { height: 300 },
            itemOverflow: true,
            attrs: {
                root: {
                    magnet: false
                },
                body: {
                    stroke: '#EBEEF0'
                },
                header: {
                    height: 35,
                    fill: '#F8FAFC',
                    stroke: '#EBEEF0'
                },
                tabColor: {
                    height: 5,
                    x: 0,
                    y: 0,
                    width: 'calc(w)',
                    fill: '#4566E5',
                    stroke: '#4566E5'
                },
                headerLabel: {
                    y: 5,
                    fontFamily: 'Sans-serif',
                    fontWeight:  300,
                    textWrap: {
                        ellipsis: true,
                        height: 30
                    }
                },
                footer: {
                    height: 10,
                    x: 0,
                    y: 'calc(h - 10)',
                    width: 'calc(w)',
                    fill: '#F8FAFC',
                    stroke: '#EBEEF0'
                },
                buttonsGroups: {
                    stroke: '#7C90A6'
                },
                forksGroups: {
                    stroke: 'lightgray'
                },
                itemBodies: {
                    itemHighlight: {
                        fill: 'none'
                    }
                },
                itemLabels: {
                    magnet: 'true',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'Sans-serif',
                    itemHighlight: {
                        fill: '#4566E5'
                    }
                },
                itemLabels_disabled: {
                    magnet: null,
                    fill: '#AAAAAA',
                    cursor: 'not-allowed'
                }
            }
        }, super.defaults);
    }

    preinitialize(): void {
        this.markup = [{
            tagName: 'rect',
            selector: 'body'
        }, {
            tagName: 'rect',
            selector: 'header'
        }, {
            tagName: 'rect',
            selector: 'tabColor'
        }, {
            tagName: 'text',
            selector: 'headerLabel'
        }, {
            tagName: 'rect',
            selector: 'footer'
        }];
    }

    setName(name: string, opt?: object) {
        return this.attr(['headerLabel', 'textWrap', 'text'], name, opt);
    }

    getDefaultItem() {
        return {
            id: util.uuid(),
            label: 'new_item',
            icon: 'assets/images/document.svg'
        };
    }

    getItemTools() {
        return [
            { action: 'edit', content: 'Edit Item' },
            { action: 'edit-decorator', content: 'Edit Decorator' },
            { action: 'add-child', content: 'Add Child' },
            { action: 'add-next-sibling', content: 'Add Next Sibling' },
            { action: 'add-prev-sibling', content: 'Add Prev Sibling' },
            { action: 'remove', content: warning('Remove Item') }
        ];
    }

    getTools() {
        return [
            { action: 'add-item', content: 'Add Child' },
            { action: 'remove', content: warning('Remove Record') }
        ];
    }

    getInspectorConfig() {
        return {
            label: {
                label: 'Label',
                type: 'content-editable'
            },
            icon: {
                label: 'Icon',
                type: 'select-button-group',
                options: [{
                    value: 'assets/images/link.svg',
                    content: '<img height="42px" src="assets/images/link.svg"/>'
                }, {
                    value: 'assets/images/document.svg',
                    content: '<img height="42px" src="assets/images/document.svg"/>'
                }, {
                    value: 'assets/images/clipboard.svg',
                    content: '<img height="42px" src="assets/images/clipboard.svg"/>'
                }, {
                    value: 'assets/images/file.svg',
                    content: '<img height="42px" src="assets/images/file.svg"/>'
                }]
            },
            highlighted: {
                label: 'Highlight',
                type: 'toggle'
            }
        };
    }
}

function warning(text: string) {
    return '<span style="color:#fe854f">' + text + '</span>';
}

const ConstantView = shapes.standard.RecordView;
const ConcatView = shapes.standard.RecordView;
const GetDateView = shapes.standard.RecordView;
const RecordView = shapes.standard.RecordView;

Object.assign(shapes, {
    mapping: {
        Link,
        Constant,
        ConstantView,
        Concat,
        ConcatView,
        GetDate,
        GetDateView,
        Record,
        RecordView
    }
});
