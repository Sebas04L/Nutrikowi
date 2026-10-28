// Declaraciones para importar hojas de estilo desde TypeScript.
declare module '*.css';
declare module '*.png' { const src: string; export default src; }
