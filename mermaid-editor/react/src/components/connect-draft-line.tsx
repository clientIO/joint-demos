import { createPortal } from 'react-dom';
import type { ConnectDraft } from './use-connect-drag';

/**
 * The connection being dragged out of a "+" button: a line from the button
 * to the pointer, solid once a shape underneath will take it. Portalled to
 * the body and fixed to the window, so it stays put while the canvas under
 * it does not scroll.
 */
export function ConnectDraftLine({ draft }: Readonly<{ draft: ConnectDraft }>) {
    return createPortal(
        <svg className={`connect-draft${draft.targetId === null ? '' : ' is-snapped'}`} aria-hidden>
            <line x1={draft.from.x} y1={draft.from.y} x2={draft.to.x} y2={draft.to.y} />
            <circle cx={draft.to.x} cy={draft.to.y} r={5} />
        </svg>,
        document.body
    );
}
