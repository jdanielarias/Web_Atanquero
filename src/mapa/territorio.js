// El mapa del territorio: un mapa real (MapLibre + tiles de OpenFreeMap, sin
// API key) acotado a la zona de Atánquez, con las rutas de los recorridos
// dibujadas encima al estilo Strava: trazo que se anima, marcadores de inicio
// y fin, y un panel con los datos al tocar la ruta.
//
// Las rutas salen de src/data/routes.json, que genera el script
// scripts/gpx-a-rutas.mjs a partir de los .gpx en src/data/routes/.

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import rutas from '../data/routes.json';
import { wa } from '../config.js';

// La paleta del sitio, en duro: el estilo del mapa no puede leer variables
// CSS, asi que estos valores tienen que ir a mano (espejo de app.css).
const PAPEL = '#ece8d8';
const PAPEL_ALTO = '#f5f2e6';
const POLVO = '#ded9c2';
const TINTA = '#1d1a12';
const TINTA_MEDIA = '#57513e';
const BARRO = '#9c4520';
const BRASIL = '#8b3a4a';
const AGUA = '#6f93b8'; // añil, para rios y lagunas
const VERDE = '#b3c295'; // monte, para vegetacion
const VIA = '#c0b48c'; // fique tenue, para las vias

// Con reduced-motion activado no se anima nada: ni trazo, ni caminante,
// ni deriva de camara.
const REDUCIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;

// El cuadro del territorio: no se puede pasear el mapa fuera de esta zona.
// Ajustable si algun recorrido queda por fuera.
const LIMITES = [
  [-73.55, 10.55],
  [-73.15, 10.85],
];

const texto = (t) => document.createTextNode(t);

function el(tag, clase, contenido) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (contenido != null) nodo.append(texto(contenido));
  return nodo;
}

// Recolorea el estilo "liberty" para que el mapa se sienta parte del sitio:
// tierra papel, agua añil, monte verde apagado, vias color fique. Esconde lo
// que no aporta aca (POIs, fronteras, nombres de paises).
function vestirMapa(map) {
  for (const capa of map.getStyle().layers) {
    const id = capa.id;
    const ocultar = () => map.setLayoutProperty(id, 'visibility', 'none');
    try {
      if (capa.type === 'background') {
        map.setPaintProperty(id, 'background-color', PAPEL);
      } else if (capa.type === 'fill') {
        if (/water/.test(id)) {
          map.setPaintProperty(id, 'fill-color', AGUA);
        } else if (/park|wood|forest|grass|landcover|landuse|vegetation/.test(id)) {
          map.setPaintProperty(id, 'fill-color', VERDE);
        } else if (/building/.test(id)) {
          map.setPaintProperty(id, 'fill-color', POLVO);
        }
      } else if (capa.type === 'line') {
        if (/boundary|admin/.test(id)) {
          ocultar();
        } else if (/waterway|river|stream|canal/.test(id)) {
          map.setPaintProperty(id, 'line-color', AGUA);
        } else if (/highway|road|street|path|track|bridge|tunnel|rail|transit/.test(id)) {
          map.setPaintProperty(id, 'line-color', VIA);
        }
      } else if (capa.type === 'symbol') {
        if (/poi|airport|housenumber|transit|station|place-country|place-state|place-continent/.test(id)) {
          ocultar();
        } else {
          // Texto claro con halo oscuro: sobre la foto satelital lo oscuro
          // se pierde.
          map.setPaintProperty(id, 'text-color', PAPEL_ALTO);
          map.setPaintProperty(id, 'text-halo-color', 'rgba(29, 26, 18, 0.85)');
          map.setPaintProperty(id, 'text-halo-width', 1.4);
        }
      }
    } catch {
      /* capa sin esa propiedad: se deja como esta */
    }
  }
}

