import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Join class names and de-duplicate conflicting Tailwind utilities (later wins).
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
