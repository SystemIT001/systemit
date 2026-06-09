import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        rootIndex: resolve(__dirname, 'index.html'),
        main: resolve(__dirname, 'views/index.html'),
        login: resolve(__dirname, 'views/login.html'),
        proyectos: resolve(__dirname, 'views/proyectos.html'),
        proyectoDetalle: resolve(__dirname, 'views/proyecto-detalle.html'),
        inventario: resolve(__dirname, 'views/inventario.html'),
        compras: resolve(__dirname, 'views/compras.html'),
        configuraciones: resolve(__dirname, 'views/configuraciones.html'),
        factura: resolve(__dirname, 'views/factura.html'),
        clientes: resolve(__dirname, 'views/clientes.html'),
        cotizaciones: resolve(__dirname, 'views/cotizaciones.html'),
        tickets: resolve(__dirname, 'views/tickets.html')
      }
    }
  }
});
