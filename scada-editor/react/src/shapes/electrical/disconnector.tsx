import type { SymbolProps } from '../types';
import { DISCONNECTOR_BLADE_Y as BLADE_Y } from './electrical';

// The insulator posts: the hinge, the contact (parts of the width)
const POSTS = [0.2, 0.8];

/** A disconnector: a knife switch on two insulators, its blade lifted off the contact when open. */
export function DisconnectorDrawing({ width: w, height: h, data, surface }: SymbolProps) {
    const isOpen = Boolean(data.plant?.open);
    const sheds = POSTS.map((x) => `M ${x * w - 10} ${0.5 * h} H ${x * w + 10} M ${x * w - 10} ${0.68 * h} H ${x * w + 10}`).join(' ');
    const blade = isOpen ? `M ${0.2 * w} ${BLADE_Y} L ${0.7 * w} 0` : `M ${0.2 * w} ${BLADE_Y} L ${0.8 * w} ${BLADE_Y}`;
    return (
        <>
            <rect y={0.85 * h} width={w} height={0.15 * h} rx={2} ry={2} strokeWidth={1.5} {...surface.fill('dark')} {...surface.stroke('var(--shape-metal-dark-edge)')} />
            {POSTS.map((x) => (
                <rect
                    key={x}
                    x={x * w - 7}
                    y={BLADE_Y}
                    width={14}
                    height={0.5 * h}
                    rx={3}
                    ry={3}
                    stroke="var(--shape-porcelain-3)"
                    strokeWidth={1.5}
                    {...surface.material('porcelain')}
                />
            ))}
            <path d={sheds} stroke="var(--shape-porcelain-3)" strokeWidth={3} strokeLinecap="round" />
            <path d={`M 0 ${BLADE_Y} H ${0.2 * w} M ${0.8 * w} ${BLADE_Y} H ${w}`} stroke="var(--shape-copper-3)" strokeWidth={4} />
            <path d={blade} stroke="var(--shape-copper-2)" strokeWidth={6} strokeLinecap="round" />
            <path
                d={`M ${0.8 * w - 6} ${BLADE_Y - 7} V ${BLADE_Y} H ${0.8 * w + 6} V ${BLADE_Y - 7}`}
                fill="none"
                stroke="var(--shape-copper-3)"
                strokeWidth={3}
                strokeLinejoin="round"
            />
        </>
    );
}
