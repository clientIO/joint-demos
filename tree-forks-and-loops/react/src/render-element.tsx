import type { RenderElement } from '@joint/react-plus';

import { Cell } from './cells';

/** Every element renders through `<Cell>`, which picks the look by the model type. */
export const renderElement: RenderElement = () => <Cell />;
