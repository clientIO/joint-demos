import { util, dia, ui, layout, V, elementTools, linkTools, highlighters } from '@joint/plus';
import { Header, Task as TaskShape, Dependency as DependencyShape, AddButton } from '../shapes';

const HEADER_HEIGHT = 40;
const MIN_BOARD_HEIGHT = 800;

export class Kanban {
    
    constructor(options) {
        this.topLeft = options.topLeft;
        this.columns = options.columns;
        this.paper = options.paper;
        this.taskMargin = options.taskMargin || 10;
        this.taskWidth = options.taskWidth || 300;
        this.taskHeight = options.taskHeight || 200;
        this.columnMargin = options.columnMargin || 30;
        this.showDependencyTool = options.showDependencyTool || false;
        
        this.createHeader();
        this.createTasks(options.tasks);
        this.createDependencies(options.dependencies);
        this.createAddButtons();
        
        const layoutOptions = {
            direction: layout.StackLayout.Directions.TopBottom,
            topLeft: {
                x: this.topLeft.x,
                y: this.topLeft.y + this.taskMargin + HEADER_HEIGHT,
            },
            stackCount: this.columns.length,
            stackSize: this.taskWidth,
            stackGap: this.columnMargin,
            stackElementGap: this.taskMargin,
            setAttributes: function (el, { position }) {
                el.set('position', position, { ignoreCommandManager: true });
            }
        };
        
        const layoutView = this.layoutView = new ui.StackLayoutView({
            layoutOptions: layoutOptions,
            paper: this.paper,
            modifyInsertElementIndex: (elementIndexOptions) => {
                // The last element in the stack is always the add-button
                const { insertElementIndex, targetStack } = elementIndexOptions;
                return Math.min(insertElementIndex, targetStack.elements.length - 1);
            },
            canInteract: (elementView) => {
                const element = elementView.model;
                return TaskShape.isTask(element);
            }
        });
        
        this.resizeBoard();
        layoutView.model.on('update', () => this.resizeBoard());
        this.attachPaperEvents();
    }
    
    attachPaperEvents() {
        
        const { paper } = this;
        
        paper.on('element:pointerup', (elementView) => {
            if (!TaskShape.isTask(elementView.model))
                return;
            this.selectTask(elementView);
        });
        
        paper.on('blank:pointerdown', () => {
            this.unselectTask();
        });
        
        paper.on('link:mouseenter', (linkView) => {
            const toolsView = new dia.ToolsView({
                tools: [
                    new linkTools.Remove({
                        distance: 10,
                        action: () => {
                            linkView.model.remove();
                        }
                    })
                ]
            });
            linkView.addTools(toolsView);
        });
        
        paper.on('link:mouseleave', (linkView) => {
            linkView.removeTools();
        });
        
        paper.on('element:pointerclick', (elementView) => {
            const element = elementView.model;
            if (!AddButton.isAddButton(element))
                return;
            this.addTask(element.get('stackIndex'));
        });
        
        paper.on('element:pointerdblclick', (taskView, evt) => {
            if (!TaskShape.isTask(taskView.model))
                return;
            const targetSelector = taskView.findAttribute('joint-selector', evt.target);
            const editHeader = ('header' === targetSelector) || ('headerText' === targetSelector);
            this.editTask(taskView, editHeader);
        });
    }
    
    createHeader() {
        const graph = this.paper.model;
        this.columns.forEach((column, index) => {
            const position = {
                x: this.topLeft.x + index * (this.taskWidth + this.columnMargin),
                y: this.topLeft.y
            };
            const size = {
                width: this.taskWidth,
                height: HEADER_HEIGHT,
            };
            graph.addCell(this.createHeaderElement(column, position, size));
        });
    }
    
    createHeaderElement(column, position, size) {
        return new Header({
            id: 'column-header-' + column.state,
            position: position,
            size: size,
            attrs: {
                label: {
                    text: column.name
                },
                marker: {
                    fill: column.color
                }
            }
        });
    }
    
    createTasks(tasks) {
        const graph = this.paper.model;
        tasks.forEach((task, index) => {
            const size = {
                height: this.taskHeight,
                width: this.taskWidth
            };
            graph.addCell(this.createTaskElement(task, size, index));
        });
    }
    
    createTitle(name, description) {
        return `${name}\n\n${description}`;
    }
    
    createTaskElement(task, size, index) {
        const { id, state, name, description } = task;
        return new TaskShape({
            id,
            size,
            attrs: {
                root: {
                    title: this.createTitle(name, description)
                },
                headerText: {
                    text: name
                },
                bodyText: {
                    text: description
                }
            },
            stackIndex: this.getStackIndexFromState(state),
            stackElementIndex: index
        });
    }
    
    createAddButtons() {
        const graph = this.paper.model;
        this.columns.forEach((column, index) => {
            const addButton = new AddButton({
                id: 'add-button-' + index,
                size: {
                    width: this.taskWidth,
                    height: 40,
                },
                attrs: {
                    label: {
                        fill: column.color
                    }
                },
                stackIndex: index
            });
            graph.addCell(addButton);
        });
    }
    
    createDependencies(dependencies) {
        const graph = this.paper.model;
        dependencies.forEach(dependency => {
            const dependencyShape = new DependencyShape({
                id: dependency.id,
                source: { id: dependency.source },
                target: { id: dependency.target },
            });
            graph.addCell(dependencyShape);
        });
    }
    
    getStackIndexFromState(state) {
        return this.columns.findIndex(column => column.state === state);
    }
    
