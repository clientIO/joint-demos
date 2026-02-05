# JointJS+ Pert Chart (TS) Demo

A PERT (Program Evaluation Review Technique) chart is a project-management diagram that visualizes project tasks as nodes and their dependencies as directed links, enabling teams to estimate schedules, identify the critical path, and optimize resources.

## Setup

Navigate to this directory, then run:

```bash
npm install
npm run start
```

Open `http://localhost:8080` in your browser.

## Documentation

### API

Create a new pert chart.

```ts
import PertChart from './src/PertChart.ts';

const pertChart = new PertChart({
    target: document.getElementById('#pert-chart'),
    data: data1,
    // hide toolbar
    toolbar: false,
    // Enable assigning resources to tasks by:
    // - dragging a resource from the Stencil onto a Task
    // - dragging and dropping assignees from one Task to another
    assignments: {
        resources: {
            1: { name: 'John', icon: './icon1.svg', city: 'Perth' },
            2: { name: 'Jane', icon: './icon2.svg', city: 'London' }
        },
        onChange: (changes) => {
            changes.forEach(change => {
                console.log(`Task ${change.task} was changed`);
            });
        }
    }
});
```

Update the existing chart.

```ts
pertChart.update(data2);
```

Destroy the existing chart.

```ts
pertChart.remove();
```

Zoom the chart to fit the content.

```ts
pertChart.zoomToFit();
```

Select a node.

```ts
pertChart.selectNode('my-node-id');
```

Unselect a node.

```ts
pertChart.selectNode(null);
```

Listen to node click and canvas click:

```ts
pertChart.addClickEventListener((id) => {
    if (id === null) {
        // the user clicked on the canvas area
    } else {
        // the user clicked on a node
    }
});
```

Toggle the navigator (minimap).
_Note: the navigator is hidden by default._
```ts
if (pertChart.isNavigatorVisible()) {
    pertChart.hideNavigator();
} else {
    pertChart.showNavigator();
}
```

### Types

The `PertChart` class and `TaskData`.

```ts
interface PertChartOptions {
    target: HTMLElement;
    data?: TaskData[];
    toolbar?: boolean;
    assignments?: {
        resources: Record<string, TaskResource>;
        onChange: (data: AssignmentChangeData[]) => void;
    }
}

class PertChart {
    constructor(options: PertChartOptions);
    update(data: TaskData[]): this;
    zoomIn(step?: number): void;
    zoomOut(step? number): void;
    zoomToFit(): this;
    addClickEventListener(callback: (id: TaskId | null, evt: dia.Event) => void): void;
    selectNode(id: TaskId | null): void;
    remove(): this;
    showNavigator(): void;
    hideNavigator(): void;
}

type TaskId = string | number;

interface TaskBadge {
    icon: string;
    description?: string;
    color?: string;
}

interface TaskResource {
    id: TaskId;
    name: string;
    city: string;
    icon?: string;
}

interface TaskData {
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

interface AssignmentChangeData {
    task: TaskId;
    resource: number | null;
    action: 'add' | 'remove';
}
```

## License

The *JointJS+* library is licensed under the [JointJS+ License](https://www.jointjs.com/license).

Copyright © 2013-2025 client IO
