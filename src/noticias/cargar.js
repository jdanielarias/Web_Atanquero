// Descubre las noticias solas: cada carpeta dentro de /noticias es una
// noticia. Para sumar una nueva no hay que tocar codigo — se crea la carpeta
// con su noticia.json y aparece sola en noticias.html, la mas reciente arriba.
//
//   noticias/
//     el-nombre-que-sea/
//       noticia.json   <- obligatorio (titulo, fecha, lugar, descripcion,
//                         y si viene de otro medio: fuente y enlace)
//       fotos/*.jpg    <- las fotos del carrusel (opcional)
//
// Si el json trae la lista "fotos", ese es el orden del carrusel; si no la
// trae, entran todas las de la carpeta ordenadas por nombre.

const fichas = import.meta.glob('/noticias/*/noticia.json', { eager: true });
const fotos = import.meta.glob('/noticias/*/fotos/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const carpeta = (ruta) => ruta.split('/')[2];

// Convierte una ruta declarada en el json ("fotos/1.jpg") en la URL real que
// dejo Vite. Si el archivo no existe, devuelve null y la foto se salta.
function resolver(id, ruta) {
  if (!ruta) return null;
  const limpia = String(ruta).replace(/^\.?\//, '');
  return fotos[`/noticias/${id}/${limpia}`] ?? null;
}

function todasDe(id) {
  return Object.keys(fotos)
    .filter((k) => carpeta(k) === id)
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true })) // foto2 antes que foto10
    .map((k) => fotos[k]);
}

export function cargarNoticias() {
  return Object.keys(fichas)
    .map((ruta) => {
      const id = carpeta(ruta);
      const datos = fichas[ruta].default ?? fichas[ruta];
      const declaradas = (datos.fotos ?? []).map((f) => resolver(id, f)).filter(Boolean);
      return {
        id,
        titulo: datos.titulo ?? id,
        fecha: datos.fecha ?? '',
        lugar: datos.lugar ?? '',
        descripcion: datos.descripcion ?? '',
        fuente: datos.fuente ?? '',
        enlace: datos.enlace ?? '',
        fotos: declaradas.length ? declaradas : todasDe(id),
      };
    })
    .sort(
      (a, b) =>
        // Lo mas reciente primero; las noticias sin fecha bajan al final.
        b.fecha.localeCompare(a.fecha, 'es', { numeric: true }) ||
        a.titulo.localeCompare(b.titulo, 'es'),
    );
}
