/** The object without the key: a value of it removed (Auto), the rest as it is. */
export function withoutKey<T extends object, K extends keyof T>(object: T, key: K): Omit<T, K> {
    const copy = { ...object };
    delete copy[key];
    return copy;
}
