export * from './header';
export * from './task';
export * from './dependency';
export * from './animated-view';
export * from './add-button';

import { shapes } from '@joint/plus';
import { Header } from './header';
import { Task } from './task';
import { Dependency } from './dependency';
import { AddButton } from './add-button';

Object.assign(shapes, {
    kanban: {
        Dependency,
        Header,
        Task,
        AddButton
    }
});
