export interface Task {
    id: number | string;
    duration: number;
    label: string;
    labelColor?: string;
    topColor: string;
    sideColor: string;
    frontColor: string;
}

export interface Operator {
    label: string;
    tasks: Task[];
}
