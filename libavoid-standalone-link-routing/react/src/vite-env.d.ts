/// <reference types="vite/client" />

/** The Libavoid WebAssembly binary, aliased in `vite.config.ts`. */
declare module 'libavoid-wasm?url' {
    const url: string;
    export default url;
}
