import { util, dia, shapes, V } from '@joint/plus';

const grid = 30;

export var ShelfTypes;
(function (ShelfTypes) {
    ShelfTypes["top"] = "TOP";
    ShelfTypes["middle"] = "MIDDLE";
    ShelfTypes["bottom"] = "BOTTOM";
    ShelfTypes["full"] = "FULL";
})(ShelfTypes || (ShelfTypes = {}));

export var ProductCategories;
(function (ProductCategories) {
    ProductCategories["chips"] = "CHIPS";
    ProductCategories["nachos"] = "NACHOS";
    ProductCategories["bombay_mix"] = "BOMBAY MIX";
    ProductCategories["snacks"] = "SNACKS";
    ProductCategories["candy"] = "CANDY";
    ProductCategories["sports_drink"] = "SPORTS DRINK";
    ProductCategories["soda"] = "SODA";
    ProductCategories["cordial"] = "CORDIAL";
    ProductCategories["cola"] = "COLA";
    ProductCategories["pop"] = "POP";
    ProductCategories["ice_tea"] = "ICE TEA";
})(ProductCategories || (ProductCategories = {}));

export const storeItemsConfig = {
    grid,
    shelves: [
        { width: 10, height: 5, shelfType: ShelfTypes.full },
        { width: 10, height: 5, shelfType: ShelfTypes.top },
        { width: 10, height: 5, shelfType: ShelfTypes.middle },
        { width: 10, height: 5, shelfType: ShelfTypes.bottom }
    ],
    products: {
        chips: [
            { width: 2, height: 3, name: 'chips1', image: 'assets/products/chips/1.svg' },
            { width: 2, height: 3, name: 'chips2', image: 'assets/products/chips/2.svg' },
            { width: 2, height: 3, name: 'chips3', image: 'assets/products/chips/3.svg' }
        ],
        nachos: [
            { width: 2, height: 3, name: 'nachos1', image: 'assets/products/nachos/1.svg' },
            { width: 2, height: 3, name: 'nachos2', image: 'assets/products/nachos/2.svg' },
            { width: 2, height: 3, name: 'nachos3', image: 'assets/products/nachos/3.svg' }
        ],
        bombay_mix: [
            { width: 2, height: 3, name: 'bombay_mix1', image: 'assets/products/bombay_mix/1.svg' },
            { width: 2, height: 3, name: 'bombay_mix2', image: 'assets/products/bombay_mix/2.svg' },
            { width: 2, height: 3, name: 'bombay_mix3', image: 'assets/products/bombay_mix/3.svg' }
        ],
        snacks: [
            { width: 2, height: 2, name: 'nuts', image: 'assets/products/snacks/1.svg' },
            { width: 2, height: 2, name: 'biscuit', image: 'assets/products/snacks/2.svg' },
            { width: 2, height: 3, name: 'chocolate', image: 'assets/products/snacks/3.svg' },
        ],
        candy: [
            { width: 2, height: 3, name: 'candy1', image: 'assets/products/candy/1.svg' },
            { width: 2, height: 3, name: 'candy2', image: 'assets/products/candy/2.svg' },
            { width: 2, height: 3, name: 'candy3', image: 'assets/products/candy/3.svg' }
        ],
        sports_drink: [
            { width: 1, height: 3, name: 'sports_drink1', image: 'assets/products/sports_drink/1.svg' },
            { width: 1, height: 3, name: 'sports_drink2', image: 'assets/products/sports_drink/2.svg' },
            { width: 1, height: 3, name: 'sports_drink3', image: 'assets/products/sports_drink/3.svg' },
            { width: 1, height: 3, name: 'sports_drink4', image: 'assets/products/sports_drink/4.svg' },
            { width: 1, height: 3, name: 'sports_drink5', image: 'assets/products/sports_drink/5.svg' }
        ],
        soda: [
            { width: 1, height: 2, name: 'soda1', image: 'assets/products/soda/1.svg' },
            { width: 1, height: 2, name: 'soda2', image: 'assets/products/soda/2.svg' },
            { width: 1, height: 2, name: 'soda3', image: 'assets/products/soda/3.svg' }
        ],
        cordial: [
            { width: 1, height: 4, name: 'cordial1', image: 'assets/products/cordial/1.svg' },
            { width: 1, height: 4, name: 'cordial2', image: 'assets/products/cordial/2.svg' },
            { width: 1, height: 4, name: 'cordial3', image: 'assets/products/cordial/3.svg' }
        ],
        cola: [
            { width: 1, height: 3, name: 'cola1', image: 'assets/products/cola/1.svg' },
            { width: 1, height: 3, name: 'cola2', image: 'assets/products/cola/2.svg' }
        ],
        pop: [
            { width: 1, height: 3, name: 'pop1', image: 'assets/products/pop/1.svg' },
            { width: 1, height: 3, name: 'pop2', image: 'assets/products/pop/2.svg' },
            { width: 1, height: 3, name: 'pop3', image: 'assets/products/pop/3.svg' }
        ],
        ice_tea: [
            { width: 1, height: 3, name: 'ice_tea1', image: 'assets/products/ice_tea/1.svg' },
            { width: 1, height: 3, name: 'ice_tea2', image: 'assets/products/ice_tea/2.svg' },
            { width: 1, height: 3, name: 'ice_tea3', image: 'assets/products/ice_tea/3.svg' },
            { width: 1, height: 3, name: 'ice_tea4', image: 'assets/products/ice_tea/4.svg' }
        ]
    }
};


