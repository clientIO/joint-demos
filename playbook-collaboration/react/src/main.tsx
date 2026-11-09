/**
 * Entry point: mounts the app in StrictMode with the single stylesheet
 * (fonts, Tailwind and the @joint/react-plus base styles).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './app';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>
);
