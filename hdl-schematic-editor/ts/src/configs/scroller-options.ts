/**
 * @file options for the PaperScroller UI component
 * @see https://docs.jointjs.com/api/ui/PaperScroller#options
 */
import type { ui } from '@joint/plus';

// This is useful for our `Note` shape which can be dragged around freely.
export const autoResizePaper: ui.PaperScroller.Options['autoResizePaper'] = true;

export const borderless: ui.PaperScroller.Options['borderless'] = true;

export const scrollWhileDragging: ui.PaperScroller.Options['scrollWhileDragging'] = true;

export const cursor: ui.PaperScroller.Options['cursor'] = 'default';

export const baseWidth: ui.PaperScroller.Options['baseWidth'] = 10;

export const baseHeight: ui.PaperScroller.Options['baseHeight'] = 10;

