interface ColumnData {
    name: string,
    type: string,
    key?: boolean
}

interface RouterOptions {
    padding?: number,
    sourcePadding?: number,
    targetPadding?: number
}

export {
    ColumnData,
    RouterOptions
};
