import { TaskState } from './models';

export const tasks = [{
        id: 'task-1',
        name: 'New EULA',
        state: TaskState.ToDo,
        description: `
- @Mark to prepare new EULA
- Web team to update website
- Product team to embed EULA
`.trim()
    }, {
        id: 'task-2',
        name: 'Plan Exhibition For Trade Show',
        state: TaskState.ToDo,
        description: `
- @Lora to book space
- Order brochures
- Promote event on social media
`.trim()
    }, {
        id: 'task-3',
        name: 'Prepare Marketing Collateral',
        state: TaskState.InProgress,
        description: `
- Sales brochure
- Infographic
- Web content
`.trim()
    }, {
        id: 'task-4',
        name: 'Review Security Guidelines',
        state: TaskState.InProgress,
        description: `
- @Ian to provide current documents
- @Jane to review guidelines
- Distribute internally
- Define Processes
`.trim()
    }, {
        id: 'task-5',
        name: 'Implement CRM Integration',
        state: TaskState.InProgress,
        description: `
- Prepare new microservice
- Define responsibilities
- Prepare JIRA user stories
- Consult with dev team
`.trim()
    }, {
        id: 'task-6',
        name: 'Document System Architecture',
        state: TaskState.InProgress,
        description: `
- Create architecture diagrams
- Write architecture overview
- Dev team to review
`.trim()
    }, {
        id: 'task-7',
        name: 'Develop iPhone App',
        state: TaskState.Complete,
        description: `
- Create wireframes
- Create assets
- Define functionality
- Hand over to dev team
`.trim()
    }, {
        id: 'task-8',
        name: 'Channel Partners Licensing',
        state: TaskState.Complete,
        description: `
- Prepare NFR licenses
- Document process
- Consult with partners
- Distribute license keys
`.trim()
    }];

export const dependencies = [{
        id: 'dep-1',
        source: 'task-2',
        target: 'task-3'
    }, {
        id: 'dep-2',
        source: 'task-6',
        target: 'task-5'
    }];

export const columns = [{
        name: 'TODO',
        state: TaskState.ToDo,
        color: '#4666E5'
    }, {
        name: 'IN PROGRESS',
        state: TaskState.InProgress,
        color: '#F9A03F'
    }, {
        name: 'COMPLETE',
        state: TaskState.Complete,
        color: '#09BC8A'
    }];
