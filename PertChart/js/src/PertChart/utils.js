import * as icons from './icons';

export function getItemIcon(name, color = null) {
    let icon = icons[name];
    if (!icon)
        throw new Error(`Icon "${name}" not found`);
    if (color)
        icon = icon.replace('currentColor', color);
    return `data:image/svg+xml;utf8,${encodeURIComponent(icon)}`;
}

const canvas = document.createElement('canvas');
const canvasCtx = canvas.getContext('2d');

export function measureTextSize(text, fontSize, fontFamily) {
    canvasCtx.font = `${fontSize}px ${fontFamily}`;
    const lines = text.split('\n');
    const maxWidth = Math.max(...lines.map((line) => canvasCtx.measureText(line).width));
    // Note: 1.2 is a common line height multiplier
    const lineHeight = lines.length * (fontSize * 1.2);
    return {
        width: maxWidth,
        height: lineHeight
    };
}

export function blendWithWhite(hex, opacity) {
    // Ensure valid opacity
    if (opacity < 0 || opacity > 1) {
        throw new Error('Opacity must be between 0 and 1');
    }
    
    // Strip leading "#"
    const cleanHex = hex.replace(/^#/, '');
    
    if (cleanHex.length !== 6) {
        throw new Error('Only full 6-character hex colors are supported (e.g. #336699)');
    }
    
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    
    const blend = (c) => Math.round(opacity * c + (1 - opacity) * 255);
    
    const toHex = (c) => c.toString(16).padStart(2, '0');
    
    return `#${toHex(blend(r))}${toHex(blend(g))}${toHex(blend(b))}`;
}

