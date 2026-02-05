import { ui } from '@joint/plus';

export function initializeTooltips(rootEl: HTMLElement) {
    const tooltip = new ui.Tooltip({
        rootTarget: rootEl,
        container: rootEl,
        target: '[data-tooltip]',
        padding: 10,
        animation: { delay: '200ms' }
    });

    return { tooltip };
}
