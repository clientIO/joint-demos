import { TASK_COLORS, TASK_BG_COLOR, TASK_FONT_SIZE, TASK_HEADER_HEIGHT, TASK_PADDING, TASK_ROW_MARGIN, TASK_TEXT_COLOR, TASK_TEXT_DISABLED_COLOR, TASK_WIDTH, TASK_BORDER_RADIUS, PROGRESS_FONT_SIZE, PROGRESS_LABEL_WIDTH, PROGRESS_MARGIN, PROGRESS_ROW_HEIGHT, ASSIGNEE_FONT_FAMILY, ASSIGNEE_FONT_SIZE, ASSIGNEE_GAP, ASSIGNEE_ICON_WIDTH, ASSIGNEE_PADDING, FILTER_SHADOW_ID, ASSIGNEE_ROW_HEIGHT, TASK_OUTLINE_COLOR } from './theme';
import { blendWithWhite, getItemIcon, measureTextSize } from './utils';
import { shapes, util } from '@joint/plus';

const { Record, RecordView } = shapes.standard;

export class TaskElement extends Record {

    preinitialize() {
        this.markup = util.svg /* xml */ `
            <path @selector="body" />
            <path @selector="nameRow" @group-selector="rows"/>
            <rect @selector="progressBarBackground" />
            <rect @selector="progressBar" />
            <path @selector="assigneeRow" @group-selector="rows"/>
            <text @selector="name" @group-selector="labels"/>
            <text @selector="assignee" @group-selector="labels"/>
            <text @selector="progress" @group-selector="labels"/>
        `;
    }

    defaults() {
        return {
            ...super.defaults,
            type: 'task',
            z: 2,
            size: { width: TASK_WIDTH },
            // padding: will be set dynamically based on the assignees
            itemHeight: 30,
            itemIcon: { width: 16, height: 16, padding: TASK_PADDING },
            itemOffset: 0,
            attrs: util.defaultsDeep({
                root: {
                    magnetSelector: 'body',
                    cursor: 'pointer',
                },
                body: {
                    d: `M 0 ${TASK_BORDER_RADIUS} A ${TASK_BORDER_RADIUS} ${TASK_BORDER_RADIUS} 0 0 1 ${TASK_BORDER_RADIUS} 0 L calc(w - ${TASK_BORDER_RADIUS}) 0 A ${TASK_BORDER_RADIUS} ${TASK_BORDER_RADIUS} 0 0 1 calc(w) ${TASK_BORDER_RADIUS} L calc(w) calc(h - ${TASK_BORDER_RADIUS}) A ${TASK_BORDER_RADIUS} ${TASK_BORDER_RADIUS} 0 0 1 calc(w - ${TASK_BORDER_RADIUS}) calc(h) L ${TASK_BORDER_RADIUS} calc(h) A ${TASK_BORDER_RADIUS} ${TASK_BORDER_RADIUS} 0 0 1 0 calc(h - ${TASK_BORDER_RADIUS}) Z`,
                    fill: TASK_BG_COLOR,
                    stroke: TASK_OUTLINE_COLOR,
                    strokeWidth: 1,
                    filter: { id: FILTER_SHADOW_ID, name: 'dropShadow', args: { dx: 2, dy: 2, color: '#ccc' } }
                },
                nameRow: {
                    d: `M 0 ${TASK_HEADER_HEIGHT} L 0 ${TASK_BORDER_RADIUS} A ${TASK_BORDER_RADIUS} ${TASK_BORDER_RADIUS} 0 0 1 ${TASK_BORDER_RADIUS} 0 L calc(w - ${TASK_BORDER_RADIUS}) 0 A ${TASK_BORDER_RADIUS} ${TASK_BORDER_RADIUS} 0 0 1 calc(w) ${TASK_BORDER_RADIUS} L calc(w) ${TASK_HEADER_HEIGHT} Z`,
                    // fill: will be set dynamically based on the task state
                },
                assigneeRow: {
                    stroke: TASK_OUTLINE_COLOR,
                    fill: 'none'
                },
                progressBarBackground: {
                    x: PROGRESS_MARGIN,
                    y: `calc(h - ${PROGRESS_ROW_HEIGHT - PROGRESS_MARGIN})`,
                    rx: 6,
                    ry: '50%',
                    width: `calc(w - ${2 * PROGRESS_MARGIN + PROGRESS_LABEL_WIDTH})`,
                    height: PROGRESS_ROW_HEIGHT - 2 * PROGRESS_MARGIN,
                    fill: '#EBF1F5',
                },
                progressBar: {
                    x: PROGRESS_MARGIN,
                    y: `calc(h - ${PROGRESS_ROW_HEIGHT - PROGRESS_MARGIN})`,
                    rx: 6,
                    ry: '50%',
                    // width: 0, // will be set dynamically based on the progress
                    height: PROGRESS_ROW_HEIGHT - 2 * PROGRESS_MARGIN,
                    fill: '#F2F2F2',
                },
                name: {
                    y: TASK_HEADER_HEIGHT / 2,
                    fontWeight: 'bold',
                    textWrap: {
                        width: 'calc(w - 20)',
                        maxLineCount: 2,
                        ellipsis: true
                    },
                },
                progress: {
                    x: `calc(w - ${(PROGRESS_LABEL_WIDTH + PROGRESS_MARGIN) / 2})`,
                    y: `calc(h - ${PROGRESS_ROW_HEIGHT / 2})`,
                    fill: TASK_TEXT_COLOR,
                    fontSize: PROGRESS_FONT_SIZE,
                },
                assignee: {
                    fill: TASK_TEXT_DISABLED_COLOR,
                    fontSize: ASSIGNEE_FONT_SIZE
                },
                labels: {
                    x: 'calc(w / 2)',
                    fill: TASK_TEXT_COLOR,
                    fontSize: TASK_FONT_SIZE,
                    fontFamily: 'Arial, sans-serif',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                },
                itemBodies: {
                    fill: 'transparent',
                },
                itemLabels: {
                    fontSize: TASK_FONT_SIZE,
                    fontFamily: 'Arial, sans-serif',
                    fill: TASK_TEXT_COLOR,
                    itemText: {
                        textWrap: false
                    }
                },
                // @ts-ignore
            }, super.defaults.attrs)
        };
    }

