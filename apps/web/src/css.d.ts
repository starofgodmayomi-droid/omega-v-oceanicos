/**
 * Type declarations for side-effect stylesheet imports.
 *
 * TypeScript 6 reports TS2882 for `import './App.css'` without a
 * declaration, where earlier versions accepted it silently. Vite resolves
 * these at build time; TypeScript only needs to be told they exist.
 *
 * Declared for the whole workspace rather than per file, because the next
 * stylesheet import should not have to rediscover this.
 */
declare module '*.css';
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_READ_TOKEN?: string;
  readonly VITE_API_ADMIN_TOKEN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
declare module '*.svg' {
  const source: string;
  export default source;
}
