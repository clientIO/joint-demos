export type TaskId = string | number;

export interface TaskBadge {
    icon: string;
    description?: string;
    color?: string;
}

export interface TaskResource {
    id: number;
    name: string;
    city: string;
    icon?: string;
}

export interface TaskData {
    id: TaskId;
    name: string;
    assignees: Array<TaskResource>;
    percentDone: number;
    startDate: string;
    duration: number;
    dependencies: Array<TaskId>;
    color?: string;
    badges?: Array<TaskBadge>;
}

export interface ZoomSettings {
    padding: number;
    min: number;
    max: number;
    step: number;
}
