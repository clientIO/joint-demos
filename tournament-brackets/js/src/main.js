import { dia, shapes, util, ui, layout, highlighters, routers } from '@joint/plus';
import './styles.css';

const paperContainerEl = document.getElementById('paper-container');
const toolbarContainerEl = document.getElementById('toolbar-container');

const colors = {
    red: '#ed2637',
    blue: '#0075f2',
    yellow: '#f6f740',
    green: '#35FF69',
    gray: '#87A7C0',
    black: '#131e29',
    white: '#dde6ed'
};

// The roster of the players
const roster = [
    {
        id: 1,
        name: 'Abdusattorov, Nodirbek',
        title: 'GM',
        country: '🇺🇿',
        elo: 2814
    },
    {
        id: 2,
        name: 'Wesley, So',
        title: 'GM',
        country: '🇺🇸',
        elo: 2848
    },
    {
        id: 3,
        name: 'Fedorseev, Vladimir',
        title: 'GM',
        country: '🏁',
        elo: 2779
    },
    {
        id: 4,
        name: 'Aronian, Levon',
        title: 'GM',
        country: '🇺🇸',
        elo: 2823
    },
    {
        id: 5,
        name: 'Caruana, Fabiano',
        title: 'GM',
        country: '🇺🇸',
        elo: 2796
    },
    {
        id: 6,
        name: 'Itturizaga, Eduardo',
        title: 'GM',
        country: '🇪🇸',
        elo: 2718
    },
    {
        id: 7,
        name: 'Van Foreest, Jorden',
        title: 'GM',
        country: '🇳🇱',
        elo: 2694
    },
    {
        id: 8,
        name: 'Carlsen, Magnus',
        title: 'GM',
        country: '🇳🇴',
        elo: 2884
    }
];

// Anchor offset
const ax = 5;
const ay = 20;

