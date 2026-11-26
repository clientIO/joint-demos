import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ScadaApp } from './scada-app';
import { ErrorBoundary } from './ui/error-boundary';

const root = document.getElementById('root');
if (!root) {
    throw new Error('Root element #root not found');
}

createRoot(root).render(
    <StrictMode>
        <ErrorBoundary>
            <ScadaApp />
        </ErrorBoundary>
    </StrictMode>,
);
