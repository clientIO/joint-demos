import data from './data.json';

// A stage of the supply chain. The categories are listed in the order the goods pass
// through them: the index of a category is the layer of its entities.
export interface CategoryData {
    id: string;
    label: string;
}

// A company or a site in the supply chain.
export interface EntityData {
    id: string;
    category: string;
    name: string;
    code: string;
    region: string;
}

// Goods moving from one entity to another, with the way they travel (where it is known).
export interface FlowData {
    id: string;
    source: string;
    target: string;
    transport?: {
        mode: string;
        days: number;
    };
}

export const { categories, entities, flows } = data as {
    categories: CategoryData[];
    entities: EntityData[];
    flows: FlowData[];
};
