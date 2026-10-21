import { dia, shapes } from '@joint/core';
import { init as initCollaboration } from './collaboration';
import { init as initInteractions } from './interactions';
import { TextBox, TextBoxView } from './shapes/text-box';

const textMargin = 5;

export const cellNamespace = { ...shapes, custom: { TextBox, TextBoxView }};

export let graph: dia.Graph;

export let paper: dia.Paper;

export function init() {

    graph = new dia.Graph({}, { cellNamespace });

    paper = new dia.Paper({
        el: document.getElementById('paper-container'),
        width: window.innerWidth,
        height: window.innerHeight,
        overflow: true,
        model: graph,
        cellViewNamespace: cellNamespace,
        gridSize: 10,
        drawGrid: { name: 'dot', args: { color: '#ccc' }},
        async: true,
        linkPinning: false,
        defaultAnchor: {
            name: 'center',
            args: { useModelGeometry: true },
        },
        defaultConnectionPoint: {
            name: 'rectangle',
            args: { useModelGeometry: true },
        },
    });

    window.addEventListener('resize', () => {
        paper.setDimensions(window.innerWidth, window.innerHeight);
    });

    const defaultLabel = {
        markup: [
            { tagName: 'rect', selector: 'labelBody' },
            { tagName: 'text', selector: 'labelText' },
        ],
        attrs: {
            labelBody: {
                ref: 'labelText',
                fill: '#fff',
                fillOpacity: 0.9,
                stroke: '#333',
                strokeWidth: 0.5,
                width: `calc(w + ${textMargin * 2})`,
                height: `calc(h + ${textMargin * 2})`,
                x: `calc(x - ${textMargin})`,
                y: `calc(y - ${textMargin})`,
            },
            labelText: {
                fontSize: 12,
                fontFamily: 'sans-serif',
                textAnchor: 'middle',
                textVerticalAnchor: 'middle',
                fill: '#333',
                strokeWidth: 2,
            },
        },
    };

    const makeLink = (id: string, sourceId: dia.Cell.ID, targetId: dia.Cell.ID, labelText?: string) =>
        new shapes.standard.Link({
            id,
            source: { id: sourceId },
            target: { id: targetId },
            defaultLabel,
            ...(labelText ? { labels: [{ position: 0.5, attrs: { labelText: { text: labelText }}}] } : {}),
        });

    const web      = new TextBox({ id: 'web',      position: { x: 120, y: 300 }, attrs: { label: { text: 'Web App' }}});
    const gateway  = new TextBox({ id: 'gateway',  position: { x: 360, y: 300 }, attrs: { label: { text: 'API Gateway' }}});
    const products = new TextBox({ id: 'products', position: { x: 620, y: 150 }, attrs: { label: { text: 'Product Service' }}});
    const orders   = new TextBox({ id: 'orders',   position: { x: 620, y: 300 }, attrs: { label: { text: 'Order Service' }}});
    const users    = new TextBox({ id: 'users',    position: { x: 620, y: 450 }, attrs: { label: { text: 'User Service' }}});
    const prodsDb  = new TextBox({ id: 'prodsDb',  position: { x: 900, y: 150 }, attrs: { label: { text: 'Products DB' }}});
    const ordersDb = new TextBox({ id: 'ordersDb', position: { x: 900, y: 300 }, attrs: { label: { text: 'Orders DB' }}});
    const usersDb  = new TextBox({ id: 'usersDb',  position: { x: 900, y: 450 }, attrs: { label: { text: 'Users DB' }}});

    graph.addCells([
        web, gateway, users, products, orders, usersDb, prodsDb, ordersDb,
        makeLink('l-web-gw',    web.id,      gateway.id,  'HTTP'),
        makeLink('l-gw-users',  gateway.id,  users.id,    'REST'),
        makeLink('l-gw-prods',  gateway.id,  products.id, 'REST'),
        makeLink('l-gw-ords',   gateway.id,  orders.id,   'REST'),
        makeLink('l-users-db',  users.id,    usersDb.id,  'SQL'),
        makeLink('l-prods-db',  products.id, prodsDb.id,  'SQL'),
        makeLink('l-ords-db',   orders.id,   ordersDb.id,   'SQL'),
        makeLink('l-ords-usr',  orders.id,   users.id,    'Validate'),
    ]);

    initCollaboration();
    initInteractions();
}



