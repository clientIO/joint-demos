import { util, dia, shapes, ui, highlighters, layout } from '@joint/plus';
import './styles.scss';

// Asset imports
import assetSitemap_xml from '../assets/data/sitemap.xml';

const INITIAL_NODE = 'www.jointjs.com';
const COLORS = {
    default: '#ed2637',
    description: '#131e29',
    matchColor: '#85c0ff',
    activeMatchColor: '#0075f2',
    activeMatchNodeColor: '#ffe74c'
};
const GAP = 30;
const PLACEHOLDER_IMAGE =
    'https://uploads-ssl.webflow.com/63061d4ee85b5a18644f221c/6375494597a7e881659aa11d_og-image_home-page.jpg';

function makeElement(id, slug, data, mainColor, direction) {
    const {
        url,
        title = 'No title provided',
        description = 'No description provided',
        image = PLACEHOLDER_IMAGE,
        collapsed = false,
        hidden = false
    } = data;

    return new Site({
        id,
        url,
        direction,
        collapsed,
        hidden,
        z: 3,
        attrs: {
            body: {
                stroke: mainColor
            },
            header: {
                title: url
            },
            headerLabel: {
                text: slug === INITIAL_NODE ? slug : `/${slug}`,
                fill: mainColor
            },
            title: {
                fill: mainColor,
                title
            },
            titleLabel: {
                text: title
            },
            description: {
                title: description
            },
            descriptionLabel: {
                text: description
            },
            image: {
                xlinkHref: image
            },
            url: {
                href: url
            }
        }
    });
}

function makeGroup({ hidden }, stroke) {
    return new Group({
        direction: 'BR',
        z: 2,
        hidden,
        attrs: {
            body: {
                fill: '#cad8e3',
                stroke
            }
        }
    });
}

function makeLink(parentId, childId, stroke) {
    return new shapes.standard.Link({
        attrs: {
            line: {
                stroke,
                targetMarker: null
            }
        },
        z: 1,
        source: { id: parentId },
        target: { id: childId }
    });
}

function generateElements(map, parentId, parentColor, depth = 0, opt = {}) {
    const color = COLORS.default;
    const collapsed = !opt.groupEl;
    const hidden = depth > 0;
    const direction = 'B';

    for (const childKey of Object.keys(map)) {
        const elementId = `${parentId}-${childKey}`;
        const { children, ...data } = map[childKey];
        const hasChildren = Object.keys(children).length > 0;

        const element = makeElement(
            elementId,
            childKey,
            { ...data, collapsed, hidden },
            color,
            direction
        );
        element.addTo(graph);

        if (!opt.groupEl) {
            makeLink(parentId, elementId, parentColor).addTo(graph);
        } else {
            opt.groupEl.embed(element);
        }

        if (!hasChildren) continue;

        const group = makeGroup({ hidden: true }, color);
        ExpandButton.add(element.findView(paper), 'body', 'expand-button');
        const link = makeLink(element.id, group.id, color);
        graph.addCells([group, link]);
        generateElements(children, element.id, color, depth + 1, {
            groupEl: group
        });
    }
}

async function setupGraph() {
    const response = await fetch(assetSitemap_xml);
    const xmlString = await response.text();

    const parser = new DOMParser();

    const xml = parser.parseFromString(xmlString, 'text/xml');
    const urlElements = xml.getElementsByTagName('url');
    const urlMap = {};

    for (const urlElement of urlElements) {
        const urlRaw = urlElement.getElementsByTagName('loc')[0].textContent;

        const pathname = new URL(urlRaw).pathname;
        let path;

        if (pathname === '/') {
            path = INITIAL_NODE;
        } else {
            path = pathname.split('/');
            path.shift();
            path.unshift(INITIAL_NODE);
            path = path.join('/children/');
        }

        const title =
            urlElement.getElementsByTagName('title')[0].textContent || undefined;
        const description =
            urlElement.getElementsByTagName('description')[0].textContent ||
            undefined;
        const image =
            urlElement.getElementsByTagName('image')[0].textContent || undefined;

        const record = util.result(urlMap, path) || {
            url: urlRaw,
            title,
            description,
            image,
            children: {}
        };

        util.setByPath(urlMap, path, record);
    }

    const { children, ...data } = urlMap[INITIAL_NODE];
    const initialElement = makeElement(
        INITIAL_NODE,
        INITIAL_NODE,
        data,
        COLORS.default,
        'B'
    ).addTo(graph);
    ExpandButton.add(initialElement.findView(paper), 'body', 'expand-button');
    generateElements(children, initialElement.id, COLORS.default);
}

