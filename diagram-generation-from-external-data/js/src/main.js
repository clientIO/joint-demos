import { ui, dia, shapes, highlighters, layout, V } from '@joint/plus';
import './styles.css';

const start = async function() {
    // Fetch the latest NHL scores.
    // See NHL-SCORE-API: https://github.com/peruukki/nhl-score-api for the format of the data.
    const response = await fetch(
        'https://nhl-score-api.herokuapp.com/api/scores?startDate=2024-01-20&endDate=2024-01-21'
    );
    const [data] = await response.json();

    const root = new shapes.standard.Circle({
        size: { width: 200, height: 200 },
        attrs: {
            root: {
                magnetSelector: 'body'
            },
            body: {
                stroke: '#ed2637',
                fill: '#fff'
            },
            label: {
                fill: '#ed2637',
                fontSize: 32,
                fontFamily: 'sans-serif',
                lineHeight: 60,
                text: `NHL Score\n${data.date.pretty}`,
                annotations: [
                    {
                        start: 9,
                        end: 10 + data.date.pretty.length,
                        attrs: { fill: '#131e29' }
                    }
                ]
            }
        }
    });

    const cells = [root];

    // Generate the graph from the NHL data.
    data.games.forEach((game, gameIndex) => {
        // games
        const homeTeam = game.teams.home.abbreviation;
        const awayTeam = game.teams.away.abbreviation;
        const homeTeamName = `${game.teams.home.shortName} ${game.teams.home.teamName}`;
        const awayTeamName = `${game.teams.away.shortName} ${game.teams.away.teamName}`;
        let score = `${game.scores[homeTeam]} - ${game.scores[awayTeam]}`;
        if (game.scores.overtime) {
            score += ' (OT)';
        }
        if (game.status.state !== 'FINAL') {
            score += '*';
        }
        const gameShape = new shapes.standard.HeaderedRectangle({
            logos: [homeTeam, awayTeam],
            z: 2,
            direction: 'R',
            offset: 200,
            size: { width: 500, height: 100 },
            attrs: {
                header: {
                    stroke: '#ed2637',
                    fill: '#fff'
                },
                body: {
                    stroke: '#ed2637',
                    fill: '#cad8e3'
                },
                headerText: {
                    fill: '#131e29',
                    fontSize: 16,
                    fontFamily: 'sans-serif',
                    text: `${homeTeamName} vs ${awayTeamName}`,
                    annotations: [
                        {
                            start: homeTeamName.length + 1,
                            end: homeTeamName.length + 4,
                            attrs: { 'font-size': 10 }
                        }
                    ]
                },
                bodyText: {
                    fontSize: 30,
                    fontFamily: 'sans-serif',
                    fill: '#131e29',
                    text: `${homeTeam} ${score} ${awayTeam}`,
                    annotations: [
                        {
                            start: `${homeTeam} `.length,
                            end: `${homeTeam} ${game.scores[homeTeam]}`.length,
                            attrs: { fill: '#ed2637' }
                        },
                        {
                            start: `${homeTeam} ${game.scores[homeTeam]} - `.length,
                            end: `${homeTeam} ${game.scores[homeTeam]} - ${game.scores[awayTeam]}`
                                .length,
                            attrs: { fill: '#ed2637' }
                        }
                    ]
                }
            }
        });
        const dy = (gameIndex - data.games.length / 2) * 10;
        const gameLink = new shapes.standard.Link({
            z: 1,
            source: { id: root.id, anchor: { name: 'right', args: { dy }}},
            target: {
                id: gameShape.id,
                anchor: { name: 'topLeft', args: { dy: 30 }}
            },
            attrs: {
                line: {
                    targetMarker: null,
                    strokeWidth: 1,
                    stroke: '#ed2637'
                }
            }
        });
        // Links from the root goes to the right (The other links goes down).
        gameLink.connector('curve', {
            sourceTangent: { x: 100, y: 0 },
            targetTangent: { x: -200, y: 0 }
        });
        cells.push(gameShape, gameLink);
        // goals
        game.goals.forEach((goal, index) => {
            const goalShape = new shapes.standard.HeaderedRectangle({
                z: 2,
                direction: 'BR',
                size: { width: 250, height: 60 },
                attrs: {
                    header: {
                        stroke: '#131e29',
                        fill: '#fff'
                    },
                    body: {
                        stroke: '#131e29',
                        fill: '#cad8e3'
                    },
                    headerText: {
                        fill: '#131e29',
                        fontFamily: 'sans-serif',
                        text: `${index + 1}. ${goal.team} - ${goal.min}:${goal.sec} (${goal.period
                        })`,
                        annotations: [
                            {
                                start: `${index + 1}. `.length,
                                end: `${index + 1}. ${goal.team}`.length,
                                attrs: { fill: '#ed2637' }
                            }
                        ]
                    },
                    bodyText: {
                        fill: '#131e29',
                        fontFamily: 'sans-serif',
                        text: `Goal: ${goal.scorer.player}`,
                        textAnchor: 'start',
                        x: 10,
                    }
                }
            });
            const goalLink = new shapes.standard.Link({
                z: 1,
                source: {
                    id: gameShape.id,
                    anchor: {
                        name: 'bottomLeft',
                        args: { dx: 30 - 3 * index }
                    }
                },
                target: { id: goalShape.id, anchor: { name: 'left' }},
                attrs: {
                    line: {
                        targetMarker: null,
                        strokeWidth: 1,
                        stroke: '#131e29'
                    }
                }
            });
            cells.push(goalShape, goalLink);
            // assists
            goal.assists.forEach((assist, assistIndex) => {
                const assistShape = new shapes.standard.Rectangle({
                    z: 2,
                    direction: 'BR',
                    size: { width: 200, height: 30 },
                    attrs: {
                        body: {
                            stroke: '#131e29',
                            fill: '#cad8e3'
                        },
                        label: {
                            textAnchor: 'start',
                            x: 10,
                            fill: '#131e29',
                            fontFamily: 'sans-serif',
                            fontSize: 14,
                            text: `Assist: ${assist.player}`
                        }
                    }
                });
                const assistLink = new shapes.standard.Link({
                    z: 1,
                    source: {
                        id: goalShape.id,
                        anchor: {
                            name: 'bottomLeft',
                            args: { dx: 30 - 3 * assistIndex }
                        }
                    },
                    target: { id: assistShape.id, anchor: { name: 'left' }},
                    attrs: {
                        line: {
                            strokeWidth: 1,
                            stroke: '#131e29',
                            strokeDasharray: '2 2',
                            targetMarker: null
                        }
                    }
                });
                cells.push(assistShape, assistLink);
            });
        });
    });

    // Create canvas
    // ------------------------------------

    const graph = new dia.Graph({}, { cellNamespace: shapes });

    const paper = new dia.Paper({
        model: graph,
        async: true,
        sorting: dia.Paper.sorting.APPROX,
        cellViewNamespace: shapes,
        interactive: false,
        background: {
            color: '#dde6ed'
        },
        defaultConnectionPoint: {
            name: 'boundary',
            args: {
                extrapolate: true
            }
        },
        defaultConnector: {
            name: 'curve',
            args: {
                sourceTangent: { x: 10, y: 60 },
                targetTangent: { x: -100, y: 0 }
            }
        }
    });

    const scroller = new ui.PaperScroller({
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

    scroller.render();

    document.getElementById('paper-container').appendChild(scroller.el);

    paper.on('paper:pinch', (evt, ox, oy, scale) => {
        evt.preventDefault();
        scroller.zoom(scale - 1, { min: 0.2, max: 5, ox, oy });
    });

    paper.on('paper:pan', (evt, tx, ty) => {
        evt.preventDefault();
        scroller.el.scrollLeft += tx;
        scroller.el.scrollTop += ty;
    });

    // Enable panning on cells.
    paper.getLayerNode(dia.Paper.Layers.CELLS).style.pointerEvents = 'none';

    paper.on('blank:pointerdown', (evt) => {
        scroller.startPanning(evt);
    });

    // Populate the graph with cells and layout them.
    // ---------------------------------------------

    graph.resetCells(cells);

    const tree = new layout.TreeLayout({
        graph,
        siblingGap: 10,
        parentGap: 30,
        direction: 'BR',
        updateVertices: false
    });

    tree.layout();

    scroller.adjustPaper();
    scroller.positionContent('left', { padding: 100, useModelGeometry: true });
    // Add team icons to the game elements.
    // ------------------------------------

    const logos = {
        ANA: 'https://logotyp.us/files/anaheim-ducks.svg',
        ARI: 'https://logotyp.us/files/arizona-coyotes.svg',
        BOS: 'https://logotyp.us/files/boston-bruins.svg',
        BUF: 'https://logotyp.us/files/buffalo-sabres.svg',
        CAR: 'https://logotyp.us/files/carolina-hurricanes.svg',
        CBJ: 'https://logotyp.us/files/columbus-blue-jackets.svg',
        CGY: 'https://logotyp.us/files/calgary-flames.svg',
        CHI: 'https://logotyp.us/files/chicago-blackhawks.svg',
        COL: 'https://logotyp.us/files/colorado-avalanche.svg',
        DAL: 'https://logotyp.us/files/dallas-stars.svg',
        DET: 'https://logotyp.us/files/detroit-red-wings.svg',
        EDM: 'https://logotyp.us/files/edmonton-oilers.svg',
        FLA: 'https://logotyp.us/files/florida-panthers.svg',
        LAK: 'https://logotyp.us/files/los-angeles-kings.svg',
        MIN: 'https://logotyp.us/files/minnesota-wild.svg',
        MTL: 'https://logotyp.us/files/montreal-canadiens.svg',
        NJD: 'https://logotyp.us/files/new-jersey-devils.svg',
        NSH: 'https://logotyp.us/files/nashville-predators.svg',
        NYI: 'https://logotyp.us/files/new-york-islanders.svg',
        NYR: 'https://logotyp.us/files/new-york-rangers.svg',
        OTT: 'https://logotyp.us/files/ottawa-senators.svg',
        PHI: 'https://logotyp.us/files/philadelphia-flyers.svg',
        PIT: 'https://logotyp.us/files/pittsburgh-penguins.svg',
        SJS: 'https://logotyp.us/files/san-jose-sharks.svg',
        STL: 'https://logotyp.us/files/st-louis-blues.svg',
        TBL: 'https://logotyp.us/files/tampa-bay-lightning.svg',
        TOR: 'https://logotyp.us/files/toronto-maple-leafs.svg',
        VAN: 'https://logotyp.us/files/vancouver-canucks.svg',
        VGK: 'https://logotyp.us/files/vegas-golden-knights.svg',
        WSH: 'https://logotyp.us/files/washington-capitals.svg',
        WPG: 'https://logotyp.us/files/winnipeg-jets.svg',
        SEA: 'https://logotyp.us/files/seattle-kraken.svg'
    };

    class TeamLogos extends highlighters.list {
        createListItem(teamAbbreviation, { width, height }, currentItemNode) {
            const { preserveAspectRatio = 'xMidYMid' } = this.options;
            let itemNode = currentItemNode;
            if (!itemNode) {
                // The item node has not been created yet
                itemNode = V('image', {
                    preserveAspectRatio,
                    width,
                    height
                }).node;
            }
            // Update the item node
            itemNode.setAttribute('href', logos[teamAbbreviation]);
            return itemNode;
        }
    }

    graph.getElements().forEach((element) => {
        if (!element.get('logos')) return;
        TeamLogos.add(element.findView(paper), 'root', 'icons', {
            attribute: 'logos',
            position: 'bottom-left',
            margin: -5,
            size: 80,
            gap: 350
        });
    });
};

start();
