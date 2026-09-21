import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@joint/react-plus/styles.css';
import './index.css';
import { App } from './app';

const container = document.querySelector('#root');
if (!container) throw new Error('Missing #root element.');

createRoot(container).render(
    <StrictMode>
        <App />
    </StrictMode>
);
