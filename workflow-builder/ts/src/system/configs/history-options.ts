import type { dia } from '@joint/plus';

const optionsList = ['disableOptimalOrderHeuristic', 'build'];

export const applyOptionsList: dia.CommandManager.Options['applyOptionsList'] = optionsList;

export const revertOptionsList: dia.CommandManager.Options['revertOptionsList'] = optionsList;
