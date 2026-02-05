import type { dia } from '@joint/plus';

export enum TaskState {
    ToDo,
    InProgress,
    Complete
}

export interface Task {
    id?: dia.Cell.ID;
    state: TaskState;
    name?: string;
    description?: string;
}

export interface Column {
    state: TaskState;
    name?: string;
    color?: string;
}

export interface Dependency {
    id: dia.Cell.ID;
    source: dia.Cell.ID;
    target: dia.Cell.ID;
}
