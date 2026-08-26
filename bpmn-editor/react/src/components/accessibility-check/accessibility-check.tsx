import './accessibility-check.css';

/**
 * "Check accessibility" pill — the same affordance as the Data Modeling and
 * AI Workflow Builder demos: a link that runs the current URL through
 * accessibilitychecker.org. Floats bottom-left so it never overlaps the
 * bottom-right navigator panel.
 */

const AUDIT_BASE = 'https://www.accessibilitychecker.org/audit/';

export function AccessibilityCheck() {
    return (
        <a
            href={`${AUDIT_BASE}?website=${encodeURIComponent(window.location.href)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Check accessibility"
            className="accessibility-check"
        >
            <span className="accessibility-check-ping">
                <span className="accessibility-check-ping-wave" />
                <span className="accessibility-check-ping-dot" />
            </span>
            <svg viewBox="0 0 512 512" className="accessibility-check-icon" fill="currentColor" aria-hidden="true">
                <path d="M256,112a56,56,0,1,1,56-56A56.06,56.06,0,0,1,256,112Z" />
                <path d="M432,112.8l-.45.12h0l-.42.13c-1,.28-2,.58-3,.89-18.61,5.46-108.93,30.92-172.56,30.92-59.13,0-141.28-22-167.56-29.47a73.79,73.79,0,0,0-8-2.58c-19-5-32,14.3-32,31.94,0,17.47,15.7,25.79,31.55,31.76v.28l95.22,29.74c9.73,3.73,12.33,7.54,13.6,10.84,4.13,10.59.83,31.56-.34,38.88l-5.8,45L150.05,477.44q-.15.72-.27,1.47l-.23,1.27h0c-2.32,16.15,9.54,31.82,32,31.82,19.6,0,28.25-13.53,32-31.94h0s28-157.57,42-157.57,42.84,157.57,42.84,157.57h0c3.75,18.41,12.4,31.94,32,31.94,22.52,0,34.38-15.74,32-31.94-.21-1.38-.46-2.74-.76-4.06L329,301.27l-5.79-45c-4.19-26.21-.82-34.87.32-36.9a1.09,1.09,0,0,0,.08-.15c1.08-2,6-6.48,17.48-10.79l89.28-31.21a16.9,16.9,0,0,0,1.62-.52c16-6,32-14.3,32-31.93S451,107.81,432,112.8Z" />
            </svg>
            {/* Label hidden on phones to keep the pill compact; the aria-label carries it. */}
            <span className="accessibility-check-label">Check accessibility</span>
        </a>
    );
}
