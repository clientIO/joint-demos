// Import JointJS+
import '@joint/plus/joint-plus.css';
import '../css/vector-editor.css';
import '../css/toolbar.css';
import '../css/header.css';
import * as joint from '@joint/plus';

// Make joint available globally for the existing scripts
window.joint = joint;
window.V = joint.V;

// Load existing scripts in order
const scripts = [
    './src/vector-editor.js',
    './src/index.js'
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
