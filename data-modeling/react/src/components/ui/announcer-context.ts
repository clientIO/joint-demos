// Context + hook for the screen-reader announcer; split from the provider so the
// provider file can own JSX and Fast Refresh stays happy.
import { createContext, useContext } from 'react';

export type Announce = (message: string) => void;

export const AnnouncerContext = createContext<Announce>(() => {});

/** Returns `announce(message)` — speaks a short status to screen readers and
 *  shows a brief matching toast for sighted users. */
export function useAnnounce(): Announce {
    return useContext(AnnouncerContext);
}
