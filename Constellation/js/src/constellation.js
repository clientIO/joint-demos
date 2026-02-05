/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

(function(joint, document) {

    var IMAGE_SRC = 'images/stars.jpeg';

    var nextButton = document.getElementById('next');
    var constellations = JSON.parse(document.getElementById('constellations').textContent);
    var walkthrough = Object.keys(constellations).concat(['']);

    var shapes = {
        Star: joint.dia.Element.define('Star', {
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
        Name: joint.dia.Element.define('Name', {
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
        Connection: joint.dia.Link.define('Connection', {
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

    var Universe = joint.dia.Graph.extend({

        getConstellation: function(name) {
            var constellationStars = [];
            var stars = this.getElements();
            for (var i = 0, n = stars.length; i < n; i++) {
                var star = stars[i];
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

            for (var name in inputConstellations) {
                var constellation = inputConstellations[name];
                var stars = constellation.stars || [];
                // Add stars
                for (var i = 0, n = stars.length; i < n; i++) {
                    var star = stars[i];
                    (new shapes.Star({ id: name + '-' + i }))
                        .position(star.x, star.y)
                        .prop('constellation', name)
                        .addTo(this);
                }
                // Add connections
                var connections = constellation.connections || [];
                for (var j = 0, m = connections.length; j < m; j++) {
                    var connection = connections[j];
                    (new shapes.Connection({
                        source: { id: name + '-' + connection[0] },
                        target: { id: name + '-' + connection[1] },
                        constellation: name
                    })).addTo(this);
                }
                // Add constellation name
                var center = this.getConstellationBBox(name).center();
                (new shapes.Name())
                    .attr('text/text', name.toUpperCase())
                    .position(center.x, center.y)
                    .prop('constellation', name)
                    .addTo(this);
            }
        },

        highlightConstellation: function(name) {
            var constellation = this.getConstellation(name);
            var subgraph = this.getSubgraph(constellation);
            for (var i = 0, n = subgraph.length; i < n; i++) {
                var cell = subgraph[i];
                if (cell.isLink()) cell.highlight();
            }
        },

        unhighlightConstellation: function(name) {
            var constellation = this.getConstellation(name);
            var subgraph = this.getSubgraph(constellation);
            for (var i = 0, n = subgraph.length; i < n; i++) {
                var cell = subgraph[i];
                if (cell.isLink()) cell.unhighlight();
            }
        }
    });

    var graph = new Universe;
    var paper = new joint.dia.Paper({
        model: graph,
        interactive: false,
        background: {
            image: IMAGE_SRC,
            size: 'cover'
        }
    });

    var paperScroller = new joint.ui.PaperScroller({
        paper: paper,
        padding: 0,
        contentOptions: {
            allowNewOrigin: 'any',
            padding: 1000
        }
    });

    paperScroller.lock();
    document.getElementById('universe').appendChild(paperScroller.el);
    graph.loadConstellations(constellations);
    paperScroller.adjustPaper();

    var image = document.createElement('img');
    image.onload = next;
    image.src = IMAGE_SRC;

    // Interactions

    paper.on({
        'cell:pointerup': function(view) {
            var name = view.model.get('constellation');
            var constellation = this.model.getConstellation(name);
            focusStars(constellation);
        },
        'blank:pointerdown': function() {
            focusStars();
        },
        'cell:mouseenter': function(view) {
            var name = view.model.get('constellation');
            graph.highlightConstellation(name);
        },
        'cell:mouseleave': function(view, evt) {
            if (evt.relatedTarget === this.svg) {
                var name = view.model.get('constellation');
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
        var name = walkthrough.pop();
        walkthrough.unshift(name);
        if (name) {
            focusStars(graph.getConstellation(name));
        } else {
            focusStars();
        }
        nextButton.textContent = 'Visit ' + (walkthrough[walkthrough.length - 1] || 'all');
    }

})(joint, document);
