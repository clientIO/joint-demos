// The announcer contract, split from the provider so component files export
// only components (react-refresh boundary rule). The default is a no-op,
// which also keeps consumers safe outside the provider — e.g. the stencil's
// drag preview renders the same symbols without an announcer above them.

import { createContext, useContext } from 'react';

export type Announce = (message: string) => void;

export const AnnouncerContext = createContext<Announce>(() => {});

export function useAnnouncer(): Announce {
    return useContext(AnnouncerContext);
}
