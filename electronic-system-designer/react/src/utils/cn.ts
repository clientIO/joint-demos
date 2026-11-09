import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// The usual Tailwind class combiner: clsx for conditionals, twMerge so a later
// class wins over an earlier conflicting one (`p-2` + `p-4` → `p-4`).
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