    initialize(...args) {
        super.initialize(...args);
        this.on('change', (el, opt) => {
            if ('assignees' in el.changed) {
                this.resetLayout(opt);
            }
        });
        this.resetLayout();
    }

    getLayout() {
        if (!this._layout) {
            this.runLayout();
        }
        return this._layout;
    }

    resetLayout(opt = {}) {
        const layout = this.runLayout();
        this._layout = layout;
        const assigneeRowHeight = layout.height + 2 * TASK_ROW_MARGIN;
        this.prop({
            attrs: {
                assigneeRow: {
                    d: `M 0 calc(h - ${assigneeRowHeight + PROGRESS_ROW_HEIGHT - 1}) H calc(w) M 0 calc(h - ${PROGRESS_ROW_HEIGHT + TASK_ROW_MARGIN}) H calc(w)`,
                },
                assignee: {
                    y: `calc(h - ${assigneeRowHeight / 2 + PROGRESS_ROW_HEIGHT})`,
                }
            },
            padding: {
                left: 1,
                right: 1,
                top: TASK_HEADER_HEIGHT + TASK_ROW_MARGIN,
                bottom: assigneeRowHeight + PROGRESS_ROW_HEIGHT
            }
        }, opt);
    }

    runLayout() {
        const assignees = this.getAssignees();
        const x0 = TASK_PADDING; // x position for the assignees
        const y0 = 0; // y position for the assignees

        if (assignees.length === 0) {
            return {
                assignees: [],
                width: TASK_WIDTH,
                height: ASSIGNEE_ROW_HEIGHT
            };
        }
        const assigneeHeight = ASSIGNEE_FONT_SIZE + ASSIGNEE_PADDING * 2;
        const maxWidth = TASK_WIDTH - TASK_PADDING * 2;
        let x = TASK_PADDING;
        let y = y0;
        const assigneeLayouts = assignees.map((assignee) => {
            // TODO: a caching should be implemented here
            // especially if there is a limited set of assignees
            let text = assignee.name;
            const size = measureTextSize(text, ASSIGNEE_FONT_SIZE, ASSIGNEE_FONT_FAMILY);
            const maxTextWidth = maxWidth - ASSIGNEE_ICON_WIDTH - 4 * ASSIGNEE_PADDING;
            if (size.width > maxTextWidth) {
                size.width = maxTextWidth;
                text = util.breakText(text, { width: maxTextWidth }, {
                    fontSize: ASSIGNEE_FONT_SIZE,
                    fontFamily: ASSIGNEE_FONT_FAMILY
                }, {
                    maxLineCount: 1,
                    ellipsis: true
                });
            }
            size.height += ASSIGNEE_PADDING * 2; // padding around the text
            size.width += ASSIGNEE_PADDING * 2; // padding around the text
            size.width += ASSIGNEE_ICON_WIDTH + 2 * ASSIGNEE_PADDING;
            if (x + size.width > maxWidth && x !== x0) {
                x = x0; // reset x to padding if it exceeds max width
                y += assigneeHeight + ASSIGNEE_GAP; // move to next line
            }
            const assigneeLayout = {
                assignee,
                x,
                y,
                rightX: x + size.width,
                bottomY: y + size.height,
                text,
                width: size.width,
                height: size.height
            };
            x += size.width + ASSIGNEE_GAP;
            return assigneeLayout;
        });

        const assigneesWidth = assigneeLayouts.reduce((acc, assignee) => Math.max(acc, assignee.rightX), 0) - x0;
        const assigneesHeight = assigneeLayouts.reduce((acc, assignee) => Math.max(acc, assignee.bottomY), y0) - y0;

        return {
            assignees: assigneeLayouts,
            width: assigneesWidth + TASK_PADDING * 2,
            height: assigneesHeight + ASSIGNEE_GAP * 2
        };
    }

