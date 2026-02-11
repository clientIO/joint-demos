import { dia, ui } from '@joint/plus';
import { data } from './data.js';
import './styles.css';

import backgroundImage from '../images/stars.jpeg';

const nextButton = document.getElementById('next');
const walkthrough = Object.keys(data).concat(['']);

const shapes = {
    Star: dia.Element.define('Star', {
        markup: [{
            tagName: 'ellipse',
            selector: 'ellipse'
        }],
        size: {
            width: 30,
            height: 30
        },
        attrs: {
            ellipse: {
                cx: 'calc(0.5 * w)',
                cy: 'calc(0.5 * h)',
                rx: 'calc(0.5 * w)',
                ry: 'calc(0.5 * h)',
                fill: 'white',
                stroke: 'white',
                strokeOpacity: 0.5,
                strokeWidth: 8,
                cursor: 'pointer'
            }
        }
    }),
    Name: dia.Element.define('Name', {
        markup: [{
            tagName: 'text',
            selector: 'text'
        }],
        attrs: {
            text: {
                stroke: '#b0c4de',
                fill: '#b0c4de',
                cursor: 'pointer',
                textAnchor: 'middle',
                fontSize: 80,
                fontFamily: 'fantasy',
                fontWeight: 'bold',
                letterSpacing: 10
            }
        }
    }),
    Connection: dia.Link.define('Connection', {
        markup: [{
            tagName: 'path',
            selector: 'line',
            attributes: {
                'fill': 'none'
            }
        }, {
            tagName: 'path',
            selector: 'wrap',
            attributes: {
                'fill': 'none'
            }
        }],
        attrs: {
            line: {
                connection: true,
                stroke: '#FFCC12',
                strokeWidth: 8
            },
            wrap: {
                connection: true,
                stroke: 'transparent',
                strokeWidth: 20,
                cursor: 'pointer'
            }
        }
    }, {

        highlight: function() {
            this.attr('line/stroke', '#FF3355');
        },

        unhighlight: function() {
            this.attr('line/stroke', '#FFCC12');
        }
    })
};

const Universe = dia.Graph.extend({

    getConstellation: function(name) {
        const constellationStars = [];
        const stars = this.getElements();
        for (let i = 0, n = stars.length; i < n; i++) {
            const star = stars[i];
            if (star.prop('constellation') === name) {
                constellationStars.push(star);
            }
        }
        return constellationStars;
    },

    getConstellationBBox: function(name) {
        return this.getCellsBBox(this.getConstellation(name));
    },

    loadConstellations: function(inputConstellations) {

        for (const name in inputConstellations) {
            const constellation = inputConstellations[name];
            const stars = constellation.stars || [];
            // Add stars
            for (let i = 0, n = stars.length; i < n; i++) {
                const star = stars[i];
                (new shapes.Star({ id: name + '-' + i }))
                    .position(star.x, star.y)
                    .prop('constellation', name)
                    .addTo(this);
            }
            // Add connections
            const connections = constellation.connections || [];
            for (let j = 0, m = connections.length; j < m; j++) {
                const connection = connections[j];
                (new shapes.Connection({
                    source: { id: name + '-' + connection[0] },
                    target: { id: name + '-' + connection[1] },
                    constellation: name
                })).addTo(this);
            }
            // Add constellation name
            const center = this.getConstellationBBox(name).center();
            (new shapes.Name())
                .attr('text/text', name.toUpperCase())
                .position(center.x, center.y)
                .prop('constellation', name)
                .addTo(this);
        }
    },

    highlightConstellation: function(name) {
        const constellation = this.getConstellation(name);
        const subgraph = this.getSubgraph(constellation);
        for (let i = 0, n = subgraph.length; i < n; i++) {
            const cell = subgraph[i];
            if (cell.isLink()) cell.highlight();
        }
    },

    unhighlightConstellation: function(name) {
        const constellation = this.getConstellation(name);
        const subgraph = this.getSubgraph(constellation);
        for (let i = 0, n = subgraph.length; i < n; i++) {
            const cell = subgraph[i];
            if (cell.isLink()) cell.unhighlight();
        }
    }
});

const graph = new Universe;
const paper = new dia.Paper({
    model: graph,
    interactive: false,
    background: {
        image: backgroundImage,
        size: 'cover'
    }
});

const paperScroller = new ui.PaperScroller({
    paper: paper,
    padding: 0,
    contentOptions: {
        allowNewOrigin: 'any',
        padding: 1000
    }
});

paperScroller.lock();
document.getElementById('universe').appendChild(paperScroller.el);
graph.loadConstellations(data);
paperScroller.adjustPaper();

// Interactions

paper.on({
    'cell:pointerup': function(view) {
        const name = view.model.get('constellation');
        const constellation = this.model.getConstellation(name);
        focusStars(constellation);
    },
    'blank:pointerdown': function() {
        focusStars();
    },
    'cell:mouseenter': function(view) {
        const name = view.model.get('constellation');
        graph.highlightConstellation(name);
    },
    'cell:mouseleave': function(view, evt) {
        if (evt.relatedTarget === this.svg) {
            const name = view.model.get('constellation');
            graph.unhighlightConstellation(name);
        }
    }
});

nextButton.addEventListener('click', next, false);

// Helpers

function focusStars(stars) {
    stars || (stars = graph.getElements());
    paperScroller.transitionToRect(graph.getCellsBBox(stars), {
        visibility: .8,
        timingFunction: 'ease-out',
        delay: '10ms',
        scaleGrid: 0.05
    });
}

function next() {
    const name = walkthrough.pop();
    walkthrough.unshift(name);
    if (name) {
        focusStars(graph.getConstellation(name));
    } else {
        focusStars();
    }
    nextButton.textContent = 'Visit ' + (walkthrough[walkthrough.length - 1] || 'all');
}

// Start the walkthrough
next();
