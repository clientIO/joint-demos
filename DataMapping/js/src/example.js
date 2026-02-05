import { Link, Constant, Concat, GetDate, Record } from './shapes';

export const loadExample = function (graph) {
    
    const order = new Record({
        items: [[{
                    id: 'file',
                    label: 'File: (default)',
                    icon: 'assets/images/file.svg',
                    highlighted: true,
                    items: [{
                            id: 'order',
                            label: 'Order',
                            icon: 'assets/images/document.svg',
                            items: [{
                                    id: 'order_id',
                                    label: 'id',
                                    icon: 'assets/images/document.svg',
                                }, {
                                    id: 'order_name',
                                    label: 'name',
                                    icon: 'assets/images/document.svg',
                                }, {
                                    id: 'order_email',
                                    label: 'email',
                                    icon: 'assets/images/document.svg',
                                }, {
                                    id: 'order_entry_date',
                                    label: 'entry_date',
                                    icon: 'assets/images/file.svg',
                                    items: [{
                                            id: 'entry_date_year',
                                            label: 'year',
                                            icon: 'assets/images/document.svg',
                                        }, {
                                            id: 'entry_date_month',
                                            label: 'month',
                                            icon: 'assets/images/document.svg',
                                        }, {
                                            id: 'entry_date_day',
                                            label: 'day',
                                            icon: 'assets/images/document.svg',
                                        }]
                                }, {
                                    id: 'address',
                                    label: 'address',
                                    icon: 'assets/images/file.svg',
                                    items: [{
                                            id: 'address_city',
                                            label: 'city',
                                            icon: 'assets/images/document.svg'
                                        }, {
                                            id: 'address_street',
                                            label: 'street',
                                            icon: 'assets/images/document.svg'
                                        }, {
                                            id: 'address_number',
                                            label: 'number',
                                            icon: 'assets/images/document.svg'
                                        }, {
                                            id: 'address_shipping',
                                            label: 'shipping',
                                            icon: 'assets/images/document.svg'
                                        }, {
                                            id: 'address_billing',
                                            label: 'billing',
                                            icon: 'assets/images/document.svg'
                                        }]
                                }]
                        }]
                }]]
    })
        .setName('order')
        .position(780, 200)
        .addTo(graph);
    
    const nanonull = new Record({
        decorators: {
            user_email: 'fx1()',
            address_street: 'fx2()'
        },
        items: [
            [{
                    id: 'orders',
                    label: 'orders',
                    icon: 'assets/images/file.svg',
                    items: [{
                            id: 'order_id',
                            label: 'id',
                            icon: 'assets/images/document.svg',
                        }, {
                            id: 'order_created_at',
                            label: 'created_at',
                            icon: 'assets/images/document.svg',
                        }, {
                            id: 'order_updated_at',
                            label: 'updated_at',
                            icon: 'assets/images/document.svg',
                        }, {
                            id: 'orderedproducts',
                            label: 'orderedproducts',
                            icon: 'assets/images/file.svg',
                            group: 'disabled'
                        }, {
                            id: 'users',
                            label: 'users',
                            icon: 'assets/images/file.svg',
                            items: [{
                                    id: 'user_id',
                                    label: 'id',
                                    icon: 'assets/images/document.svg',
                                }, {
                                    id: 'user_first_name',
                                    label: 'first_name',
                                    icon: 'assets/images/document.svg',
                                }, {
                                    id: 'user_last_name',
                                    label: 'last_name',
                                    icon: 'assets/images/document.svg',
                                }, {
                                    id: 'user_email',
                                    label: 'email',
                                    icon: 'assets/images/document.svg',
                                }, {
                                    id: 'user_created_at',
                                    label: 'created_at',
                                    icon: 'assets/images/document.svg',
                                }, {
                                    id: 'user_updated_at',
                                    label: 'updated_at',
                                    icon: 'assets/images/document.svg',
                                }, {
                                    id: 'addresses',
                                    label: 'addresses',
                                    icon: 'assets/images/file.svg',
                                    items: [{
                                            id: 'address_id',
                                            label: 'id',
                                            icon: 'assets/images/document.svg',
                                        }, {
                                            id: 'address_type',
                                            label: 'type',
                                            icon: 'assets/images/document.svg',
                                        }, {
                                            id: 'address_city',
                                            label: 'city',
                                            icon: 'assets/images/document.svg',
                                        }, {
                                            id: 'address_street',
                                            label: 'street',
                                            icon: 'assets/images/document.svg',
                                        }, {
                                            id: 'address_number',
                                            label: 'number',
                                            icon: 'assets/images/document.svg',
                                        }, {
                                            id: 'address_is_shipping',
                                            label: 'is_shipping',
                                            icon: 'assets/images/document.svg',
                                        }, {
                                            id: 'address_is_billing',
                                            label: 'is_billing',
                                            icon: 'assets/images/document.svg',
                                        }]
                                }]
                        }]
                }]
        ]
    })
        .setName('nanonull')
        .position(50, 130)
        .addTo(graph);
    
    const constant1 = new Constant()
        .setValue('Order')
        .position(240, 10)
        .addTo(graph);
    
    const constant2 = new Constant()
        .setValue('.dat')
        .position(240, 40)
        .addTo(graph);
    
    const constant3 = new Constant()
        .setValue(' ')
        .position(240, 70)
        .addTo(graph);
    
    const concat1 = new Concat()
        .position(450, 0)
        .addTo(graph);
    
    const concat2 = new Concat()
        .position(450, 120)
        .addTo(graph);
    
    const getDate1 = new GetDate()
        .position(450, 310)
        .addTo(graph);
    
    const links = [
        // concat1
        new Link({
            source: { id: constant1.id, port: 'value' },
            target: { id: concat1.id, port: 'value_1' }
        }),
        new Link({
            source: { id: nanonull.id, port: 'order_id' },
            target: { id: concat1.id, port: 'value_2' }
        }),
        new Link({
            source: { id: constant2.id, port: 'value' },
            target: { id: concat1.id, port: 'value_3' }
        }),
        new Link({
            source: { id: concat1.id, port: 'result' },
            target: { id: order.id, port: 'file' }
        }),
        // concat2
        new Link({
            source: { id: nanonull.id, port: 'user_first_name' },
            target: { id: concat2.id, port: 'value_1' }
        }),
        new Link({
            source: { id: constant3.id, port: 'value' },
            target: { id: concat2.id, port: 'value_2' }
        }),
        new Link({
            source: { id: nanonull.id, port: 'user_last_name' },
            target: { id: concat2.id, port: 'value_3' }
        }),
        new Link({
            source: { id: concat2.id, port: 'result' },
            target: { id: order.id, port: 'order_name' }
        }),
        // getDate1
        new Link({
            source: { id: nanonull.id, port: 'user_created_at' },
            target: { id: getDate1.id, port: 'value' }
        }),
        new Link({
            source: { id: getDate1.id, port: 'year' },
            target: { id: order.id, port: 'entry_date_year' }
        }),
        new Link({
            source: { id: getDate1.id, port: 'month' },
            target: { id: order.id, port: 'entry_date_month' }
        }),
        new Link({
            source: { id: getDate1.id, port: 'day' },
            target: { id: order.id, port: 'entry_date_day' }
        }),
        // order
        new Link({
            source: { id: nanonull.id, port: 'order_id' },
            target: { id: order.id, port: 'order_id' }
        }),
        new Link({
            source: { id: nanonull.id, port: 'user_email' },
            target: { id: order.id, port: 'order_email' }
        }),
        new Link({
            source: { id: nanonull.id, port: 'addresses' },
            target: { id: order.id, port: 'address' }
        }),
        new Link({
            source: { id: nanonull.id, port: 'address_is_billing' },
            target: { id: order.id, port: 'address_billing' }
        }),
        new Link({
            source: { id: nanonull.id, port: 'address_is_shipping' },
            target: { id: order.id, port: 'address_shipping' }
        }),
        
        new Link({
            source: { id: nanonull.id, port: 'address_city' },
            target: { id: order.id, port: 'address_city' }
        }),
        new Link({
            source: { id: nanonull.id, port: 'address_street' },
            target: { id: order.id, port: 'address_street' }
        }),
        new Link({
            source: { id: nanonull.id, port: 'address_number' },
            target: { id: order.id, port: 'address_number' }
        }),
    ];
    
    links.forEach(function (link) {
        link.addTo(graph);
    });
};
