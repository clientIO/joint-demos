import { BPMNController } from './BPMNController';

import type { dia, ui } from '@joint/plus';

export function addBPMNListeners({ paper, stencil }: { paper: dia.Paper, stencil: ui.Stencil }) {
    const listener = new BPMNController({ stencil, paper });
    listener.startListening();
    return listener;
}
