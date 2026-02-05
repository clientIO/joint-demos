// Import JointJS+
import '@joint/plus/joint-plus.css';
import * as joint from '@joint/plus';

// Make joint available globally for the existing scripts
window.joint = joint;
window.V = joint.V;

// SVG polyfill
SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement || function (toElement) {
    return toElement.getScreenCTM().inverse().multiply(this.getScreenCTM());
};

// Load existing scripts in order
const scripts = [
    './src/controller.js',
    './src/controllers/view-controller.js',
    './src/controllers/edit-controller.js',
    './src/dijkstra.js'
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

loadScripts();
