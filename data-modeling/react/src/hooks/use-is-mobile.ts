import { useEffect, useState } from 'react';

// True below the `lg` breakpoint (Tailwind's 1024px) — the width where the toolbar folds and
// the docked panels become bottom sheets. Reactive to viewport changes via matchMedia.
const QUERY = '(max-width: 1023.98px)';

export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches,
    );
    useEffect(() => {
        const mql = window.matchMedia(QUERY);
        const onChange = (): void => setIsMobile(mql.matches);
        onChange();
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);
    return isMobile;
}