let currentMatches = [];
let currentMatchIndex = 0;

function search(key) {
    const matches = findGraphMatches(key, graph);
    currentMatches = matches;
    currentMatchIndex = 0;
    setCount(currentMatchIndex, matches.length);
    expandCurrentMatchTree(matches, currentMatchIndex);
    highlightMatches(matches, currentMatchIndex);
    scrollToMatch(matches, currentMatchIndex);
}

function expandCurrentMatchTree(matches, index) {
    if (matches.length === 0) return;

    graph.getPredecessors(matches[index].element).forEach((el) => {
        el.setCollapse(false, graph);
    });

    const group = matches[index].element.getParentCell();
    if (group) {
        group.setVisibility(false, graph);
        graph.getPredecessors(group)[0].prop('collapsed', false);
    }

    layoutFunction();
}

function scrollToMatch(matches, index) {
    if (matches.length === 0) return;

    paperScroller.scrollToElement(matches[index].element, {
        animation: true
    });
}

function findGraphMatches(key, graph) {
    const matches = [];
    if (!key) return matches;
    graph
        .getElements()
        .forEach((el) => matches.push(...findElementMatches(key, el)));
    return matches;
}

function findElementMatches(key, element) {
    const matches = [];
    ['headerLabel', 'titleLabel', 'descriptionLabel'].forEach((selector) => {
        const text = element.attr([selector, 'text']);
        if (!text) return;
        if (text.toLowerCase().includes(key)) {
            matches.push({
                selector,
                element
            });
        }
    });
    return matches;
}

function highlightMatches(matches, activeMatchIndex) {
    highlighters.mask.removeAll(paper);
    NodeHighlighter.removeAll(paper);
    matches
        .filter((match) => !match.element.isHidden())
        .forEach(({ selector, element }, index) => {
            const elementView = element.findView(paper);
            const isActiveMatch = matches[activeMatchIndex].element === element;
            highlighters.mask.add(elementView, 'body', 'element-match', {
                padding: 2,
                attrs: {
                    stroke: isActiveMatch ? COLORS.activeMatchColor : COLORS.matchColor,
                    'stroke-width': isActiveMatch ? 4 : 2,
                    rx: 5
                },
                layer: dia.Paper.Layers.FRONT
            });
            if (isActiveMatch && index === activeMatchIndex) {
                NodeHighlighter.add(elementView, selector, 'node-match');
            }
        });
}

function setCount(matchIndex, matchesCount) {
    const displayIndex = Math.min(matchIndex + 1, matchesCount);
    labelWidget.el.textContent = `${displayIndex} of ${matchesCount}`;
}

function layoutFunction() {
    const elements = graph.getElements();

    for (const element of elements) {
        if (element instanceof Group && !element.isHidden()) {
            const cells = element.getEmbeddedCells();

            layout.GridLayout.layout(cells, {
                columns: Math.min(Math.max(Math.round(cells.length / 5), 1), 6),
                rowGap: GAP,
                columnGap: GAP,
                parentRelative: true,
                marginX: GAP,
                marginY: GAP
            });

            element.fitEmbeds({ padding: GAP });
        }
    }

    tree.layout();

    paper.fitToContent({
        allowNewOrigin: 'any',
        contentArea: tree.getLayoutBBox(),
        padding: 200
    });

    paper.unfreeze();
}

// Shapes

const SHAPE_HEIGHT = 270;
const HEADER_HEIGHT = 50;
const PADDING = 10;
const TITLE_HEIGHT = 40;
const DESCRIPTION_HEIGHT = 60;
const IMAGE_HEIGHT =
    SHAPE_HEIGHT -
    (HEADER_HEIGHT + TITLE_HEIGHT + DESCRIPTION_HEIGHT + 3 * PADDING);

const labelAttributes = {
    fontFamily: 'sans-serif',
    fontSize: 12,
    fill: '#fff',
    fontWeight: 'bold',
    textAnchor: 'left',
    textVerticalAnchor: 'middle',
    x: PADDING * 2
};

const siteMarkup = util.svg`
    <path @selector="body" />
    <a @selector="url">
        <rect @selector="header" />
        <text @selector="headerLabel" />
    </a>
    <rect @selector="title" />
    <text @selector="titleLabel" />
    <rect @selector="description" />
    <text @selector="descriptionLabel" />
    <image @selector="image" />
`;