// Los puntos de inicio y fin van como capa del mapa (no como marcadores DOM):
// con el terreno 3D activo son lo unico que queda pegado a la ladera.
function marcarExtremos(map, id, coords) {
  map.addSource(id, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { tipo: 'inicio' }, geometry: { type: 'Point', coordinates: coords[0] } },
        { type: 'Feature', properties: { tipo: 'fin' }, geometry: { type: 'Point', coordinates: coords.at(-1) } },
      ],
    },
  });
  map.addLayer({
    id,
    type: 'circle',
    source: id,
    paint: {
      'circle-radius': 5.5,
      'circle-color': ['match', ['get', 'tipo'], 'fin', BRASIL, BARRO],
      'circle-stroke-color': PAPEL_ALTO,
      'circle-stroke-width': 2,
    },
  });
}

// El trazo se dibuja punto a punto, como en Strava. Con reduced-motion la
// ruta aparece completa de una vez.
function animarTrazo(map, idFuente, coordenadas) {
  const fuente = map.getSource(idFuente);
  const linea = (coords) => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: coords },
  });

  if (REDUCIDO) {
    fuente.setData(linea(coordenadas));
    return;
  }

  const duracion = 2400;
  let inicio = null;
  const paso = (t) => {
    if (inicio === null) inicio = t;
    const avance = Math.min((t - inicio) / duracion, 1);
    const suave = 1 - (1 - avance) ** 3; // arranca rapido, remata despacio
    const corte = Math.max(2, Math.ceil(coordenadas.length * suave));
    fuente.setData(linea(coordenadas.slice(0, corte)));
    if (avance < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

// El caminante: un punto claro que recorre la ruta en bucle, despacio, como
// alguien subiendo. Es el mismo espiritu de las hojas que caen: movimiento
// lento que invita, no que distrae.
function caminarRuta(map, id, coords) {
  if (REDUCIDO) return;

  // Largos de cada tramo (aproximacion plana: la zona es chica).
  const tramos = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = (coords[i][0] - coords[i - 1][0]) * Math.cos((coords[i][1] * Math.PI) / 180);
    const dy = coords[i][1] - coords[i - 1][1];
    const d = Math.hypot(dx, dy);
    tramos.push(d);
    total += d;
  }

  const punto = (c) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: c } });
  map.addSource(id, { type: 'geojson', data: punto(coords[0]) });
  map.addLayer({
    id,
    type: 'circle',
    source: id,
    paint: {
      'circle-radius': 4,
      'circle-color': PAPEL_ALTO,
      'circle-stroke-color': BARRO,
      'circle-stroke-width': 2,
    },
  });

  const duracion = 24000; // toda la ruta, con calma
  const pausa = 2500; // respiro al llegar, antes de volver a salir
  const fuente = map.getSource(id);
  let inicio = null;
  const paso = (t) => {
    if (inicio === null) inicio = t;
    const ciclo = (t - inicio) % (duracion + pausa);
    const avance = Math.min(ciclo / duracion, 1) * total;
    let recorrido = 0;
    let c = coords.at(-1);
    for (let i = 0; i < tramos.length; i++) {
      if (recorrido + tramos[i] >= avance) {
        const f = tramos[i] ? (avance - recorrido) / tramos[i] : 0;
        c = [
          coords[i][0] + (coords[i + 1][0] - coords[i][0]) * f,
          coords[i][1] + (coords[i + 1][1] - coords[i][1]) * f,
        ];
        break;
      }
      recorrido += tramos[i];
    }
    fuente.setData(punto(c));
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

// La deriva: el mapa gira apenas, muy despacio, como respirando. Se detiene
// para siempre en cuanto el usuario lo toca — de ahi en adelante manda el.
function derivaLenta(map) {
  if (REDUCIDO) return;
  let activa = true;
  const parar = () => (activa = false);
  for (const ev of ['mousedown', 'wheel', 'touchstart']) {
    map.getCanvas().addEventListener(ev, parar, { passive: true, once: true });
  }
  const base = map.getBearing();
  const t0 = performance.now();
  const paso = (t) => {
    if (!activa) return;
    map.setBearing(base + 6 * Math.sin((t - t0) / 14000));
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function crearPanel(contenedor) {
  const panel = el('aside', 'mapa-panel');
  panel.hidden = true;

  const cerrar = el('button', 'mapa-panel-cerrar', '×');
  cerrar.type = 'button';
  cerrar.setAttribute('aria-label', 'Cerrar los datos de la ruta');
  cerrar.addEventListener('click', () => (panel.hidden = true));

  panel.append(cerrar);
  contenedor.append(panel);
  return panel;
}

function mostrarRuta(panel, ruta) {
  // Se reconstruye todo menos el boton de cerrar (el primer hijo).
  panel.replaceChildren(panel.firstChild);

  if (ruta.es_prueba) panel.append(el('span', 'mapa-panel-prueba', 'Ruta de prueba'));
  panel.append(el('h3', null, ruta.nombre));
  if (ruta.descripcion_corta) panel.append(el('p', 'mapa-panel-desc', ruta.descripcion_corta));

  // Las fotos grandes y enteras, con los datos en columna a su lado: asi
  // todo se ve de una, sin deslizar.
  const cuerpo = el('div', 'mapa-panel-cuerpo');

  if (ruta.fotos.length) {
    const fotos = el('div', 'mapa-panel-fotos');
    for (const src of ruta.fotos) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Foto del recorrido ${ruta.nombre}`;
      img.loading = 'lazy';
      fotos.append(img);
    }
    cuerpo.append(fotos);
  }

  const datos = el('dl', 'mapa-panel-datos');
  const dato = (titulo, valor) => {
    if (!valor) return;
    const caja = el('div');
    caja.append(el('dt', null, titulo), el('dd', null, valor));
    datos.append(caja);
  };
  dato('Distancia', `${ruta.distancia_km} km`);
  dato('Desnivel', `+${ruta.desnivel_m} m`);
  dato('Dificultad', ruta.dificultad);
  dato('Duración', ruta.duracion_estimada);
  cuerpo.append(datos);

  panel.append(cuerpo);

  const boton = el('a', 'boton solido', 'Agendar este recorrido');
  boton.href = wa(`Hola Enosh, quiero agendar el recorrido: ${ruta.nombre}.`);
  boton.target = '_blank';
  boton.rel = 'noopener';
  // El boton va en su propia franja con fondo: queda pegada abajo mientras
  // el resto del panel se desliza por detras.
  const accion = el('div', 'mapa-panel-accion');
  accion.append(boton);
  panel.append(accion);

  panel.hidden = false;
}

export function montarMapa(contenedor) {
  const map = new maplibregl.Map({
    container: contenedor,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [-73.35, 10.7],
    zoom: 12,
    minZoom: 10.5,
    maxZoom: 16,
    // Inclinado de entrada: con el terreno 3D activo, la Sierra se levanta.
    pitch: 52,
    maxBounds: LIMITES,
    attributionControl: { compact: true },
    // Que el scroll de la pagina no se quede atrapado en el mapa.
    cooperativeGestures: true,
    locale: {
      'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + rueda para acercar el mapa',
      'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + rueda para acercar el mapa',
      'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa',
    },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

  const panel = crearPanel(contenedor);

  map.on('load', () => {
    vestirMapa(map);

    // La Sierra de verdad: imagen satelital (Esri World Imagery, uso libre
    // con credito, sin API key) debajo de las vias y los nombres. Los
    // rellenos vectoriales se esconden: el satelite ya trae tierra, agua y
    // monte con su verde real.
    map.addSource('satelite', {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 17,
      attribution: 'Imágenes: Esri, Maxar, Earthstar Geographics',
    });
    const primeraCapa = map.getStyle().layers.find((c) => c.type !== 'background')?.id;
    map.addLayer(
      {
        id: 'satelite',
        type: 'raster',
        source: 'satelite',
        // Un empujon de saturacion para que el monte se vea vivo.
        paint: { 'raster-saturation': 0.25 },
      },
      primeraCapa,
    );
    for (const capa of map.getStyle().layers) {
      if (capa.type === 'fill') map.setLayoutProperty(capa.id, 'visibility', 'none');
    }

    // El relieve: tiles de elevacion abiertos (Mapzen/AWS Open Data, sin API
    // key). Dos fuentes iguales porque maplibre recomienda no compartir la
    // misma entre el sombreado y el terreno 3D.
    const dem = {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding: 'terrarium',
      tileSize: 256,
      maxzoom: 13,
      attribution: 'Relieve: Mapzen / AWS Open Data',
    };
    map.addSource('relieve-sombra', dem);
    map.addSource('relieve-terreno', dem);

    // El sombreado va debajo de las etiquetas para no tapar los nombres.
    const primeraEtiqueta = map.getStyle().layers.find((c) => c.type === 'symbol')?.id;
    map.addLayer(
      {
        id: 'relieve',
        type: 'hillshade',
        source: 'relieve-sombra',
        paint: {
          // Suave: la foto satelital ya trae sus propias sombras, esto solo
          // remarca los filos.
          'hillshade-exaggeration': 0.3,
          'hillshade-shadow-color': '#3d3a2c',
          'hillshade-highlight-color': '#fdf8e6',
          'hillshade-accent-color': '#6b6450',
        },
      },
      primeraEtiqueta,
    );

    // Y el terreno de verdad: las montañas suben, el trazado se acuesta
    // sobre la ladera.
    map.setTerrain({ source: 'relieve-terreno', exaggeration: 1.25 });

    const todas = [];
    const rutaPorCapa = new Map();
    for (const ruta of rutas) {
      const idFuente = `ruta-${ruta.id}`;
      const coords = ruta.geojson.coordinates;
      todas.push(...coords);

      map.addSource(idFuente, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      // El halo: una linea oscura mas gruesa debajo, para que el trazo se lea
      // sobre cualquier fondo.
      map.addLayer({
        id: `${idFuente}-halo`,
        type: 'line',
        source: idFuente,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': TINTA, 'line-opacity': 0.3, 'line-width': 7 },
      });
      map.addLayer({
        id: idFuente,
        type: 'line',
        source: idFuente,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': BARRO, 'line-width': 3.5 },
      });

      marcarExtremos(map, `${idFuente}-puntos`, coords);
      animarTrazo(map, idFuente, coords);
      caminarRuta(map, `${idFuente}-caminante`, coords);

      rutaPorCapa.set(idFuente, ruta);
      map.on('mouseenter', idFuente, () => {
        map.getCanvas().style.cursor = 'pointer';
        map.setPaintProperty(idFuente, 'line-width', 5.5);
      });
      map.on('mouseleave', idFuente, () => {
        map.getCanvas().style.cursor = '';
        map.setPaintProperty(idFuente, 'line-width', 3.5);
      });
    }

    // El clic busca la ruta en un radio alrededor del punto tocado: un trazo
    // de 3.5px seria imposible de atinar con el dedo.
    const capasRuta = [...rutaPorCapa.keys()];
    map.on('click', (e) => {
      const margen = 8;
      const cerca = map.queryRenderedFeatures(
        [
          [e.point.x - margen, e.point.y - margen],
          [e.point.x + margen, e.point.y + margen],
        ],
        { layers: capasRuta },
      );
      if (cerca.length) mostrarRuta(panel, rutaPorCapa.get(cerca[0].layer.id));
    });

    // Encuadra todas las rutas, con aire alrededor.
    if (todas.length) {
      const lons = todas.map((c) => c[0]);
      const lats = todas.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 48, animate: false },
      );
    }

    derivaLenta(map);
  });
}