export const getAllProducts = () => {
    const products = {};
    Object.keys(storeItemsConfig.products).forEach((category) => {
        const productCategory = storeItemsConfig.products[category];
        productCategory.forEach((product) => {
            const productShape = ProductElement.create(product);
            products[category] = products[category] || [];
            products[category].push(productShape);
        });
    });
    return products;
};

export const getAllShelves = () => {
    return Object.values(storeItemsConfig.shelves).map(shelf => {
        switch (shelf.shelfType) {
            case ShelfTypes.full:
                return ShelfElement.create(shelf)
                    .translate(20, 50)
                    .attr(['top', 'display'], 'block')
                    .attr(['bottom', 'display'], 'block');
            case ShelfTypes.top:
                return ShelfElement.create(shelf)
                    .attr(['top', 'display'], 'block')
                    .translate(20, 280);
            case ShelfTypes.bottom:
                return ShelfElement.create(shelf)
                    .attr(['bottom', 'display'], 'block')
                    .translate(20, 660);
            case ShelfTypes.middle:
            default:
                return ShelfElement.create(shelf)
                    .translate(20, 470);
        }
    });
};

const calcSize = (size) => {
    const { grid: itemsGrid } = storeItemsConfig;
    return {
        width: size.width * itemsGrid,
        height: size.height * itemsGrid
    };
};

const bg = '#DBDFEE';
const fg = '#CACCD4';

export class ShelfElement extends dia.Element {
    constructor() {
        super(...arguments);
        
        this.markup = [{
                tagName: 'g',
                selector: 'top',
                children: [{
                        tagName: 'rect',
                        selector: 'topBackground'
                    }, {
                        tagName: 'rect',
                        selector: 'topForeground'
                    }]
            }, {
                tagName: 'rect',
                selector: 'bottom'
            }, {
                tagName: 'rect',
                selector: 'middle'
            }];
    }
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'app.Shelf', attrs: {
                root: {
                    containerSelector: 'middle'
                },
                top: {
                    display: 'none',
                    transform: 'translate(0, -30)'
                },
                topForeground: {
                    width: 'calc(w - 2)',
                    y: 1,
                    x: 1,
                    height: 25,
                    rx: 4,
                    ry: 4,
                    fillPattern: 'assets/shelf/marquee.svg',
                },
                topBackground: {
                    width: 'calc(w)',
                    height: 35,
                    rx: 4,
                    ry: 4,
                    fill: bg,
                    stroke: fg,
                    strokeWidth: 2
                },
                middle: {
                    height: 'calc(h)',
                    width: 'calc(w)',
                    stroke: fg,
                    fill: '#F5F6FA',
                    strokeWidth: 2,
                },
                bottom: {
                    display: 'none',
                    width: 'calc(w)',
                    y: 'calc(h - 5)',
                    height: 20,
                    rx: 4,
                    ry: 4,
                    fill: bg,
                    strokeWidth: 2,
                    stroke: fg
                }
            } });
    }
    
    getCurrentSizeLabel() {
        const size = this.get('size');
        return `${size.width / grid} x ${size.height / grid}`;
    }
    
    getFramePadding() {
        switch (this.get('shelfType')) {
            case ShelfTypes.full: {
                return { left: 7, top: 37, right: 7, bottom: 22 };
            }
            case ShelfTypes.top: {
                return { left: 7, top: 37, right: 7, bottom: 7 };
            }
            case ShelfTypes.bottom: {
                return { left: 7, top: 7, right: 7, bottom: 22 };
            }
            default: {
                return util.normalizeSides(7);
            }
        }
    }
    
    getResizeGrid() {
        return undefined;
    }
    
    static create(shelf) {
        const { shelfType } = shelf;
        return new this({
            shelfType,
            size: calcSize(shelf)
        });
    }
}

