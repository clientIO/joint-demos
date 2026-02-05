import { dia, shapes, util } from '@joint/plus';

export class Table extends shapes.standard.HeaderedRecord {
    defaults() {
        return util.defaultsDeep({
            type: 'app.Table',
            columns: [],
            padding: { top: 40, bottom: 10, left: 10, right: 10 },
            size: { width: 260 },
            itemMinLabelWidth: 80,
            itemHeight: 25,
            itemOffset: 0,
            itemOverflow: true,
            attrs: {
                root: {
                    magnet: false
                },
                body: {
                    stroke: '#FFF',
                    fill: '#FFF',
                    strokeWidth: 1
                },
                tabColor: {
                    x: -1,
                    y: -5,
                    width: 'calc(w+2)',
                    height: 5,
                    stroke: 'none',
                    fill: '#6C6C6C',
                    strokeWidth: 1
                },
                header: {
                    fill: '#F8FAFC',
                    stroke: '#F8FAFC',
                    strokeWidth: 1,
                },
                headerLabel: {
                    fill: '#636363',
                    fontWeight: 'bold',
                    fontFamily: 'sans-serif',
                    textWrap: {
                        ellipsis: true,
                        height: 30
                    }
                },
                itemBodies_0: {
                    // SVGRect which is an active magnet
                    // Do not use `true` to prevent CSS effects on hover
                    magnet: 'item'
                },
                group_1: {
                    // let the pointer events propagate to the group_0
                    // which spans over 2 columns
                    pointerEvents: 'none'
                },
                itemLabels: {
                    fontFamily: 'sans-serif',
                    fill: '#636363',
                    pointerEvents: 'none'
                },
                itemLabels_1: {
                    fill: '#9C9C9C',
                    textAnchor: 'end',
                    x: 'calc(0.5 * w - 10)'
                },
                itemLabels_keys: {
                    x: 'calc(0.5 * w - 30)'
                },
                iconsGroup_1: {
                    // SVGGroup does not accept `x` attribute
                    refX: '50%',
                    refX2: -26
                }
            }
        }, super.defaults);
    }
    
    preinitialize() {
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
    
    initialize(...args) {
        super.initialize(...args);
        this.on('change', () => this.onColumnsChange());
        this._setColumns(this.get('columns'));
    }
    
    onColumnsChange() {
        if (this.hasChanged('columns')) {
            this._setColumns(this.get('columns'));
        }
    }
    
    setName(name, opt) {
        return this.attr(['headerLabel', 'text'], name, opt);
    }
    
    getName() {
        return this.attr(['headerLabel', 'text']);
    }
    
    setTabColor(color) {
        return this.attr(['tabColor', 'fill'], color);
    }
    
    getTabColor() {
        return this.attr(['tabColor', 'fill']);
    }
    
    setColumns(data) {
        this.set('columns', data);
        return this;
    }
    
    toJSON() {
        const json = super.toJSON();
        // keeping only the `columns` attribute
        delete json.items;
        return json;
    }
    
    _setColumns(data = []) {
        const names = [];
        const values = [];
        
        data.forEach((item, i) => {
            
            if (!item.name)
                return;
            
            names.push({
                id: item.name,
                label: item.name,
                span: 2
            });
            
            const value = {
                id: `${item.type}_${i}`,
                label: item.type
            };
            if (item.key) {
                Object.assign(value, {
                    group: 'keys',
                    icon: 'assets/key.svg'
                });
            }
            values.push(value);
        });
        
        this.set('items', [names, values]);
        this.removeInvalidLinks();
        
        return this;
    }
}

export class Link extends dia.Link {
    constructor() {
        super(...arguments);
        this.markup = [{
                tagName: 'path',
                selector: 'wrapper',
                attributes: {
                    'fill': 'none',
                    'stroke': 'transparent'
                }
            }, {
                tagName: 'path',
                selector: 'line',
                attributes: {
                    'fill': 'none'
                }
            }];
    }
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'app.Link', z: -1, attrs: {
                wrapper: {
                    connection: true,
                    strokeWidth: 10
                },
                line: {
                    connection: true,
                    stroke: '#A0A0A0',
                    strokeWidth: 2
                }
            } });
    }
}

const TableView = shapes.standard.RecordView;

Object.assign(shapes, {
    app: {
        Table,
        TableView,
        Link
    }
});


