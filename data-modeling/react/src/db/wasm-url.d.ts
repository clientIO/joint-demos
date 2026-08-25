// Vite resolves `import x from '*.wasm?url'` to the emitted asset URL (a string).
// vite/client declares `*.wasm` and `*.wasm?url`-adjacent forms but not this exact
// suffix, so declare it here — typed as `string`, never `any`.
declare module '*.wasm?url' {
  const url: string;
  export default url;
}
