import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// El CSS del sitio es pequeño (~6 KB) pero, servido como <link>, bloquea el
// primer render: en movil, con latencia alta, ese viaje extra retrasa el LCP.
// Este plugin lo incrusta como <style> en el HTML del build, sacandolo de la
// ruta critica. Solo toca las hojas propias del sitio; el CSS del mapa
// (maplibre) no va en un <link> del HTML — entra con su chunk diferido — asi
// que no se incrusta.
function incrustarCssCritico() {
  return {
    name: 'incrustar-css-critico',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html;
      return html.replace(
        /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
        (etiqueta, href) => {
          const nombre = href.split('/').pop();
          const activo = Object.values(ctx.bundle).find(
            (a) => a.type === 'asset' && a.fileName.endsWith(nombre),
          );
          if (!activo || typeof activo.source !== 'string') return etiqueta;
          // Dentro del .css las rutas (fuentes, la foto del rio) son
          // relativas a su carpeta, assets/. Pegadas en el HTML pasarian a
          // ser relativas a la raiz y darian 404: se les antepone la carpeta.
          const carpeta = activo.fileName.includes('/')
            ? activo.fileName.slice(0, activo.fileName.lastIndexOf('/') + 1)
            : '';
          const css = activo.source.replace(
            /url\((['"]?)(?!data:|https?:|\/|#)(?:\.\/)?([^)'"]+)\1\)/g,
            (_, comilla, ruta) => `url(${comilla}./${carpeta}${ruta}${comilla})`,
          );
          return `<style>${css}</style>`;
        },
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [incrustarCssCritico()],
  // Vite no reconoce .glb por defecto: sin esto los escaneos no se copian al
  // build y el visor queda sin modelo en producción.
  assetsInclude: ['**/*.glb'],
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    // Seis paginas, una por boton del menu. Sin esto vite solo compila
    // index.html y las demas no llegarian al build.
    rollupOptions: {
      input: {
        principal: resolve(import.meta.dirname, 'index.html'),
        territorio: resolve(import.meta.dirname, 'territorio.html'),
        mochilas: resolve(import.meta.dirname, 'mochilas.html'),
        historias: resolve(import.meta.dirname, 'historias.html'),
        noticias: resolve(import.meta.dirname, 'noticias.html'),
        trabaja: resolve(import.meta.dirname, 'trabaja.html'),
      },
    },
  },
});