class Site extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'sitemap.Site',
            size: {
                width: 200,
                height: SHAPE_HEIGHT
            },
            collapsed: false,
            hidden: false,
            url: '',
            attrs: {
                body: {
                    fill: 'white',
                    strokeWidth: 2,
                    d:
                        'M 10 0 H calc(w - 10) l 10 10 V calc(h - 10) l -10 10 H 10 l -10 -10 V 10 Z'
                },
                header: {
                    height: HEADER_HEIGHT,
                    width: `calc(w - ${PADDING * 2})`,
                    x: PADDING,
                    fill: 'transparent',
                    stroke: 'none'
                },
                headerLabel: {
                    fontFamily: 'sans-serif',
                    fontSize: 16,
                    fontWeight: 'bold',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    pointerEvents: 'none',
                    x: 'calc(w / 2)',
                    y: HEADER_HEIGHT / 2,
                    textWrap: {
                        ellipsis: true,
                        width: `calc(w - ${PADDING * 2})`,
                        maxLineCount: 1
                    }
                },
                title: {
                    width: `calc(w - ${PADDING * 2})`,
                    x: PADDING,
                    y: HEADER_HEIGHT,
                    height: TITLE_HEIGHT
                },
                titleLabel: {
                    pointerEvents: 'none',
                    ...labelAttributes,
                    y: HEADER_HEIGHT + TITLE_HEIGHT / 2,
                    textWrap: {
                        ellipsis: true,
                        width: `calc(w - ${PADDING * 4})`,
                        maxLineCount: 2
                    }
                },
                description: {
                    fill: COLORS.description,
                    width: `calc(w - ${PADDING * 2})`,
                    x: PADDING,
                    y: HEADER_HEIGHT + TITLE_HEIGHT + PADDING,
                    height: DESCRIPTION_HEIGHT
                },
                descriptionLabel: {
                    pointerEvents: 'none',
                    ...labelAttributes,
                    y: HEADER_HEIGHT + TITLE_HEIGHT + PADDING + DESCRIPTION_HEIGHT / 2,
                    textWrap: {
                        ellipsis: true,
                        width: `calc(w - ${PADDING * 4})`,
                        maxLineCount: 4
                    }
                },
                image: {
                    y: HEADER_HEIGHT + TITLE_HEIGHT + DESCRIPTION_HEIGHT + 2 * PADDING,
                    width: `calc(w - ${PADDING * 2})`,
                    x: PADDING,
                    height: IMAGE_HEIGHT,
                    preserveAspectRatio: 'xMidYMid slice',
                    // clipPath: 'inset(0% round 5px)',
                    clipPath: 'polygon(0 0, 100% 0, 100% 94%, 97% 100%, 3% 100%, 0% 94%)',
                    cursor: 'pointer',
                    event: 'site:image:pointerdown'
                },
                url: {
                    target: '_blank'
                }
            }
        };
    }

    preinitialize() {
        this.markup = siteMarkup;
    }

    isCollapsed() {
        return this.get('collapsed');
    }

    isHidden() {
        return this.get('hidden');
    }

    toggleCollapse(graph) {
        this.set('collapsed', !this.isCollapsed());
        this.setChildrenVisibility(this.isCollapsed(), graph);
    }

    setCollapse(value, graph) {
        this.set('collapsed', value);
        this.setChildrenVisibility(value, graph);
    }

    setVisibility(value, graph) {
        this.set('hidden', value);
        this.setChildrenVisibility(value, graph);
    }

    setChildrenVisibility(value, graph) {
        graph.getNeighbors(this, { outbound: true }).forEach((child) => {
            child.setVisibility(this.isCollapsed() || value, graph);
        });
    }
}

const groupMarkup = util.svg`
    <path @selector="body" />
`;

class Group extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'sitemap.Group',
            position: {
                x: 0,
                y: 0
            },
            attrs: {
                body: {
                    strokeWidth: 2,
                    d:
                        'M 20 0 H calc(w - 20) l 20 20 V calc(h - 20) l -20 20 H 20 l -20 -20 V 20 Z'
                }
            },
            hidden: false
        };
    }

    preinitialize() {
        this.markup = groupMarkup;
    }

    isHidden() {
        return this.get('hidden');
    }

    setVisibility(value, graph) {
        this.set('hidden', value);
        this.setChildrenVisibility(value, graph);
    }

    setChildrenVisibility(value, graph) {
        this.getEmbeddedCells().forEach((child) => {
            child.setVisibility(value, graph);
        });
    }
}

