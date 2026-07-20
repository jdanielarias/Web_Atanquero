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
const AGUA = '#7f98b3'; // añil rebajado, para rios y lagunas
const VERDE = '#c6cbab'; // monte rebajado, para vegetacion
const VIA = '#c0b48c'; // fique tenue, para las vias

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
          map.setPaintProperty(id, 'text-color', TINTA_MEDIA);
          map.setPaintProperty(id, 'text-halo-color', PAPEL_ALTO);
        }
      }
    } catch {
      /* capa sin esa propiedad: se deja como esta */
    }
  }
}

// El marcador es un boton con area de toque de 44px (el punto visible se
// dibuja en CSS): tocarlo abre los datos de la ruta, que con el puro trazo
// era muy dificil de atinar con el dedo.
function marcador(map, coordenada, clase, etiqueta, alTocar) {
  const punto = el('button', `mapa-marcador ${clase}`);
  punto.type = 'button';
  punto.setAttribute('aria-label', etiqueta);
  punto.addEventListener('click', alTocar);
  new maplibregl.Marker({ element: punto }).setLngLat(coordenada).addTo(map);
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

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
  panel.append(datos);

  if (ruta.fotos.length) {
    const fotos = el('div', 'mapa-panel-fotos');
    for (const src of ruta.fotos) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Foto del recorrido ${ruta.nombre}`;
      img.loading = 'lazy';
      fotos.append(img);
    }
    panel.append(fotos);
  }

  const boton = el('a', 'boton solido', 'Agendar este recorrido');
  boton.href = wa(`Hola Enosh, quiero agendar el recorrido: ${ruta.nombre}.`);
  boton.target = '_blank';
  boton.rel = 'noopener';
  panel.append(boton);

  panel.hidden = false;
}

export function montarMapa(contenedor) {
  const map = new maplibregl.Map({
    container: contenedor,
    // "positron" es el estilo minimalista de OpenFreeMap: muchas menos capas
    // que "liberty", asi que rinde mas liviano (menos trabajo de dibujado). Las
    // teselas son las mismas (esquema OpenMapTiles), asi que vestirMapa lo
    // recolorea igual con la paleta del sitio.
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: [-73.35, 10.7],
    zoom: 12,
    minZoom: 10.5,
    maxZoom: 16,
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

      const abrirRuta = () => mostrarRuta(panel, ruta);
      marcador(map, coords[0], 'inicio', `Inicio de ${ruta.nombre}: ver los datos de la ruta`, abrirRuta);
      marcador(map, coords.at(-1), 'fin', `Fin de ${ruta.nombre}: ver los datos de la ruta`, abrirRuta);
      animarTrazo(map, idFuente, coords);

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
    // de 3.5px seria imposible de atinar con el dedo. El margen de 22px deja
    // una zona de ~44px, el tamaño de la yema de un dedo.
    const capasRuta = [...rutaPorCapa.keys()];
    map.on('click', (e) => {
      const margen = 22;
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
        // Mas aire abajo para que los marcadores no queden bajo la barra de
        // atribucion del mapa, que se traga el toque.
        { padding: { top: 48, left: 48, right: 48, bottom: 80 }, animate: false },
      );
    }
  });
}
