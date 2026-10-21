import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Single stylesheet entry: fonts + Tailwind + @joint/react-plus base styles.
import './index.css';
import { App } from './app';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>
);
