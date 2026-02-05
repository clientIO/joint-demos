import { shapes, util } from '@joint/plus';

export class AddButton extends shapes.standard.Rectangle {
    
    defaults() {
        return util.defaultsDeep({
            type: 'kanban.AddButton',
            attrs: {
                body: {
                    strokeWidth: 1,
                    stroke: '#DDDDDD',
                    rx: 4,
                    ry: 4
                },
                label: {
                    text: '+ Add Task',
                    fontSize: 14,
                    fontFamily: 'Helvetica'
                }
            },
            stackElementIndex: Number.MAX_SAFE_INTEGER / 2,
            z: -2
        }, super.defaults);
    }
    
    static isAddButton(cell) {
        return cell.get('type') === 'kanban.AddButton';
    }
}
