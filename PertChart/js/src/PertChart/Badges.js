import { V, highlighters } from '@joint/plus';
import { BADGE_GAP, BADGE_ICON_SIZE, BADGE_ICON_MARGIN, TASK_PADDING, FILTER_SHADOW_ID, TASK_OUTLINE_COLOR, } from './theme';

export default class Badges extends highlighters.list {
    createListItem({ icon, description }, { width, height }, currentItemNode) {
        let itemNode = currentItemNode;
        if (!itemNode) {
            // The item node has not been created yet
            itemNode = V('g', {
                dataTooltip: description || '',
                dataTooltipPosition: 'bottom',
            }, [
                V('circle', {
                    cx: width / 2,
                    cy: height / 2,
                    r: width / 2,
                    fill: 'white',
                    strokeWidth: 1,
                    stroke: TASK_OUTLINE_COLOR,
                    filter: `url(#${FILTER_SHADOW_ID})`
                }),
                V('image', {
                    event: 'element:badge:pointerdown',
                    cursor: 'pointer',
                    x: BADGE_ICON_MARGIN,
                    y: BADGE_ICON_MARGIN,
                    width: width - 2 * BADGE_ICON_MARGIN,
                    height: height - 2 * BADGE_ICON_MARGIN,
                    dataName: icon
                })
            ]).node;
        }
        // Update the item node
        itemNode.querySelector('image').setAttribute('href', icon);
        return itemNode;
    }
    
    static addToTask(taskView) {
        const badgeSize = BADGE_ICON_SIZE + 2 * BADGE_ICON_MARGIN;
        Badges.add(taskView, 'root', 'badges', {
            attribute: 'badges',
            position: 'top-right',
            direction: 'row',
            size: badgeSize,
            gap: BADGE_GAP,
            margin: { top: -badgeSize + BADGE_ICON_MARGIN, right: TASK_PADDING },
        });
    }
}
