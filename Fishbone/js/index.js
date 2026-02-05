import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { setTheme } from '@joint/plus';
import { init } from './src/app';

import '@joint/plus/joint-plus.css';
import './styles.css';

// Show the body after the CSS is loaded to avoid flash of unstyled content
document.body.style.visibility = '';

setTheme('custom');
init();
