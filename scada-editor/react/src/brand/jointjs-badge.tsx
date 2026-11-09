import './jointjs-badge.css';
import { JointJSMark, JointJSWordmark } from './jointjs-mark';

const JOINTJS_URL = 'https://www.jointjs.com/';
const TRIAL_URL = 'https://www.jointjs.com/free-trial';

/**
 * The "Quiet Mark" demo badge from the JointJS design system: a chamfered navy
 * square showing the JJ symbol, which opens on hover / focus into
 * "Built with JointJS+ · Free trial". Sits in the bottom-left corner of the canvas.
 */
export function JointJSBadge() {
    return (
        <div className="jjw">
            <a
                className="jjw-logo"
                href={JOINTJS_URL}
                target="_blank"
                rel="noopener"
                aria-label="Built with JointJS+ (opens in a new tab)"
            >
                <JointJSMark className="h-[19px] w-auto" />
            </a>
            <div className="jjw-body">
                <div className="jjw-body-in">
                    <a className="jjw-txt" href={JOINTJS_URL} target="_blank" rel="noopener">
                        <span className="jjw-kick">Built with</span>
                        <span className="jjw-lock">
                            <JointJSWordmark className="h-[11px] w-auto" />
                            <em>+</em>
                        </span>
                    </a>
                    <span className="jjw-div" aria-hidden="true" />
                    <a className="jjw-trial" href={TRIAL_URL} target="_blank" rel="noopener">
                        Free trial
                        <svg viewBox="0 0 12 12" aria-hidden="true" className="size-[11px]">
                            <path d="M2 6h7M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    );
}