    resizeBoard() {
        const { paper, layoutView } = this;
        const size = paper.getComputedSize();
        paper.setDimensions(size.width, Math.max(layoutView.model.bbox.height + this.topLeft.y + HEADER_HEIGHT + 2 * this.taskMargin, MIN_BOARD_HEIGHT));
    }
    
    // Public Methods
    
    editTask(taskView, editHeader = false) {
        
        const { paper } = this;
        const { model: task } = taskView;
        
        this.unselectTask();
        
        const bbox = task.getBBox();
        this.textarea = document.createElement('textarea');
        const textarea = this.textarea;
        // Position, Size & Styling
        textarea.style.position = 'absolute';
        textarea.style.boxSizing = 'border-box';
        textarea.style.transformOrigin = '0 0';
        textarea.style.textAlign = 'start';
        textarea.style.alignContent = 'center';
        textarea.style.textAlign = 'left';
        textarea.style.letterSpacing = '0';
        textarea.style.resize = 'none';
        textarea.style.lineHeight = '1.5em';
        // Content
        let textPath;
        if (editHeader) {
            textPath = 'headerText/text';
            textarea.style.padding = `${15}px ${20}px`;
            textarea.style.transform = V.matrixToTransformString(paper.matrix().translate(bbox.x, bbox.y));
            textarea.style.width = `${bbox.width}px`;
            textarea.style.height = `${50}px`;
            textarea.style.fontSize = task.attr('headerText/fontSize') + 'px';
            textarea.style.fontFamily = task.attr('headerText/fontFamily');
            textarea.style.fontWeight = task.attr('headerText/fontWeight');
            textarea.style.color = task.attr('headerText/fill');
            textarea.style.overflowY = 'hidden';
            textarea.wrap = 'off';
        }
        else {
            textPath = 'bodyText/text';
            const headerHeight = 40;
            textarea.style.padding = `${10}px ${20}px`;
            textarea.style.transform = V.matrixToTransformString(paper.matrix().translate(bbox.x, bbox.y + headerHeight));
            textarea.style.width = `${bbox.width}px`;
            textarea.style.height = `${bbox.height - headerHeight}px`;
            textarea.style.fontSize = task.attr('bodyText/fontSize') + 'px';
            textarea.style.fontFamily = task.attr('bodyText/fontFamily');
            textarea.style.fontWeight = task.attr('bodyText/fontWeight');
            textarea.style.color = task.attr('bodyText/fill');
        }
        textarea.value = task.attr(textPath);
        // Append the this.textarea to the paper
        paper.el.appendChild(textarea);
        textarea.focus();
        // Select all text
        textarea.setSelectionRange(0, textarea.value.length);
        // Attach Event Listeners
        textarea.addEventListener('blur', () => {
            task.startBatch('text');
            task.attr(textPath, textarea.value);
            task.attr('root/title', this.createTitle(task.attr('headerText/text'), task.attr('bodyText/text')));
            task.stopBatch('text');
            textarea.remove();
        });
        textarea.addEventListener('keyup', (evt) => {
            if (evt.key === 'Enter' && (!evt.shiftKey || textarea.wrap === 'off')) {
                const index = textarea.selectionEnd;
                textarea.value = textarea.value.slice(0, index - 1) + textarea.value.slice(index);
                textarea.blur();
                this.selectTask(taskView);
            }
            if (evt.key === 'Escape') {
                textarea.value = task.attr(textPath);
                textarea.blur();
                this.selectTask(taskView);
            }
        });
    }
    
    addTask(stackIndex) {
        const stack = this.layoutView.model.stacks[stackIndex];
        const task = {
            state: this.columns[stackIndex].state,
            name: 'New Task',
            description: 'Description'
        };
        const size = {
            height: this.taskHeight,
            width: this.taskWidth
        };
        const taskElement = this.createTaskElement(task, size);
        this.layoutView.model.insertElement(taskElement, stackIndex, stack.elements.length - 1);
    }
    
    
    selectTask(taskView) {
        this.unselectTask();
        this.selectedTask = taskView.model;
        const tools = [
            new elementTools.Remove({
                useModelGeometry: true,
                x: '100%',
                y: 15,
                offset: { x: 10 },
                action: () => {
                    taskView.model.remove();
                    this.layoutView.model.update();
                }
            })
        ];
        if (this.showDependencyTool) {
            tools.push(new elementTools.Connect({
                useModelGeometry: true,
                x: '100%',
                y: 35,
                offset: { x: 10 }
            }));
        }
        const toolsView = new dia.ToolsView({ tools });
        taskView.addTools(toolsView);
        this.highlighter = highlighters.addClass.add(taskView, 'root', 'selection', {
            className: 'highlighter-selection'
        });
    }
    
    unselectTask() {
        if (this.highlighter) {
            this.highlighter.remove();
            this.highlighter = null;
        }
        if (this.textarea) {
            this.textarea.blur();
        }
        this.paper.removeTools();
        delete this.selectedTask;
    }
    
    get tasks() {
        const graph = this.paper.model;
        const tasks = [];
        const taskElements = util.sortBy(graph.getElements(), (el) => el.get('stackElementIndex'));
        taskElements.forEach(el => {
            if (!TaskShape.isTask(el))
                return;
            tasks.push({
                id: el.id,
                state: this.columns[el.get('stackIndex')].state,
                name: el.attr('headerText/text'),
                description: el.attr('bodyText/text')
            });
        });
        return tasks;
    }
    
    get dependencies() {
        const graph = this.paper.model;
        return graph.getLinks().map(dependency => {
            return {
                id: dependency.id,
                source: dependency.source().id,
                target: dependency.target().id
            };
        });
    }
}