// Highlighter - a frame around the searched element

const expandButtonMarkup = util.svg`
    <circle @selector="button" fill="#fff" cx="0" cy="0" r="8" cursor="pointer" />
    <path @selector="icon" fill="none" stroke="#131e29" stroke-width="2" pointer-events="none" />
`;

class ExpandButton extends dia.HighlighterView {
    preinitialize() {
        this.UPDATE_ATTRIBUTES = ['collapsed'];
        this.attributes = {
            event: 'site:collapse'
        };
        this.children = expandButtonMarkup;
    }

    highlight(elementView) {
        const { model } = elementView;
        const { width, height } = model.size();
        this.renderChildren();
        const { el, childNodes } = this;
        el.classList.add('expand-button');
        childNodes.button.setAttribute('stroke', model.attr('body/stroke'));
        childNodes.button.setAttribute('fill', this.getFillColor(model));
        childNodes.icon.setAttribute('d', this.getIconPath(model));
        childNodes.icon.setAttribute('stroke', this.getIconStroke(model));
        el.setAttribute('transform', `translate(${width / 2}, ${height})`);
    }

    getFillColor(element) {
        if (element.isCollapsed()) {
            return element.attr('body/stroke');
        }

        return '#fff';
    }

    getIconStroke(element) {
        if (element.isCollapsed()) {
            return '#fff';
        }

        return element.attr('body/stroke');
    }

    getIconPath(element) {
        if (element.isCollapsed()) {
            return 'M -5 -2 L 0 2 L 5 -2';
        }

        return 'M -5 2 L 0 -2 L 5 2';
    }
}

// Highlighter - an overlay over the searched element's node

class NodeHighlighter extends dia.HighlighterView {
    preinitialize() {
        this.tagName = 'rect';
        this.attributes = {
            fill: COLORS.activeMatchNodeColor,
            opacity: 0.4,
            'pointer-events': 'none'
        };
    }

    highlight(view, node) {
        const { padding = 3 } = this.options;
        const bbox = view.getNodeBoundingRect(node);
        const matrix = view.getNodeMatrix(node);
        this.vel.transform(matrix).attr(bbox.inflate(padding).toJSON());
    }
}

// Graph and Paper

const cellNamespace = {
    ...shapes,
    sitemap: {
        Site,
        Group
    }
};

const graph = new dia.Graph({}, { cellNamespace });
const paper = new dia.Paper({
    model: graph,
    async: true,
    frozen: true,
    autoFreeze: true,
    interactive: false,
    sorting: dia.Paper.sorting.APPROX,
    cellViewNamespace: cellNamespace,
    defaultConnector: {
        name: 'straight',
        args: { cornerRadius: 10, cornerType: 'line' }
    },
    background: {
        color: 'transparent'
    }
});

const paperScroller = new ui.PaperScroller({
    paper,
    cursor: 'grab',
    borderless: true,
    minVisiblePaperSize: 500,
    baseWidth: 1,
    baseHeight: 1,
    contentOptions: {
        useModelGeometry: true
    }
});

document
    .getElementById('paper-container')
    .appendChild(paperScroller.render().el);

// Setup the virtual rendering
// Only the elements that are inside the viewport will be rendered.
// This is a reason why we can not simply use the native search
// browser functionality.

let viewportRect = paperScroller.getVisibleArea();

paper.options.viewport = (elementView) => {
    const model = elementView.model;
    const bbox = model.getBBox();
    if (model.isLink()) {
        const source = model.getSourceElement();
        const target = model.getTargetElement();
        return (
            !source.isHidden() &&
            !target.isHidden() &&
            viewportRect.intersect(bbox.inflate(1))
        );
    }
    return !model.isHidden() && viewportRect.intersect(bbox);
};

paperScroller.on('scroll', () => {
    // We need to update the viewport of the paper to make sure that the
    // elements that are inside the viewport are rendered.
    // See `autoFreeze` option of the paper.
    paper.unfreeze();
    // Update the viewport rect.
    viewportRect = paperScroller.getVisibleArea();
});

