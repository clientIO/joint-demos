import { dia, ui, layout } from '@joint/plus';
import { members } from './data';
import { Member, Link } from './shapes';

const COLUMNS = 3;
const MEMBER_WIDTH = 250;
const MEMBER_HEIGHT = 30;
export const LABEL_OFFSET = 10;
const STACK_ELEMENT_GAP = 5;
const STACK_GAP = 0;
const PADDING = 20;

export const init = () => {
    const graph = new dia.Graph;
    const el = document.getElementById('canvas');
    
    const paper = new dia.Paper({
        el,
        width: COLUMNS * MEMBER_WIDTH + PADDING * 2 + STACK_GAP * (COLUMNS - 1),
        height: members.length * (MEMBER_HEIGHT + STACK_ELEMENT_GAP) - STACK_ELEMENT_GAP + PADDING * 2,
        model: graph,
        interactive: false,
        async: true,
        frozen: true,
        sorting: dia.Paper.sorting.APPROX,
        background: { color: '#FBFBFB' },
        defaultConnectionPoint: { name: 'anchor' },
        defaultAnchor: (elementView) => {
            const element = elementView.model;
            const stackIndex = element.get('stackIndex');
            
            if (stackIndex === 0) {
                return element.getBBox().rightMiddle();
            }
            
            return element.getBBox().leftMiddle();
        },
        defaultConnector: { name: 'curve' }
    });
    
    addTeam(members, graph, paper);
    
    const layoutOptions = {
        stackCount: COLUMNS,
        stackSize: MEMBER_WIDTH,
        direction: layout.StackLayout.Directions.TopBottom,
        topLeft: {
            x: PADDING,
            y: PADDING
        },
        stackElementGap: STACK_ELEMENT_GAP,
        stackGap: STACK_GAP
    };
    
    const stackLayoutView = new ui.StackLayoutView({
        paper: paper,
        layoutOptions: layoutOptions,
        validateMoving: (dragData) => (dragData.sourceStack.index === dragData.targetStack.index),
        canInteract: (elementView) => (elementView.model.get('stackIndex') !== 0)
    });
    
    const toolbar = new ui.Toolbar({
        el: document.querySelector('#toolbar'),
        tools: [
            { type: 'button', name: 'shuffle', text: 'Shuffle' }
        ]
    });
    
    stackLayoutView.model.on('update', () => {
        stackLayoutView.model.stacks[COLUMNS - 1].elements.forEach((member, i) => {
            member.attr({
                label: { text: `${i + 1}` }
            });
        });
    });
    
    toolbar.on('shuffle:pointerclick', () => shuffleTeam(stackLayoutView));
    
    shuffleTeam(stackLayoutView);
    
    toolbar.render();
    paper.unfreeze();
};

const addTeam = (teamMembers, graph, paper) => {
    teamMembers.forEach((member, i) => {
        const member1 = new Member({
            size: {
                width: MEMBER_WIDTH,
                height: MEMBER_HEIGHT
            },
            attrs: {
                name: { text: member.name },
                label: { text: member.name.charAt(0).toUpperCase() },
                labelBg: { fill: member.color }
            },
            stackIndex: 0,
            stackElementIndex: i
        });
        
        const labelOffset = LABEL_OFFSET + MEMBER_HEIGHT;
        const member2 = member1.clone().set('stackIndex', COLUMNS - 1);
        member2.attr({
            name: { x: labelOffset },
            labelBg: { x: 0 },
            label: { x: MEMBER_HEIGHT / 2, text: `${i + 1}` }
        });
        
        const link = new Link({ attrs: { line: { stroke: member.color } } });
        
        link.source(member1).target(member2);
        
        graph.addCells([member1, member2, link]);
        member2.findView(paper).vel.addClass('draggable');
    });
};

const shuffleTeam = (stackLayoutView) => {
    const stackModel = stackLayoutView.model;
    const stackMembers = stackModel.stacks[COLUMNS - 1].elements;
    
    for (let i = stackMembers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [stackMembers[i], stackMembers[j]] = [stackMembers[j], stackMembers[i]];
        stackMembers[i].set('stackElementIndex', i);
        stackMembers[j].set('stackElementIndex', j);
    }
    
    stackModel.update();
};
