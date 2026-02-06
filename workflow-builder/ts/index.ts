import 'core-js/stable';
import 'regenerator-runtime/runtime';
import '@joint/plus/joint-plus.css';
import './styles/main.scss';
import { App } from './src/app';
import { setTheme } from '@joint/plus';

const appEl = document.getElementById('app') as HTMLDivElement;

Promise.all([
    fetch('assets/config/actions.json').then(res => res.json()),
    fetch('assets/config/triggers.json').then(res => res.json()),
    fetch('assets/config/controls.json').then(res => res.json()),
    fetch('assets/workflows/example.json').then(res => res.json()),
]).then(([actions, triggers, controls, example]) => {

    // Initialize the application with loaded configuration
    const app = new App(appEl, {
        triggers,
        actions,
        controls
    });
    // Load example diagram
    app.loadDiagram(example);

}).catch((err) => {
    console.warn('Failed to load configuration files:', err);
});

setTheme('light');