    getAssignees() {
        return this.get('assignees') || [];
    }

    addAssignee(assignee) {
        const assignees = this.getAssignees();
        if (assignees.find(a => a.id === assignee.id)) {
            return;
        }
        this.set('assignees', [...assignees, assignee]);
    }

    removeAssignee(assigneeId) {
        const assignees = this.getAssignees();
        const index = assignees.findIndex(a => a.id === assigneeId);
        if (index !== -1) {
            this.set('assignees', assignees.slice(0, index).concat(assignees.slice(index + 1)));
        }
    }

    hasAssignee(assigneeId) {
        const assignees = this.getAssignees();
        return assignees.some(a => a.id === assigneeId);
    }

    static formatDate(date) {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    static getEndDate(startDate, duration) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration);
        return endDate;
    }

    static fromData(data) {
        const { id, name = '', assignees, percentDone = 0, startDate, duration, badges, color: userColor, } = data;

        const ratioDone = percentDone / 100;
        const endDate = startDate ? TaskElement.getEndDate(new Date(startDate), duration).toISOString() : null;

        let color, secondaryColor;
        if (userColor) {
            secondaryColor = userColor;
            color = blendWithWhite(userColor, 0.3);
        }
        else {
            const state = percentDone === 100 ? 'done' : (percentDone === 0 ? 'todo' : 'in-progress');
            color = TASK_COLORS[state].primary;
            secondaryColor = TASK_COLORS[state].secondary || color;
        }

        return new TaskElement({
            id: `${id}`,
            assignees,
            color,
            secondaryColor,
            badges,
            attrs: {
                name: {
                    text: name
                },
                assignee: {
                    text: assignees.length > 0 ? '' : 'No assignees',
                },
                progress: {
                    text: `${percentDone}%`,
                },
                progressBar: {
                    width: `calc(${ratioDone} * w - ${ratioDone * (2 * PROGRESS_MARGIN + PROGRESS_LABEL_WIDTH)})`,
                    fill: secondaryColor,
                },
                nameRow: {
                    fill: color
                },
            },
            items: [
                [{
                        id: 'task_id',
                        label: `${id}`,
                        icon: getItemIcon('id', secondaryColor)
                    }, {
                        id: 'start_date',
                        label: startDate ? TaskElement.formatDate(new Date(startDate)) : '-',
                        icon: getItemIcon('start', secondaryColor)
                    }],
                [{
                        id: 'duration',
                        label: duration ? `${duration} day${duration > 1 ? 's' : ''}` : '-',
                        icon: getItemIcon('duration', secondaryColor)
                    }, {
                        id: 'end_date',
                        label: endDate ? TaskElement.formatDate(new Date(endDate)) : '-',
                        icon: getItemIcon('end', secondaryColor)
                    }]
            ]
        });
    }
}

export const TaskElementView = RecordView;
