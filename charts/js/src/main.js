// Import JointJS+
import '@joint/plus/joint-plus.css';
import * as joint from '@joint/plus';

// Make joint available globally for the existing scripts
window.joint = joint;

// Load existing scripts in order
const scripts = [
    './src/charts-ams-temp.js',
    './src/charts-ams-rain.js',
    './src/charts-global-traffic.js',
    './src/charts-pie-visits.js',
    './src/charts-donut.js',
    './src/charts-knobs.js'
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