ShelfElement.attributes = {
    'fill-pattern': {
        set: function (image) {
            const { paper } = this;
            const MARGIN = 0;
            const width = 60;
            const height = 26;
            const patternId = image + paper.cid;
            if (!paper.isDefined(patternId)) {
                V('pattern', {
                    'id': patternId,
                    'width': width,
                    'height': height,
                    'patternUnits': 'userSpaceOnUse'
                }, [
                    V('rect', {
                        'y': 4,
                        'width': width,
                        'height': height - 8,
                        'fill': '#AFB6D6'
                    }),
                    V('image', {
                        'xlink:href': image,
                        'preserveAspectRatio': 'none',
                        'x': MARGIN / 2,
                        'y': MARGIN / 2,
                        'width': width - MARGIN,
                        'height': height - MARGIN
                    })
                ]).appendTo(paper.defs);
            }
            return {
                'fill': `url(#${patternId})`
            };
        }
    }
};

export class ProductElement extends dia.Element {
    constructor() {
        super(...arguments);
        
        this.markup = [{
                tagName: 'rect',
                selector: 'body'
            }];
    }
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'app.Product', attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    strokeWidth: 2,
                    stroke: 'none'
                }
            } });
    }
    
    match(group, keyword) {
        if (this.get('productType').includes(keyword.toLowerCase()))
            return true;
        if (ProductCategories[group].includes(keyword.toUpperCase()))
            return true;
        return false;
    }
    
    getCurrentSizeLabel() {
        const size = this.get('size');
        const productSize = this.get('productSize');
        return `${size.width / grid / productSize.width} x ${size.height / grid / productSize.height}`;
    }
    
    getFramePadding() {
        return util.normalizeSides(0);
    }
    
    getResizeGrid() {
        const { width, height } = this.get('productSize');
        return {
            width: width * grid,
            height: height * grid
        };
    }
    
    static create(product) {
        const { name, width, height, image } = product;
        return new this({
            productType: name,
            productSize: { width, height },
            size: calcSize(product),
            attrs: {
                body: {
                    productImage: image
                }
            }
        });
    }
}

ProductElement.attributes = {
    'product-image': {
        set: function (image) {
            const { paper, model } = this;
            const MARGIN = 8;
            const { width, height } = calcSize(model.get('productSize'));
            const patternId = image + paper.cid;
            if (!paper.isDefined(patternId)) {
                V('pattern', {
                    'id': patternId,
                    'width': width,
                    'height': height,
                    'patternUnits': 'userSpaceOnUse'
                }, [
                    /* Optional background for images
                    V('rect', {
                        'x': 2,
                        'y': 2,
                        'width': width - 4,
                        'height': height - 4,
                        'fill': '#FFFFFF'
                    }),
                    */
                    V('image', {
                        'xlink:href': image,
                        'preserveAspectRatio': 'none',
                        'x': MARGIN / 2,
                        'y': MARGIN / 2,
                        'width': width - MARGIN,
                        'height': height - MARGIN
                    })
                ]).appendTo(paper.defs);
            }
            return {
                'fill': `url(#${patternId})`
            };
        }
    }
};

Object.assign(shapes, {
    app: {
        Shelf: ShelfElement,
        Product: ProductElement
    }
});
