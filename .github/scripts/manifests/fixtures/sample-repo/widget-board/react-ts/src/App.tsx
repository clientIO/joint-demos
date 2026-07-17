import { jsx } from '@joint/react-plus/jsx-runtime';
import { GraphProvider, Paper } from '@joint/react-plus';

export function App() {
    return (
        <GraphProvider>
            <Paper />
        </GraphProvider>
    );
}