const tree = new layout.TreeLayout({
    graph,
    // Do not iterate over the collapsed sites.
    filter: (siblings) => {
        return siblings.filter((sibling) => {
            return !sibling.isHidden();
        });
    },
    // Make sure that the sites inside the groups are
    // positioned correctly.
    updatePosition: function(element, position) {
        element.position(position.x, position.y, { deep: true });
    },
    parentGap: GAP * 2,
    siblingGap: GAP
});

// Search toolbar

const toolbar = new ui.Toolbar({
    tools: [
        {
            type: 'input-text',
            name: 'key'
        },
        {
            type: 'label',
            name: 'count'
        },
        {
            type: 'button',
            text: 'prev',
            name: 'prev'
        },
        {
            type: 'button',
            text: 'next',
            name: 'next'
        },
        {
            type: 'button',
            text: 'cancel',
            name: 'cancel'
        }
    ]
});

toolbar.render();
document.getElementById('toolbar-container').appendChild(toolbar.el);

const labelWidget = toolbar.getWidgetByName('count');
const nextWidget = toolbar.getWidgetByName('next');
const prevWidget = toolbar.getWidgetByName('prev');
const cancelWidget = toolbar.getWidgetByName('cancel');
const keyWidget = toolbar.getWidgetByName('key');
const keyInputEl = keyWidget.el.querySelector('input');

keyInputEl.placeholder = 'Search...';
keyWidget.el.addEventListener(
    'keyup',
    (evt) => {
        switch (evt.code) {
            case 'Escape': {
                cancelWidget.el.click();
                return;
            }
            case 'ArrowUp': {
                prevWidget.el.click();
                return;
            }
            case 'Enter':
            case 'ArrowDown': {
                nextWidget.el.click();
                return;
            }
        }
        const key = evt.target.value.toLowerCase();
        search(key);
    },
    false
);

document.addEventListener(
    'keydown',
    function(evt) {
        const modifier = window.navigator.platform.match('Mac')
            ? evt.metaKey
            : evt.ctrlKey;
        if (modifier && evt.keyCode == 70) {
            evt.preventDefault();
            keyInputEl.select();
        }
    },
    false
);

toolbar.on({
    'next:pointerclick': () => {
        if (currentMatches.length === 0) return;
        currentMatchIndex = (currentMatchIndex + 1) % currentMatches.length;
        setCount(currentMatchIndex, currentMatches.length);
        expandCurrentMatchTree(currentMatches, currentMatchIndex);
        highlightMatches(currentMatches, currentMatchIndex);
        scrollToMatch(currentMatches, currentMatchIndex);
    },
    'prev:pointerclick': () => {
        if (currentMatches.length === 0) return;
        currentMatchIndex =
            (currentMatchIndex - 1 + currentMatches.length) % currentMatches.length;
        setCount(currentMatchIndex, currentMatches.length);
        expandCurrentMatchTree(currentMatches, currentMatchIndex);
        highlightMatches(currentMatches, currentMatchIndex);
        scrollToMatch(currentMatches, currentMatchIndex);
    },
    'cancel:pointerclick': () => {
        keyInputEl.value = '';
        currentMatches = [];
        currentMatchIndex = 0;
        setCount(0, 0);
        highlightMatches([], -1);
    }
});

// Paper Events

// Collapse/Expand the site when the collapse button is clicked.
paper.on('site:collapse', (elementView) => {
    const element = elementView.model;
    element.toggleCollapse(graph);
    layoutFunction();
    paperScroller.scrollToElement(element);
});

// Open the lightbox when the image is clicked.
paper.on('site:image:pointerdown', (elementView) => {
    const title = elementView.model.attr('titleLabel/text');
    const imgUrl = elementView.model.attr('image/xlinkHref');
    const lightbox = new ui.Lightbox({
        title,
        image: imgUrl
    });
    lightbox.open();
});

// Setup zooming and panning

paper.on('blank:pointerdown', (evt) => {
    // Steal the focus from the input element.
    document.activeElement.blur();
    paperScroller.startPanning(evt);
});

paper.on('paper:pinch', (evt, ox, oy, scale) => {
    evt.preventDefault();
    paperScroller.zoom(scale - 1, { min: 0.1, max: 5, ox, oy });
});

paper.on('paper:pan', (evt, tx, ty) => {
    evt.preventDefault();
    paperScroller.el.scrollLeft += tx;
    paperScroller.el.scrollTop += ty;
});

// Run setup

setupGraph().then(() => {
    setCount(0, 0);
    layoutFunction();
    paperScroller.positionContent('top', {
        contentArea: tree.getLayoutBBox(),
        padding: 75
    });
});
