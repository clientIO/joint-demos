import { TaskElement } from './PertChart/TaskElement';
import { getItemIcon } from './PertChart/utils';

export function extractTasks(rawTasks, data, options = {}) {
    let tasks = [];
    rawTasks.forEach(task => {
        const { id, name, startDate, percentDone, duration, children = [] } = task;
        const assignees = (data.assignments[id] || []).map(resourceId => {
            return data.resources[resourceId] ?? null;
        }).filter(Boolean);
        const currentTask = {
            id,
            name,
            startDate,
            duration,
            percentDone,
            dependencies: data.dependencies[id] || [],
            assignees
        };
        tasks.push(currentTask);
        const childrenTasks = extractTasks(children, data, { ...options, childrenDependencies: true });
        tasks.push(...childrenTasks);
    });
    return tasks;
}

export function addBadgesToTasks(tasks, today = new Date()) {
    tasks.forEach(task => addTaskBadges(task, today));
}

export function extractDependencyMap(rawDependencies) {
    const dependencies = {};
    rawDependencies.forEach(dependency => {
        const { fromTask, toTask } = dependency;
        dependencies[fromTask] || (dependencies[fromTask] = []);
        dependencies[fromTask].push(toTask);
    });
    return dependencies;
}

export function extractResourceMap(rawResources) {
    const resources = {};
    rawResources.forEach(resource => {
        const { id, name, city } = resource;
        resources[id] = { id, name, city, icon: getResourceIcon(id) };
    });
    return resources;
}

export function extractAssignmentMap(rawAssignments) {
    const assignments = {};
    rawAssignments.forEach(assignment => {
        const { event: taskId, resource: resourceId } = assignment;
        assignments[taskId] || (assignments[taskId] = []);
        assignments[taskId].push(resourceId);
    });
    return assignments;
}


function addTaskBadges(task, today) {
    const badges = [];
    const { percentDone, startDate, duration } = task;
    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = startDate ? TaskElement.getEndDate(new Date(startDate), duration) : null;
    const todayObj = new Date(today);
    if (percentDone === 100) {
        badges.push({
            icon: getItemIcon('completed', '#4CAF50'),
            description: 'Task completed'
        });
    }
    else if (percentDone > 0) {
        if (endDateObj) {
            if (Number(todayObj) > Number(endDateObj)) {
                badges.push({
                    icon: getItemIcon('overdue', '#F12443'),
                    description: `Overdue task. Was due on ${endDateObj.toLocaleDateString()}`
                });
            }
            else {
                const left = Number(endDateObj) - Number(todayObj);
                const total = Number(endDateObj) - Number(startDateObj);
                const progress = percentDone / 100;
                // If we are behind the schedule.
                if (left < (1 - progress) * total) {
                    badges.push({
                        icon: getItemIcon('warning', '#FF9F1C'),
                        description: `Behind the schedule. ${Math.round(left / (1000 * 60 * 60 * 24))} days left.`
                    });
                }
            }
        }
    }
    // To showcase the functionality, we add 'comment' badge to some tasks.
    // In real use cases, this should be driven by the data.
    if (Number(task.id) % 3 === 0) {
        badges.push({
            icon: getItemIcon('comment', '#6C757D'),
            description: 'This task has comments'
        });
    }
    task.badges = badges;
}

function getResourceIcon(resourceId) {
    return `assets/images/${resourceId}.png`;
}
