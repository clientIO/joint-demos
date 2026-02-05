// Import JointJS+
import '@joint/plus/joint-plus.css';
import '../css/dynamic-stencil.css';
import * as joint from '@joint/plus';

// Make joint available globally for the existing scripts
window.joint = joint;

// Load existing scripts in order
const scripts = [
    './src/dynamic-stencil.js'
];

// Load scripts sequentially
async function loadScripts() {
    for (const src of scripts) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
}

if (scripts.length > 0) {
    loadScripts();
}
