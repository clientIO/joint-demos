import type { dia, ui } from '@joint/plus';
import { BPMNController } from './BPMNController';

export function addBPMNListeners({ paper, stencil }: { paper: dia.Paper, stencil: ui.Stencil }) {
    const listener = new BPMNController({ stencil, paper });
    listener.startListening();
    return listener;
}
