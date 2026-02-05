import { dia, shapes, setTheme } from '@joint/plus';
import { createStencil } from './stencil';

export const init = () => {
    
    setTheme('my-theme');
    
    const graph = new dia.Graph({}, { cellNamespace: shapes });
    
    const paper = new dia.Paper({
        el: document.getElementById('paper'),
        model: graph,
        width: 680,
        height: 600,
        gridSize: 20,
        interactive: true,
        async: true,
        frozen: false,
        sorting: dia.Paper.sorting.APPROX,
        background: { color: '#F3F7F6' },
        cellViewNamespace: shapes
    });
    
    const stencil = createStencil(paper, 280, stencilNodes, (node) => {
        return new shapes.standard.Rectangle({
            size: {
                width: 120,
                height: 40
            },
            attrs: {
                body: {
                    fill: '#333',
                    stroke: '#F3F7F6',
                    rx: 3,
                    ry: 3
                },
                label: {
                    fill: '#fff',
                    fontSize: 15,
                    fontFamily: 'monospace',
                    text: `<${node.get('name')}>`
                }
            }
        });
    });
    
    document.getElementById('stencil').appendChild(stencil.el);
    
    stencil.el.dataset.textNoMatchesFound = 'No tags found';
    stencil.el.querySelector('.search').placeholder = 'Search for an HTML tag';
    
    stencil.unfreeze();
};

const stencilNodes = {
    name: 'HTML',
    dir: true,
    children: [{
            name: 'Favorites',
            icon: 'assets/favorite.svg',
            dir: true,
            children: [{
                    name: 'svg',
                    icon: 'assets/link.svg'
                }],
        }, {
            name: 'Document metadata',
            dir: true,
            collapsed: true,
            children: [{
                    name: 'base'
                }, {
                    name: 'head'
                }, {
                    name: 'link'
                }, {
                    name: 'meta'
                }, {
                    name: 'style'
                }, {
                    name: 'title'
                }]
        }, {
            name: 'Content sectioning',
            dir: true,
            collapsed: true,
            children: [{
                    name: 'address'
                }, {
                    name: 'article'
                }, {
                    name: 'aside'
                }, {
                    name: 'footer'
                }, {
                    name: 'header'
                }, {
                    name: 'main'
                }, {
                    name: 'nav'
                }, {
                    name: 'section'
                }]
        }, {
            name: 'Text content',
            dir: true,
            collapsed: true,
            children: [{
                    name: 'blockquote'
                }, {
                    name: 'dd'
                }, {
                    name: 'div'
                }, {
                    name: 'dl'
                }, {
                    name: 'dt'
                }, {
                    name: 'figcaption'
                }, {
                    name: 'figure'
                }, {
                    name: 'hr'
                }, {
                    name: 'li'
                }, {
                    name: 'ol'
                }, {
                    name: 'p'
                }, {
                    name: 'pre'
                }, {
                    name: 'ul'
                }]
        }, {
            name: 'Image and media',
            dir: true,
            collapsed: true,
            children: [{
                    name: 'area'
                }, {
                    name: 'audio'
                }, {
                    name: 'img'
                }, {
                    name: 'map'
                }, {
                    name: 'track'
                }, {
                    name: 'video'
                }]
        }, {
            name: 'Embedded content',
            dir: true,
            collapsed: true,
            children: [{
                    name: 'embed'
                }, {
                    name: 'iframe'
                }, {
                    name: 'object'
                }, {
                    name: 'param'
                }, {
                    name: 'picture'
                }, {
                    name: 'portal'
                }, {
                    name: 'source'
                }]
        }, {
            name: 'SVG and MathML',
            dir: true,
            collapsed: true,
            children: [{
                    name: 'svg'
                }, {
                    name: 'math'
                }]
        }]
};