class MatchElement extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'MatchElement',
            z: 4,
            size: {
                width: 250,
                height: 80
            },
            attrs: {
                root: {
                    magnetSelector: 'body'
                },
                body: {
                    class: 'jj-match-body',
                    fill: colors.black,
                    stroke: colors.red,
                    strokeWidth: 2,
                    width: 'calc(w)',
                    height: 'calc(h)'
                },
                result: {
                    class: 'jj-match-result',
                    fill: 'transparent',
                    stroke: colors.red,
                    strokeWidth: 2,
                    x: 'calc(w - calc(h / 2))',
                    width: 'calc(h / 2)',
                    height: 'calc(h)'
                },
                winner: {
                    class: 'jj-match-winner',
                    stroke: colors.red,
                    strokeWidth: 2,
                    x: 'calc(w - calc(h / 2))',
                    width: 'calc(h / 2)'
                },
                loser: {
                    class: 'jj-match-loser',
                    fill: 'transparent',
                    stroke: colors.red,
                    strokeWidth: 2,
                    x: 'calc(w - calc(h / 2))',
                    width: 'calc(h / 2)'
                },
                player1: {
                    class: 'jj-match-player1',
                    y: 'calc(h / 4)'
                },
                player2: {
                    class: 'jj-match-player2',
                    y: 'calc(3 * h / 4)'
                },
                players: {
                    fill: colors.white,
                    x: 5,
                    textAnchor: 'start',
                    textVerticalAnchor: 'middle',
                    fontFamily: 'sans-serif',
                    fontSize: 15,
                    annotations: [
                        {
                            start: 0,
                            end: 2,
                            attrs: {
                                'font-size': 10,
                                fill: colors.yellow
                            }
                        }
                    ]
                },
                score1: {
                    y: 'calc(h / 4)',
                    text: '0'
                },
                score2: {
                    y: 'calc(3 * h / 4)',
                    text: '0'
                },
                scores: {
                    fill: colors.white,
                    x: 'calc(w - calc(h / 4))',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    fontFamily: 'sans-serif',
                    fontSize: 16,
                    fontWeight: 'bold'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
            <rect @selector="body" />
            <rect @selector="winner" />
            <rect @selector="loser" />
            <rect @selector="result" />
            <text @selector="player1" @group-selector="players" />
            <text @selector="player2" @group-selector="players" />
            <text @selector="score1" @group-selector="scores" />
            <text @selector="score2" @group-selector="scores" />
        `;
    }

    getPlayerName(player) {
        return player
            ? `${player.title} ${player.name}  ${player.country}`
            : '  ---'; // 2 spaces for the GM title
    }

    get score1() {
        return Number(this.attr('score1/text')) || 0;
    }

    set score1(value) {
        this.attr('score1/text', String(value));
    }

    get score2() {
        return Number(this.attr('score2/text')) || 0;
    }

    set score2(value) {
        this.attr('score2/text', String(value));
    }

    get player1() {
        return this.get('player1') || null;
    }

    set player1(value) {
        this.set('player1', value, { ignore: true });
        this.attr('player1/text', this.getPlayerName(roster[value - 1]), {
            ignore: true
        });
    }

    get player2() {
        return this.get('player2') || null;
    }

    set player2(value) {
        this.set('player2', value, { ignore: true });
        this.attr('player2/text', this.getPlayerName(roster[value - 1]), {
            ignore: true
        });
    }

    get winner() {
        return this.get('winner') || 0;
    }

    set winner(value) {
        this.set('winner', value, { ignore: true });
        if (value === 0) {
            this.attr(
                {
                    winner: {
                        height: 'calc(h)',
                        fill: 'transparent',
                        y: 0
                    },
                    loser: {
                        height: 'calc(h)',
                        y: 0
                    }
                },
                { ignore: true }
            );
        } else {
            this.attr(
                {
                    winner: {
                        fill: colors.red,
                        height: 'calc(h / 2)',
                        y: value === 1 ? 0 : 'calc(h / 2)'
                    },
                    loser: {
                        height: 'calc(h / 2)',
                        y: value === 1 ? 'calc(h / 2)' : 0
                    }
                },
                { ignore: true }
            );
        }
        this.attr(
            {
                score1: {
                    dataInvertScore: value !== 2 ? 1 : 0
                },
                score2: {
                    dataInvertScore: value !== 1 ? 1 : 0
                }
            },
            { ignore: true }
        );
    }
}

class RoundElement extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'RoundElement',
            z: -1,
            attrs: {
                body: {
                    d:
                        'M 10 0 H calc(w - 10) l 10 10 V calc(h - 10) l -10 10 H 10 l -10 -10 V 10 z',
                    fill: colors.black,
                    stroke: colors.gray
                },
                label: {
                    text: 'Round',
                    fill: colors.gray,
                    fontFamily: 'sans-serif',
                    fontSize: 20,
                    textAnchor: 'middle',
                    textVerticalAnchor: 'top',
                    x: 'calc(w / 2)',
                    y: 10
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
            <path @selector="body" />
            <text @selector="label" />
        `;
    }
}

