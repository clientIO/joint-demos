import type { ShapeData } from '../types';

/** Whether the valve is open: any opening counts. */
export function isOpen(data: ShapeData): boolean {
    return Boolean(data.plant?.open);
}

/** How much the valve is open, 0 - 1: fully open when not set. */
export function openingOf(data: ShapeData): number {
    const open = data.plant?.open;
    const opening = typeof open === 'boolean' ? Number(open) : (open ?? 1);
    return Math.max(0, Math.min(1, opening));
}
