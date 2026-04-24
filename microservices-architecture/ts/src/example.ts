import type { dia } from '@joint/plus';
import { ServiceModel, DBModel, GroupModel, LinkModel } from './models';
import { addContainer } from './containers';

/**
 * Populates the graph with a microservices architecture diagram: three
 * containers (API Gateway, Auth Service, Order Service) with groups,
 * elements, and links demonstrating internal and cross-container connections.
 */
export function createExampleDiagram(graph: dia.Graph): void {
    const gateway = addContainer(graph);
    const auth = addContainer(graph);
    const orderService = addContainer(graph);

    gateway.attr('label/text', 'API Gateway');
    auth.attr('label/text', 'Auth Service');
    orderService.attr('label/text', 'Order Service');

    // --- API Gateway ---
    const routingGroup = new GroupModel({ attrs: { label: { text: 'Routing' }}});
    routingGroup.addTo(graph);
    gateway.embed(routingGroup);

    const rest = new ServiceModel({ position: { x: 130, y: 90 }, attrs: { label: { text: 'REST' }}});
    const graphql = new ServiceModel({ position: { x: 25, y: 90 }, attrs: { label: { text: 'GraphQL' }}});
    rest.addTo(graph);
    graphql.addTo(graph);
    routingGroup.embed(rest);
    routingGroup.embed(graphql);
    routingGroup.fitContent();

    const restToGraphql = new LinkModel({ source: { id: rest.id }, target: { id: graphql.id }});
    restToGraphql.addTo(graph);

    // --- Auth Service ---
    const authGroup = new GroupModel({ attrs: { label: { text: 'Auth' }}});
    authGroup.addTo(graph);
    auth.embed(authGroup);

    const oauth = new ServiceModel({ position: { x: 25, y: 190 }, attrs: { label: { text: 'OAuth' }}});
    const jwt = new ServiceModel({ position: { x: 130, y: 190 }, attrs: { label: { text: 'JWT' }}});
    oauth.addTo(graph);
    jwt.addTo(graph);
    authGroup.embed(oauth);
    authGroup.embed(jwt);
    authGroup.fitContent();

    const oauthToJwt = new LinkModel({ source: { id: oauth.id }, target: { id: jwt.id }});
    oauthToJwt.addTo(graph);

    const usersDb = new DBModel({ position: { x: 15, y: 350 }, attrs: { label: { text: 'Users DB' }}});
    usersDb.addTo(graph);
    auth.embed(usersDb);

    const oauthToUsersDb = new LinkModel({ source: { id: oauth.id }, target: { id: usersDb.id }});
    oauthToUsersDb.addTo(graph);

    // --- Order Service ---
    const processingGroup = new GroupModel({ attrs: { label: { text: 'Processing' }}});
    processingGroup.addTo(graph);
    orderService.embed(processingGroup);

    const orders = new ServiceModel({ position: { x: 25, y: 90 }, attrs: { label: { text: 'Orders' }}});
    const validate = new ServiceModel({ position: { x: 130, y: 90 }, attrs: { label: { text: 'Validate' }}});
    orders.addTo(graph);
    validate.addTo(graph);
    processingGroup.embed(orders);
    processingGroup.embed(validate);
    processingGroup.fitContent();

    const ordersToValidate = new LinkModel({ source: { id: orders.id }, target: { id: validate.id }});
    ordersToValidate.addTo(graph);

    const ordersDb = new DBModel({ position: { x: 15, y: 250 }, attrs: { label: { text: 'Orders DB' }}});
    ordersDb.addTo(graph);
    orderService.embed(ordersDb);

    // --- Cross-container links ---
    // Gateway → Auth: REST routes to OAuth
    const restToOauth = new LinkModel({ source: { id: rest.id }, target: { id: oauth.id }});
    restToOauth.addTo(graph);

    // Gateway → Order Service: REST routes to Orders
    const restToOrders = new LinkModel({ source: { id: rest.id }, target: { id: orders.id }});
    restToOrders.addTo(graph);

    // Order Service → Auth: Orders validates tokens via JWT
    const ordersToJwt = new LinkModel({ source: { id: orders.id }, target: { id: jwt.id }});
    ordersToJwt.addTo(graph);
}
