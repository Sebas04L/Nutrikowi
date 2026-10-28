import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El puerto es fijo a propósito: los datos se guardan en el almacenamiento del
// navegador, que depende de la dirección exacta (http://localhost:5180).
// Si el puerto cambiara, el navegador mostraría un espacio de datos vacío.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5180, strictPort: true, host: true },
  preview: { port: 5181, strictPort: true, host: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as any);
