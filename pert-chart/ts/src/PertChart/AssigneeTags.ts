
import { dia, V } from '@joint/plus';
import type { TaskElement } from './TaskElement';
import {
    TASK_ROW_MARGIN, PROGRESS_ROW_HEIGHT, ASSIGNEE_TEXT_COLOR,
    ASSIGNEE_FONT_FAMILY, ASSIGNEE_FONT_SIZE, ASSIGNEE_GAP, ASSIGNEE_ICON_WIDTH, ASSIGNEE_PADDING,
    TASK_TEXT_COLOR,
} from './theme';
import { getItemIcon } from './utils';

export default class AssigneeTags extends dia.HighlighterView {

    preinitialize() {
        this.UPDATE_ATTRIBUTES = ['assignees', 'color'];
    }

    highlight(elementView: dia.ElementView) {
        this.vel.empty();
        const element = elementView.model as TaskElement;
        const layout = element.getLayout();
        const color = element.get('color') || '#000000';
        const { height } = element.size();
        const y0 = height - layout.height - TASK_ROW_MARGIN - PROGRESS_ROW_HEIGHT - 1;
        layout.assignees.forEach((data, index) => {
            const assignee = data.assignee;
            const correctedAssigneeIconMargin = (data.height - ASSIGNEE_ICON_WIDTH) / 2;
            const x = data.x;
            const y = data.y + y0 + ASSIGNEE_GAP;
            V(
                'g',
                {
                    class: 'assignee',
                    dataIndex: index,
                    transform: `translate(${x}, ${y})`,
                    cursor: 'pointer',
                    event: 'element:assignee:pointerdown',
                    dataAssigneeId: assignee.id,
                    dataTooltip: `${assignee.name} from ${assignee.city}`,
                    dataTooltipPosition: 'bottom',
                },
                [
                    // body
                    V('rect', {
                        width: data.width,
                        height: data.height,
                        fill: color,
                        rx: ASSIGNEE_PADDING + ASSIGNEE_ICON_WIDTH / 2,
                        ry: '50%'
                    }),
                    // icon
                    V('image', {
                        xlinkHref: assignee.icon ?? getItemIcon('assignee', TASK_TEXT_COLOR),
                        x: correctedAssigneeIconMargin,
                        y: correctedAssigneeIconMargin,
                        width: ASSIGNEE_ICON_WIDTH,
                        height: ASSIGNEE_ICON_WIDTH
                    }),
                    // label
                    V('text', {
                        x: ASSIGNEE_ICON_WIDTH + correctedAssigneeIconMargin + ASSIGNEE_PADDING,
                        y: data.height / 2,
                        text: data.text,
                        fill: ASSIGNEE_TEXT_COLOR,
                        fontSize: ASSIGNEE_FONT_SIZE,
                        fontFamily: ASSIGNEE_FONT_FAMILY,
                        textAnchor: 'start',
                        // dominantBaseline: 'central' does not work in Safari
                    }).text(data.text, { textVerticalAnchor: '0.4em' })
                ]
            ).appendTo(this.el);
        });
    }

    static addToTask(taskView: dia.ElementView) {
        AssigneeTags.add(taskView, 'root', 'assignees');
    }
}
