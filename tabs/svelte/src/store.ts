import { writable } from 'svelte/store';
import { dia, shapes, util } from '@joint/plus';
import { TabsData } from './tabs-data';


/* 
    Create the default tab state
*/
export const createTabState = (title: string, json?: any) => {
    const graph = new dia.Graph({ id: util.uuid() }, { cellNamespace: shapes });
    let focusPoint;
    if (json) {
        graph.fromJSON(json);
        focusPoint = graph.getBBox()?.center().toJSON();
    }
    return {
        title,
        graph,
        focusPoint
    }
}

let tabs = TabsData.map(({ title, json }) => createTabState(title, json));

/* 
    Create Svelte store - stores are available in any part of a svelte app
*/
export const tabStore = writable(tabs);
