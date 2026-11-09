/**
 * Types for the environment variables Vite exposes to the app.
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** The Liveblocks public key (`pk_...`). Never a secret key. */
    readonly VITE_LIVEBLOCKS_PUBLIC_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
