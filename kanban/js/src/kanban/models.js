
export var TaskState;
(function (TaskState) {
    TaskState[TaskState["ToDo"] = 0] = "ToDo";
    TaskState[TaskState["InProgress"] = 1] = "InProgress";
    TaskState[TaskState["Complete"] = 2] = "Complete";
})(TaskState || (TaskState = {}));