class BracketElement extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'BracketElement',
            z: -2,
            attrs: {
                body: {
                    d:
                        'M 10 0 H calc(w - 10) l 10 10 V calc(h - 10) l -10 10 H 10 l -10 -10 V 10 z',
                    fill: colors.black,
                    stroke: colors.gray
                },
                label: {
                    text: 'Bracket',
                    fill: colors.white,
                    fontFamily: 'sans-serif',
                    fontSize: 26,
                    textAnchor: 'middle',
                    textVerticalAnchor: 'top',
                    x: 'calc(w / 2)',
                    y: 10
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
            <path @selector="body" />
            <text @selector="label" />
        `;
    }
}

const namespace = {
    ...shapes,
    MatchElement,
    RoundElement,
    BracketElement
};

const graph = new dia.Graph(
    {},
    {
        cellNamespace: namespace
    }
);

const paper = new dia.Paper({
    model: graph,
    width: '100%',
    height: '100%',
    async: true,
    autoFreeze: true,
    frozen: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: colors.black },
    cellViewNamespace: namespace,
    defaultRouter: {
        name: 'rightAngle'
    },
    defaultConnector: {
        name: 'straight',
        args: {
            cornerType: 'line'
        }
    },
    interactive: false,
    viewport: function(view) {
        const model = view.model;
        if (model.isElement()) return true;
        if (model.isLink()) {
            if (model.get('interBracket')) {
                // Inter-bracket links are visible only when the round is finished
                return commandManager.undoStack.length > model.get('round');
            }
        }
        return true;
    },
    routerNamespace: {
        ...routers,
        // Custom router for the inter-bracket links
        interBracketRouter: function(_, opt, linkView) {
            const sourceBBox = linkView.sourceBBox;
            const targetBBox = linkView.targetBBox;
            const offset = 25;
            const dx = opt.dx || 0;
            return [
                {
                    x: sourceBBox.x + sourceBBox.width + offset + dx,
                    y: linkView.sourceAnchor.y
                },
                { x: sourceBBox.x + sourceBBox.width + offset + dx, y: 700 + dx },
                { x: targetBBox.x - 2 * offset + dx, y: 700 + dx },
                { x: targetBBox.x - 2 * offset + dx, y: linkView.targetAnchor.y }
            ];
        }
    }
});

paperContainerEl.appendChild(paper.el);

const winnerBracketMatches = [
    'W-0-0',
    'W-0-1',
    'W-0-2',
    'W-0-3',
    'W-1-0',
    'W-1-1',
    'W-2-0',
    'W-3-0'
].map((id) => {
    return new MatchElement({
        id,
        bracket: 'W'
    });
});

const winnerBracketLinks = [
    ['W-0-0', 'W-1-0'],
    ['W-0-1', 'W-1-0'],
    ['W-0-2', 'W-1-1'],
    ['W-0-3', 'W-1-1'],
    ['W-1-0', 'W-2-0'],
    ['W-1-1', 'W-2-0'],
    ['W-2-0', 'W-3-0']
].map(([sourceId, targetId], index) => {
    return new shapes.standard.Link({
        id: `${sourceId}-${targetId}`,
        z: 3,
        source: {
            id: targetId,
            anchor: {
                name: 'left',
                args: {
                    dx: -ax,
                    dy: [-ay, ay, -ay, ay, -ay, ay, -ay][index]
                }
            }
        },
        target: {
            id: sourceId,
            selector: 'winner',
            anchor: {
                name: 'right'
            }
        },
        attrs: {
            line: {
                class: 'jj-line',
                targetMarker: null,
                sourceMarker: {
                    d: 'M 12 -6 0 0 12 6 z'
                },
                stroke: colors.red,
                strokeWidth: 3
            },
            wrapper: {
                stroke: colors.black,
                strokeLinecap: 'butt'
            }
        }
    });
});

const loserBracketMatches = [
    'L-0-0',
    'L-0-1',
    'L-1-0',
    'L-1-1',
    'L-2-0',
    'L-3-0'
].map((id) => {
    return new MatchElement({
        id,
        bracket: 'L'
    });
});

const loserBracketLinks = [
    ['L-0-0', 'L-1-0'],
    ['L-0-1', 'L-1-1'],
    ['L-1-0', 'L-2-0'],
    ['L-1-1', 'L-2-0'],
    ['L-2-0', 'L-3-0']
].map(([sourceId, targetId], index) => {
    return new shapes.standard.Link({
        z: 3,
        source: {
            id: targetId,
            anchor: {
                name: 'left',
                args: {
                    dx: -ax,
                    dy: [-ay, -ay, -ay, ay, -ay][index]
                }
            }
        },
        target: {
            id: sourceId,
            selector: 'winner',
            anchor: {
                name: 'right'
            }
        },
        attrs: {
            line: {
                class: 'jj-line',
                targetMarker: null,
                sourceMarker: {
                    d: 'M 12 -6 0 0 12 6 z'
                },
                stroke: colors.red,
                strokeWidth: 3
            },
            wrapper: {
                stroke: colors.black,
                strokeLinecap: 'butt'
            }
        }
    });
});

graph.addCells([
    ...winnerBracketMatches,
    ...loserBracketMatches,
    ...winnerBracketLinks,
    ...loserBracketLinks
]);

const w00 = graph.getCell('W-0-0');
const w01 = graph.getCell('W-0-1');
const w02 = graph.getCell('W-0-2');
const w03 = graph.getCell('W-0-3');
const w10 = graph.getCell('W-1-0');
const w11 = graph.getCell('W-1-1');
const w20 = graph.getCell('W-2-0');
const w30 = graph.getCell('W-3-0');
const l00 = graph.getCell('L-0-0');
const l01 = graph.getCell('L-0-1');
const l10 = graph.getCell('L-1-0');
const l11 = graph.getCell('L-1-1');
const l20 = graph.getCell('L-2-0');
const l30 = graph.getCell('L-3-0');

const tree = new layout.TreeLayout({
    graph,
    direction: 'L',
    parentGap: 120,
    updateVertices: false
});

w20.set('offset', 320);
w30.position(1370, 400);
l30.position(1050, 900);

tree.layout();

const interBracketLinks = [
    ['W-0-0', 'L-0-0'],
    ['W-0-1', 'L-0-0'],
    ['W-0-2', 'L-0-1'],
    ['W-0-3', 'L-0-1'],
    ['W-1-0', 'L-1-1'],
    ['W-1-1', 'L-1-0'],
    ['W-2-0', 'L-3-0'],
    ['L-3-0', 'W-3-0']
].map(([sourceId, targetId], index) => {
    // Make sure that the links do not overlap each other
    // and connect the target at the right position (player1 or player2)
    let dy = 20;
    let dx = 0;
    let round = 0;
    if (index < 4) {
        round = 0;
        dx = -index * 10 + 20;
        if (index % 2 === 0) {
            dy = -20;
        }
    } else if (index < 6) {
        round = 1;
        dx = -(index - 4) * 10 + 15;
    } else if (index < 7) {
        round = 2;
    } else {
        round = 3;
    }

    return new shapes.standard.Link({
        id: `${sourceId}-${targetId}`,
        interBracket: true,
        round,
        z: 2,
        source: {
            id: sourceId,
            // If the link starts in the winner bracket, connect the link source to the loser.
            // The loser is send to the loser bracket.
            // If the link starts in the loser bracket, connect the link source to the winner.
            // This is the case of last match in the loser bracket, in which the winner is send
            // to the grand final (winner bracket).
            selector: sourceId.startsWith('W') ? 'loser' : 'winner',
            anchor: {
                name: 'right'
            }
        },
        target: {
            id: targetId,
            anchor: {
                name: 'left',
                args: {
                    dx: -ax,
                    dy
                }
            }
        },
        router: {
            name: index < 6 ? 'interBracketRouter' : 'rightAngle',
            args: {
                dx
            }
        },
        attrs: {
            line: {
                class: 'jj-line',
                stroke: colors.green,
                strokeWidth: 2,
                targetMarker: {
                    d: 'M 12 -6 0 0 12 6 z'
                }
            },
            wrapper: {
                stroke: colors.black,
                strokeLinecap: 'butt'
            }
        }
    });
});

graph.addCells(interBracketLinks);

const winnerBracketRounds = {
    Quarterfinals: ['W-0-0', 'W-0-1', 'W-0-2', 'W-0-3'],
    Semifinals: ['W-1-0', 'W-1-1'],
    Final: ['W-2-0'],
    'Grand Final': ['W-3-0']
};

const loserBracketRounds = {
    'Round 1': ['L-0-0', 'L-0-1'],
    Quarterfinals: ['L-1-0', 'L-1-1'],
    Semifinals: ['L-2-0'],
    Final: ['L-3-0']
};

const days = [
    ['W-round-0'],
    ['W-round-1', 'L-round-0'],
    ['W-round-2', 'L-round-1'],
    ['L-round-2', 'L-round-3'],
    ['W-round-3']
];

function addGroups(prefix, bracketRounds, bracketName) {
    const roundGroups = [];
    Object.entries(bracketRounds).forEach(([roundName, matchIds], roundIndex) => {
        const matchElements = matchIds.map((matchId) => graph.getCell(matchId));
        const group = new RoundElement({
            id: `${prefix}-round-${roundIndex}`,
            attrs: {
                label: {
                    text: roundName
                }
            }
        });
        graph.addCell(group);
        group.embed(matchElements);
        group.fitToChildren({
            padding: { left: 10, right: 10, top: 40, bottom: 20 }
        });
        roundGroups.push(group);
    });
    const bracketGroup = new BracketElement({
        attrs: {
            label: {
                text: bracketName
            }
        }
    });
    graph.addCell(bracketGroup);
    bracketGroup.embed(roundGroups);
    bracketGroup.fitToChildren({
        padding: { horizontal: 60, top: 60, bottom: 20 }
    });
}

addGroups('W', winnerBracketRounds, 'Winners Bracket');
addGroups('L', loserBracketRounds, 'Losers Bracket');

// Add the players to the matches (the first round)
roster.forEach((player, index) => {
    const match = graph.getCell(`W-0-${Math.floor(index / 2)}`);
    match[index % 2 === 0 ? 'player1' : 'player2'] = index + 1;
});

const commandManager = new dia.CommandManager({
    graph,
    cmdBeforeAdd: (cmdName, cell, graph, options) => {
        // Do not store the changes into the undo stack if the change
        // has the `ignore` flag set to `true`.
        if (options.ignore) return false;
        return true;
    }
});

function calcWinner(match) {
    match.winner =
        match.score1 === match.score2 ? 0 : match.score1 > match.score2 ? 1 : 2;
}

function calcResult(
    match,
    player1Match,
    player2Match,
    player1Winner = true,
    player2Winner = true
) {
    calcPlayerResult(match, player1Match, 'player1', player1Winner);
    calcPlayerResult(match, player2Match, 'player2', player2Winner);
    calcWinner(match);
}

function calcPlayerResult(match, prevMatch, player, winner = true) {
    match[player] =
        prevMatch.winner === 0
            ? 0
            : prevMatch.winner === (winner ? 1 : 2)
                ? prevMatch.player1
                : prevMatch.player2;
}

// Recalculate all the results starting from the first round
function calcResults() {
    calcWinner(w00);
    calcWinner(w01);
    calcWinner(w02);
    calcWinner(w03);
    // Winner bracket
    calcResult(w10, w00, w01, true, true);
    calcResult(w11, w02, w03, true, true);
    calcResult(w20, w10, w11, true, true);
    calcResult(w30, w20, w30, true, true);

    // Loser bracket
    calcResult(l00, w00, w01, false, false);
    calcResult(l01, w02, w03, false, false);
    calcResult(l10, l00, w11, true, false);
    calcResult(l11, l01, w10, true, false);
    calcResult(l20, l10, l11, true, true);
    calcResult(l30, l20, w20, true, false);

    // Grand final
    calcResult(w30, w30, l30, true, true);
    calcPlayerResult(w30, w20, 'player1', true);
}

// Highlight the matches played in a current day
function highlightRounds() {
    const roundIndex = commandManager.undoStack.length;
    const currentRounds = days[roundIndex - 1] || [];
    const roundElements = currentRounds.map((roundId) => graph.getCell(roundId));

    highlighters.mask.removeAll(paper);

    roundElements.forEach((round) => {
        const roundView = round.findView(paper);
        highlighters.mask.add(roundView, 'body', 'round-highlighter', {
            padding: 10,
            attrs: {
                stroke: colors.blue,
                'stroke-width': 3
            }
        });
    });
}

// Each batch represents a day

commandManager.initBatchCommand();
w00.score1 = 3;
w00.score2 = 2;
w01.score1 = 1.5;
w01.score2 = 2.5;
w02.score1 = 2.5;
w02.score2 = 0.5;
w03.score1 = 0.5;
w03.score2 = 2.5;
commandManager.storeBatchCommand();

commandManager.initBatchCommand();
w10.score1 = 2.5;
w10.score2 = 0.5;
w11.score1 = 1.5;
w11.score2 = 2.5;
l00.score1 = 2.0; // changed for simplicity (it was 1.5 - a draw in armageddon sended wesley to the next round)
l00.score2 = 1.5;
l01.score1 = 2;
l01.score2 = 1;
commandManager.storeBatchCommand();

commandManager.initBatchCommand();
w20.score1 = 0.5;
w20.score2 = 2.5;
l10.score1 = 2;
l10.score2 = 0;
l11.score1 = 2;
l11.score2 = 0;
commandManager.storeBatchCommand();

commandManager.initBatchCommand();
l20.score1 = 1.5;
l20.score2 = 0.5;
l30.score1 = 1.5;
l30.score2 = 0.5;
commandManager.storeBatchCommand();

commandManager.initBatchCommand();
w30.score1 = 3;
w30.score2 = 1;
commandManager.storeBatchCommand();

calcResults();
highlightRounds();

const highlighterPlayerId = 8;
let currentHighlighterPlayerId = highlighterPlayerId;

// When the current day changes, recalculate the results,
// highlight the matches played in the current day
// and re-highlight the players' path
commandManager.on('stack', () => {
    calcResults();
    highlightRounds();
    highlightPlayersPath(currentHighlighterPlayerId);
});

// Start rendering the content and highlighters
paper.unfreeze();

// Toolbar

highlightPlayersPath(highlighterPlayerId);

const toolbar = new ui.Toolbar({
    tools: [
        {
            type: 'label',
            name: 'title',
            text: 'Champions Chess Tour Aimchess Rapid 2023'
        },
        {
            type: 'separator'
        },
        {
            type: 'label',
            text: 'Player\'s Path:'
        },
        {
            type: 'select-box',
            name: 'playerSelect',
            width: 300,
            selectBoxOptionsClass: 'jj-player-options',
            selected: highlighterPlayerId,
            options: [
                {
                    value: 0,
                    content: '<i>No player</i>'
                },
                ...roster.map((player) => ({
                    value: player.id,
                    content: `${player.country} <i>${player.title}</i> ${player.name} (${player.elo})`
                }))
            ]
        },
        {
            type: 'separator'
        },
        {
            type: 'label',
            text: 'Results after nth day:'
        },
        {
            type: 'range',
            name: 'historySlider',
            min: 0,
            max: 5,
            value: 5
        }
    ],
    references: {
        commandManager
    }
});

toolbarContainerEl.appendChild(toolbar.el);
toolbar.render();
toolbar.on({
    'historySlider:change': (value) => {
        // The current round is the number of commands in the undo stack
        // (each command represents a day - the scored of matches played in a day)
        const round = commandManager.undoStack.length;
        const diff = round - value;
        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                commandManager.undo();
            }
        } else {
            for (let i = 0; i < -diff; i++) {
                commandManager.redo();
            }
        }
    },
    'playerSelect:option:select': (option) => {
        highlightPlayersPath(option.value);
        currentHighlighterPlayerId = option.value;
    }
});

// Transform the paper so that it shows the both brackets
function transformPaper() {
    paper.transformToFitContent({
        useModelGeometry: true,
        padding: { top: 80, horizontal: 10, bottom: 10 },
        horizontalAlign: 'middle',
        verticalAlign: 'top'
    });
}

window.addEventListener('resize', () => transformPaper());
transformPaper();

// Highlight the player's journey through the tournament.
// (Add highlighter to each element and link that contains the player)
function highlightPlayersPath(playerId) {
    highlighters.addClass.removeAll(paper);
    const playerMatches = graph
        .getElements()
        .filter((el) => el.player1 === playerId || el.player2 === playerId);
    const cells = graph.getSubgraph(playerMatches);
    cells.forEach((cell) => {
        highlighters.addClass.add(
            cell.findView(paper),
            'root',
            'player-highlighter',
            {
                className: 'player-highlighted'
            }
        );
        if (cell.isElement()) {
            highlighters.addClass.add(
                cell.findView(paper),
                'root',
                'player-label-highlighter',
                {
                    className: `player${cell.player1 === playerId ? 1 : 2}-highlighted`
                }
            );
        }
    });
}
