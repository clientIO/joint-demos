const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);

/** The platform's modifier key, as a shortcut hint starts with it: `⌘Z` on a Mac, `Ctrl+Z` elsewhere. */
export const MODIFIER_KEY = IS_MAC ? '⌘' : 'Ctrl+';

/** The Shift key, as a shortcut hint names it: `⇧` on a Mac, `Shift+` elsewhere. */
export const SHIFT_KEY = IS_MAC ? '⇧' : 'Shift+';
