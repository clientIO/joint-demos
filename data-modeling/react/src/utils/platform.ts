// WebKit (macOS Safari, all iOS browsers, WKWebView) mis-paints <foreignObject>
// subtrees, so node HTML needs Safari-specific fallbacks. UA sniff (no react hook
// covers this) — Apple WebKit but not Chromium-family (which also ships WebKit UA
// tokens). Evaluated once at module load.
const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
export const IS_APPLE_WEBKIT = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
