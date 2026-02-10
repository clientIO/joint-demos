import { g, dia, ui, shapes, util, V } from '@joint/plus';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { data } from './gdata';
import { tokensData } from './gtoken';
import { Node, Link, Token } from './shapes';
import WebGLHeatmap from '@nbxx/webgl-heatmap';

export const init = () => {
    const canvas = document.getElementById('canvas');
    const cssLoader = document.querySelector('.loader');
    // 7 Days
    const processDuration = 7 * 24 * 60 * 60 * 1000;
    // Toolbar controls
    const range = document.querySelector('input[type="range"]');
    const speedInput = document.querySelector('input[type="number"]');
    const startButton = document.querySelector('.start');
    const stopButton = document.querySelector('.stop');
    const timer = document.querySelector('.textTime');
    // 200000 milliseconds / 200 seconds - used to increase/decrease rate of time in animation
    const DEFAULT_SPEED = 200000;
    let speed = DEFAULT_SPEED;
    let reqAnimId = null;
    // Start and End time of dataset - all token events start and complete within this time period
    range.min = String(tokensData.start);
    range.max = String(tokensData.complete + processDuration);
    range.value = range.min;

    // Tokens - elements with respective path data (x/y positions , start/end points, rotation)
    const tokens = [];

    // Event Listeners
    range.addEventListener('input', (evt) => {
        const target = evt.target;
        range.value = target.value;
        // Update position of token based on time
        tokens.forEach((token) => {
            token.data.move(Number(range.value));
        });
        paper.wakeUp();
        const milliseconds = Number(range.value);
        const dateObject = new Date(milliseconds);
        timer.innerHTML = dateObject.toLocaleString('en-GB');
        if (!reqAnimId) {
            // The animation is stopped.
            reqAnimId = util.nextFrame(() => {
                updateHeatmap();
                reqAnimId = null;
            });
        }
    });

    speedInput.addEventListener('input', (evt) => {
        const target = evt.target;
        // Update animation speed
        if (Number(target.value) <= 10 && Number(target.value) >= 0) {
            speed = DEFAULT_SPEED * Number(target.value);
        }
        else {
            speed = DEFAULT_SPEED;
            target.value = '1';
        }
    });

    startButton.addEventListener('click', () => {
        startButton.setAttribute('disabled', '');
        startRangeAnimation();
    });

    stopButton.addEventListener('click', () => {
        startButton.removeAttribute('disabled');
        stopRangeAnimation();
    });

    const keyboard = new ui.Keyboard();

    keyboard.on('space', (evt) => {
        evt.preventDefault();
        startButton.focus();
        if (reqAnimId) {
            startButton.removeAttribute('disabled');
            stopRangeAnimation();
        }
        else {
            startButton.setAttribute('disabled', '');
            startRangeAnimation();
        }
    });


    const WIDTH = 2000;
    const HEIGHT = 2000;
    const graph = new dia.Graph({}, { cellNamespace: shapes });
    const paper = new dia.Paper({
        model: graph,
        width: WIDTH,
        height: HEIGHT,
        gridSize: 1,
        interactive: false,
        defaultConnector: { name: 'rounded' },
        async: true,
        autoFreeze: true,
        viewManagement: {
            disposeHidden: false,
        },
        frozen: true,
        sorting: dia.Paper.sorting.APPROX,
        background: { color: '#F3F7F6' },
        cellViewNamespace: shapes,
        cellVisibility: (cell) => !cell.attributes.hidden,
    });

    const scroller = new ui.PaperScroller({
        paper,
        cursor: 'grab',
        baseWidth: 1,
        baseHeight: 1,
        inertia: { friction: 0.8 },
        contentOptions: {
            allowNewOrigin: 'any',
            useModelGeometry: true,
            padding: 50
        }
    });

    canvas.appendChild(scroller.el);
    scroller.render().center();

    let tokenLinks;

    createLayout(graph, data);
    setTokens();
    paper.unfreeze({
        afterRender: () => {
            cssLoader.classList.remove('loader');
            startRangeAnimation();
            paper.unfreeze();
        }
    });

    const heatmap = new WebGLHeatmap({ width: WIDTH, height: HEIGHT });
    heatmap.canvas.style.transformOrigin = '0 0';
    paper.el.insertBefore(heatmap.canvas, paper.svg);
    paper.on('transform', (matrix) => {
        heatmap.canvas.style.transform = V.matrixToTransformString(matrix);
    });

    scroller.zoomToFit({ useModelGeometry: true });

    function buildGraph(dataset) {
        const elements = [];
        const links = [];

        Object.keys(dataset.response.nodes).forEach((nodeLabel) => {
            // Add Elements
            elements.push(new Node({ id: nodeLabel }).setText(nodeLabel));
        });

        Object.values(dataset.response.arcs).forEach((arc) => {
            // Add Links
            links.push(new Link().connect(arc.source, arc.target));
        });
        return { cells: elements.concat(links), tokens: links };
    }

    function createLayout(graph, data) {
        const dataset = buildGraph(data);
        graph.resetCells(dataset.cells);
        DirectedGraph.layout(graph, {
            rankDir: 'LR',
            nodeSep: 20,
            rankSep: 20,
            edgeSep: 5,
            align: 'UR',
            setVertices: function (link, vertices) {
                const polyline = new g.Polyline(vertices);
                polyline.simplify({ threshold: 0.001 });

                const polylinePoints = polyline.points;
                const numPolylinePoints = polylinePoints.length;

                // Points are used to calculate token x,y positions and rotation
                link.set({
                    'points': polylinePoints,
                    'vertices': polylinePoints.slice(1, numPolylinePoints - 1)
                });
            }
        });
        tokenLinks = dataset.tokens;
    }

    // Animation functions
    function startRangeAnimation() {
        if (reqAnimId) {
            return;
        }
        let startTime = Date.now();

        const fn = () => {
            if (range.value > range.max) {
                stopRangeAnimation();
                return;
            }
            // Calculate time passed since animation was started
            let currentTime = Date.now();
            let elapsedTime = currentTime - startTime;
            startTime = currentTime;

            // Elapsed time in milliseconds added to current range value
            range.value = String(Number(range.value) + (speed * elapsedTime));

            tokens.forEach((token) => {
                token.data.move(Number(range.value));
            });

            updateHeatmap();

            const milliseconds = Number(range.value);
            const dateObject = new Date(milliseconds);
            timer.innerHTML = dateObject.toLocaleString('en-GB');

            reqAnimId = util.nextFrame(fn);
        };
        reqAnimId = util.nextFrame(fn);
    }

    function stopRangeAnimation() {
        util.cancelFrame(reqAnimId);
        reqAnimId = null;
    }

    function updateHeatmap() {
        heatmap.multiply(0);
        const currentTime = Number(range.value);
        tokens.forEach((token) => {
            const { element, lut, start, end } = token.data;
            // Mark the processing of the tokens before they reach target.
            const targetDuration = end - currentTime + processDuration / 2;
            if (targetDuration > 0 && targetDuration < processDuration) {
                const p = lut[lut.length - 1];
                const r = util.timing.inout(1 - Math.abs(targetDuration / processDuration - 0.5));
                heatmap.addPoint(p.x, p.y, 150, r * 0.3);
            }
            // Mark the processing of the tokens after they leave source.
            const sourceDuration = currentTime - start + processDuration / 2;
            if (sourceDuration > 0 && sourceDuration < processDuration) {
                const p = lut[0];
                const r = util.timing.inout(1 - Math.abs(sourceDuration / processDuration - 0.5));
                heatmap.addPoint(p.x, p.y, 150, r * 0.3);
            }
            // Mark the token transfer via the link.
            if (element.get('hidden'))
                return;
            lut.forEach(({ x, y }) => {
                heatmap.addPoint(x, y, 75, 0.0015);
            });
        });
        heatmap.update();
        heatmap.display();
    }

    // Tokens
    function setTokens() {

        // Token elements to be added to graph
        const tokenElements = [];

        // Token colors - Each event id in ascending order has its own color
        const eventNumbers = [];
        const eventColors = [
            '#FFFFFF',
            '#EEF0FB',
            '#DEE2F7',
            '#CDD3F3',
            '#BDC4EF',
            '#ACB6EC',
            '#9CA7E8',
            '#8B99E4',
            '#7B8AE0',
            '#6A7BDC',
            '#5064D6',
            '#495ED4',
            '#394FD0'
        ];
        tokensData.listOfEvent.forEach((tokenEvent) => {
            if (!eventNumbers.includes(Number(tokenEvent.eventId))) {
                eventNumbers.push(Number(tokenEvent.eventId));
            }
        });
        eventNumbers.sort((a, b) => a - b);

        // Create tokens - link source/target compared with token event source/target
        tokenLinks.forEach((tokenLink) => {
            tokensData.listOfEvent.forEach((tokenEvent) => {

                const condition = tokenEvent.source === tokenLink.attributes.source.id && tokenEvent.target === tokenLink.attributes.target.id;
                if ((tokenEvent.complete > tokenEvent.start) && condition) {

                    // Get token color
                    const eventColorIndex = eventNumbers.indexOf(Number(tokenEvent.eventId));
                    const tokenColor = (eventColorIndex === -1) ? '#394FD0' : eventColors[eventColorIndex];

                    // Create token graph element
                    const tokenElement = new Token({
                        attrs: { body: { fill: tokenColor } },
                        eventName: tokenEvent.eventName,
                        caseId: tokenEvent.caseId
                    });
                    tokenElement.setText(tokenEvent.eventId);

                    tokenElements.push(tokenElement);
                    // Create token data
                    let token = {
                        data: {
                            id: `follow-${tokenEvent.caseId}-${tokenEvent.start}`,
                            currentLutIndex: 0,
                            lut: [],
                            start: tokenEvent.start,
                            end: tokenEvent.complete,
                            element: tokenElement
                        }
                    };

                    // If range time is between token start/end time, update token position, if not, hide token
                    token.data.move = function (value) {
                        if ((value >= this.start) && (value <= this.end)) {
                            let index = this.currentLutIndex;
                            const lut = this.lut[index];
                            if (lut) {
                                this.element.set('hidden', false);
                                const { x, y } = lut;
                                // Update position, and centre token on path (Minus half of token width and height)
                                this.element.position(x - 12, y - 8);
                                this.element.rotate(lut.rotation, true);
                            }

                            const position = ((value - this.start) / (this.end - this.start)) * 1000;
                            this.currentLutIndex = Math.round(position);
                        }
                        else {
                            this.element.set('hidden', true);
                        }
                    };

                    const allPoints = [];

                    if (allPoints) {
                        const p = new g.Polyline(tokenLink.get('points'));
                        const l = p.length();
                        // Calculate token x,y positions
                        for (let i = 0; i <= 1; i += 0.001) {
                            const lut = {
                                x: 0,
                                y: 0,
                                rotation: 0
                            };
                            const point = p.pointAtLength(i * l);
                            lut.x = point.x;
                            lut.y = point.y;

                            allPoints.push(lut);
                        }
                        // Calculate token rotation using x,y positions
                        const length = allPoints.length;
                        for (let i = 0; i < length; i++) {
                            const lut = allPoints[i];
                            const nextLut = allPoints[i + 1];
                            if (nextLut) {
                                // Calculate angle of line between pair of x,y points
                                const line = new g.Line(lut, nextLut);
                                const angle = Math.round(line.angle());
                                const angleNormalized = g.normalizeAngle(((angle + 90) % 180) - 90);
                                lut.rotation = angleNormalized;
                            }
                            else {
                                // Set rotation for last x,y position
                                lut.rotation = allPoints[i - 1].rotation;
                            }
                        }
                        token.data.lut = allPoints;
                    }
                    tokens.push(token);
                }

            });
        });
        graph.addCells(tokenElements);
    }

    // Register events
    paper.on('blank:pointerdown', (evt) => scroller.startPanning(evt));
    paper.on('blank:mousewheel', (evt, ox, oy, delta) => {
        evt.preventDefault();
        scroller.zoom(delta * 0.2, { min: 0.4, max: 3, grid: 0.2, ox, oy });
    });

    // Create tooltips
    new ui.Tooltip({
        rootTarget: paper.cells,
        target: '.joint-type-app-token',
        content: function (element) {
            const { model: { attributes } } = paper.findView(element);
            return `Event: ${attributes.eventName}<br>ID: ${attributes.caseId}`;
        },
        padding: 10
    });
};
