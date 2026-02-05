import { dia, ui, shapes, layout } from '@joint/plus';
import { Link, Member } from './shapes';

export const init = () => {
    
    const cellNamespace = Object.assign(Object.assign({}, shapes), { Link,
        Member });
    
    const canvas = document.getElementById('canvas');
    
    const graph = new dia.Graph({}, { cellNamespace: cellNamespace });
    
    const paper = new dia.Paper({
        model: graph,
        width: 1000,
        height: 600,
        gridSize: 10,
        async: true,
        frozen: true,
        clickThreshold: 10,
        sorting: dia.Paper.sorting.APPROX,
        background: { color: '#F3F7F6' },
        cellViewNamespace: cellNamespace,
        defaultConnector: {
            name: 'straight',
            args: {
                cornerType: 'cubic',
            }
        },
        defaultAnchor: {
            name: 'modelCenter'
        },
        defaultLink: () => new Link()
    });
    
    const scroller = new ui.PaperScroller({
        paper,
        autoResizePaper: true,
        cursor: 'grab',
        baseWidth: 1,
        baseHeight: 1,
        contentOptions: {
            allowNewOrigin: 'any',
            padding: 100,
            useModelGeometry: true
        }
    });
    
    const members = [
        createMember('Founder & Chairman', 'Pierre Omidyar', 'assets/images/1.png'),
        createMember('President & CEO', 'Margaret C. Whitman', 'assets/images/2.png'),
        createMember('President, PayPal', 'Mia Thompson', 'assets/images/3.png'),
        createMember('President, Ebay Global Marketplaces', 'Devin Wenig', 'assets/images/4.png'),
        createMember('Senior Vice President Human Resources', 'Olivia S. Skoll', 'assets/images/5.png'),
        createMember('Senior Vice President Controller', 'Sophia P. Westly', 'assets/images/6.png')
    ];
    
    const connections = [
        createLink(members[0], members[1]),
        createLink(members[1], members[2]),
        createLink(members[1], members[3]),
        createLink(members[1], members[4]),
        createLink(members[1], members[5])
    ];
    
    graph.addCells([...members, ...connections]);
    canvas.appendChild(scroller.el);
    
    const treeLayout = new layout.TreeLayout({
        graph: graph,
        direction: 'R',
        parentGap: 75,
        siblingGap: 41
    });
    
    new ui.TreeLayoutView({
        paper,
        model: treeLayout,
        className: 'tree-layout member-tree-layout',
        useModelGeometry: true,
        clone: (element) => {
            const clone = element.clone();
            clone.attr(['memberAddButtonBody', 'display'], 'none');
            clone.attr(['memberRemoveButtonBody', 'display'], 'none');
            clone.attr(['body', 'stroke'], 'none');
            return clone;
        },
        previewAttrs: {
            parent: {
                rx: 40,
                ry: 40
            }
        }
    });
    
    treeLayout.layout();
    
    scroller.render().centerContent({ useModelGeometry: true });
    
    paper.unfreeze();
    
    paper.on('element:pointermove', (elementView) => {
        paper.el.classList.add('hide-buttons');
        paper.el.classList.remove('show-buttons');
        elementView.model.attr(['body', 'strokeWidth'], 2);
        
    });
    
    paper.on('element:pointerup', (elementView) => {
        paper.el.classList.remove('hide-buttons');
        paper.el.classList.add('show-buttons');
        elementView.model.attr(['body', 'strokeWidth'], 1);
    });
    
    paper.on('blank:pointerdown', (evt) => scroller.startPanning(evt));
    
    paper.on('element:member:add', (elementView, evt) => {
        evt.stopPropagation();
        // Adding a new member
        const newMember = createMember('Employee', 'New Employee', 'assets/images/1.png');
        const newConnection = createLink(elementView.model, newMember);
        graph.addCells([newMember, newConnection]);
        treeLayout.layout();
    });
    
    paper.on('element:remove', (elementView, evt) => {
        evt.stopPropagation();
        const preventReconnection = evt.ctrlKey || evt.metaKey;
        
        graph.startBatch('remove-member');
        if (preventReconnection) {
            elementView.model.remove();
            treeLayout.layout();
        }
        else {
            treeLayout.removeElement(elementView.model);
        }
        graph.stopBatch('remove-member');
    });
    
    paper.on('element:edit', (elementView, evt) => {
        evt.stopPropagation();
        // A member edit
        const inspector = new ui.Inspector({
            cellView: elementView,
            live: false,
            className: 'joint-inspector joint-member-inspector',
            inputs: {
                'attrs/label/text': {
                    type: 'text',
                    label: 'Name',
                    index: 1
                },
                'attrs/description/text': {
                    type: 'text',
                    label: 'Rank',
                    index: 2
                },
                'attrs/icon/xlinkHref': {
                    type: 'select-button-group',
                    target: '.joint-dialog .fg',
                    label: 'Avatar',
                    index: 3,
                    options: avatarOptions(elementView)
                }
            }
        });
        
        const dialog = new ui.Dialog({
            type: 'inspector-dialog',
            width: 350,
            title: 'Edit Member',
            className: 'joint-dialog joint-member-dialog',
            closeButton: false,
            content: inspector.render().el,
            buttons: [{
                    content: 'Cancel',
                    action: 'cancel',
                }, {
                    content: 'Apply',
                    action: 'apply'
                }]
        });
        
        dialog.on({
            'action:cancel': () => {
                inspector.remove();
                dialog.close();
            },
            'action:apply': () => {
                inspector.updateCell();
                inspector.remove();
                dialog.close();
            }
        });
        dialog.open();
    });
    
    // Tree Layout Rank Selection
    const currentDirection = treeLayout.get('direction');
    const options = [
        { value: 'L', content: 'Right-Left' },
        { value: 'R', content: 'Left-Right' },
        { value: 'T', content: 'Bottom-Top' },
        { value: 'B', content: 'Top-Bottom' }
    ].map(option => Object.assign({}, option, { selected: option.value === currentDirection }));
    
    const directionPicker = new ui.SelectBox({
        width: 150,
        options
    });
    
    directionPicker.on('option:select', (option) => {
        graph.getCells().forEach(cell => cell.unset('direction'));
        treeLayout.set('direction', option.value);
        treeLayout.layout();
        if (!paper.hasScheduledUpdates()) {
            return;
        }
        paper.once('render:done', function () {
            scroller.scrollToContent({ useModelGeometry: true });
        });
    });
    
    const direction = document.getElementById('orgchart-direction');
    direction.appendChild(directionPicker.render().el);
    document.getElementById('orgchart-direction-container').style.visibility = 'visible';
};

const createMember = (rank, name, image) => {
    return new Member({
        attrs: {
            label: {
                text: name
            },
            description: {
                text: rank
            },
            icon: {
                xlinkHref: image
            }
        }
    });
};

const createLink = (source, target) => {
    return new Link({
        source: { id: source.id },
        target: { id: target.id },
    });
};

const avatarOptions = (elementView) => {
    const options = [];
    const ASSETS_LENGTH = 10;
    for (let i = 1; i <= ASSETS_LENGTH; i++) {
        const asset = `assets/images/${i}.png`;
        const option = {
            icon: asset,
            value: asset,
            selected: elementView.model.attr(['icon', 'xlinkHref']) === asset
        };
        options.push(option);
    }
    return options;
};

