/**
 * @file options for the Tooltip UI component
 * @see https://docs.jointjs.com/api/ui/Tooltip#options
 */
import { ui } from '@joint/plus';

export const target: ui.Tooltip.Options['target'] = '[data-tooltip]';

export const direction: ui.Tooltip.Options['direction'] = ui.Tooltip.TooltipArrowPosition.Auto;

export const padding: ui.Tooltip.Options['padding'] = 12;

export const animation: ui.Tooltip.Options['animation'] = {
    delay: '250ms'
};


