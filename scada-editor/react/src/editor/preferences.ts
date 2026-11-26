import { createContext, useContext, useState } from 'react';

/** The editor settings, remembered in this browser (not saved with the diagram). */
export interface Preferences {
    /** Guide lines align a moved or resized shape with the others. */
    readonly snaplines: boolean;
    /** The palette lists the shapes already in the diagram. */
    readonly inUseGroup: boolean;
    /** A drag on a shape that is not selected pans the canvas instead of moving it. */
    readonly moveSelectedOnly: boolean;
}

const STORAGE_KEY = 'scada-editor-preferences';
// A touch screen moves the selected shapes only by default: a drag elsewhere pans.
const IS_TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const DEFAULTS: Preferences = { snaplines: true, inUseGroup: true, moveSelectedOnly: IS_TOUCH };

function readPreferences(): Preferences {
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
        if (typeof stored !== 'object' || stored === null) {
            return DEFAULTS;
        }
        const value = (key: keyof Preferences) => (key in stored ? Boolean(Reflect.get(stored, key)) : DEFAULTS[key]);
        return { snaplines: value('snaplines'), inUseGroup: value('inUseGroup'), moveSelectedOnly: value('moveSelectedOnly') };
    } catch {
        return DEFAULTS;
    }
}

/** The editor settings and the way to change one, stored in this browser. */
export function usePreferenceState(): readonly [Preferences, (patch: Partial<Preferences>) => void] {
    const [preferences, setPreferences] = useState(readPreferences);
    const update = (patch: Partial<Preferences>) => {
        const next = { ...preferences, ...patch };
        setPreferences(next);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            // Storage blocked: the settings last for this visit only.
        }
    };
    return [preferences, update];
}

/** The editor settings, provided by the app. */
export const PreferencesContext = createContext<readonly [Preferences, (patch: Partial<Preferences>) => void]>([DEFAULTS, () => {}]);

/** The editor settings and the way to change them. */
export function usePreferences(): readonly [Preferences, (patch: Partial<Preferences>) => void] {
    return useContext(PreferencesContext);
}
