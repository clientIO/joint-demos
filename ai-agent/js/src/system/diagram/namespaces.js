import { SystemButton, SystemButtonLine, SystemEdge, SystemPlaceholder } from './models';

/**
 * Cell namespace for system shapes like Placeholder, Button, ButtonEdge, Edge
 */
export const systemModelNamespace = {
    [SystemPlaceholder.type]: SystemPlaceholder,
    [SystemButton.type]: SystemButton,
    [SystemButtonLine.type]: SystemButtonLine,
    [SystemEdge.type]: SystemEdge,
};
