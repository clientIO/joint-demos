import PertChart from './PertChart';
import data from './data';
import {
    extractTasks, extractDependencyMap, extractResourceMap, extractAssignmentMap,
    addBadgesToTasks
} from './data-utils';

const dependencies = extractDependencyMap(data.dependencies.rows);
const resources = extractResourceMap(data.resources.rows);
const assignments = extractAssignmentMap(data.assignments.rows);
const tasks = extractTasks(data.tasks.rows, {
    dependencies,
    resources,
    assignments
});

// To showcase the functionality, we use a fixed date here.
addBadgesToTasks(tasks, new Date('2025-09-19'));

export const init = () => {
    // Example usage:
    const pertChart = new PertChart({
        // The DOM element that will contain the chart.
        target: document.getElementById('app'),
        // Enable/disable interactive assignment of resources to tasks.
        assignments: {
            // List of available resources.
            resources,
            // Callback to notify about assignment changes.
            onChange: (changes) => {
                // Update the tasks data with the new assignments.
                changes.forEach(change => {
                    switch (change.action) {
                        case 'add': {
                            const task = tasks.find(t => t.id === Number(change.task));
                            if (task) {
                                task.assignees.push(resources[change.resource]);
                            }
                            break;
                        }
                        case 'remove': {
                            const task = tasks.find(t => t.id === Number(change.task));
                            if (task) {
                                task.assignees = task.assignees.filter(a => a.id !== change.resource);
                            }
                            break;
                        }
                    }
                });
                pertChart.update(tasks);
            }
        },
    });

    pertChart.update(tasks);
    // pertChart.zoomToFit();
    pertChart.showNavigator();

    // tasks[0].name = 'New Task Name';
    // tasks[0].color = '#ffb6c1';
    // pertChart.update(tasks);

    // Dispose the view.
    // pertChart.remove();

    // Use JointJS API to interact with the chart.
    pertChart.scroller.positionContent('left', {
        padding: 70,
        useModelGeometry: true
    });
};

