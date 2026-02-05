import { BPMNController } from './BPMNController';

export function addBPMNListeners({ paper, stencil }) {
    const listener = new BPMNController({ stencil, paper });
    listener.startListening();
    return listener;
}
