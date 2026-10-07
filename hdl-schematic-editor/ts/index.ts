import 'core-js/stable';
import 'regenerator-runtime/runtime';
import '@joint/plus/joint-plus.css';
import './styles/main.scss';
import { App } from './src/app';
import { setTheme } from '@joint/plus';

const appEl = document.getElementById('app') as HTMLDivElement;

fetch('assets/examples/counter.json')
    .then(res => res.json())
    .then((example) => {
        // Initialize the application with loaded configuration
        const app = new App(appEl, { example });
        // Load the example netlist
        app.loadYosysJSON(example);
    }).catch((err) => {
        console.warn('Failed to load the example:', err);
    });

setTheme('light');
