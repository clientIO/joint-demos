// A polite screen-reader announcer: canvas outcomes ("Tracing net SDA — 4
// pins", "Resolved: moves the LED to PB4") are visual changes on the sheet,
// so they must ALSO land in an aria-live region for assistive tech. One
// region at app scope, filled via context (see announcer-context.ts).

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { AnnouncerContext, type Announce } from './announcer-context';

export function AnnouncerProvider({ children }: { readonly children: ReactNode }) {
    const [message, setMessage] = useState('');
    // Alternate a trailing space so announcing the SAME text twice in a row
    // still changes the DOM — otherwise live regions stay silent on repeats.
    const flip = useRef(false);
    const announce = useCallback<Announce>((text) => {
        flip.current = !flip.current;
        setMessage(flip.current ? text + ' ' : text);
    }, []);
    return (
        <AnnouncerContext.Provider value={announce}>
            {children}
            <div role="status" aria-live="polite" className="sr-only">
                {message}
            </div>
        </AnnouncerContext.Provider>
    );
}
