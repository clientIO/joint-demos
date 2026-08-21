import { dia } from '@joint/plus';
import { cellNamespace } from '../shapes';

// The graph is the single source of truth for the diagram. It is created
// outside of React (module scope) so it survives StrictMode double-mounts
// and is passed to `<Diagram graph={graph}>` as an external instance.
export const graph = new dia.Graph({}, { cellNamespace });
