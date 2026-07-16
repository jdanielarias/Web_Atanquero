// Convierte los .gpx de src/data/routes/ en src/data/routes.json, el archivo
// que lee el mapa del territorio. Se corre una sola vez por ruta nueva:
//
//   node scripts/gpx-a-rutas.mjs
//
// Si la ruta ya estaba en routes.json, respeta lo editado a mano (nombre,
// descripcion, dificultad, duracion, fotos) y solo recalcula el trazado, la
// distancia y el desnivel a partir del GPX.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpetaGpx = join(raiz, 'src', 'data', 'routes');
const salida = join(raiz, 'src', 'data', 'routes.json');

// Distancia entre dos puntos sobre la esfera, en km.
function haversine([lon1, lat1], [lon2, lat2]) {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

function leerPuntos(xml) {
  const puntos = [];
  const re = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  let m;
  while ((m = re.exec(xml))) {
    const ele = /<ele>([^<]+)<\/ele>/.exec(m[3]);
    puntos.push({
      lon: Number(m[2]),
      lat: Number(m[1]),
      ele: ele ? Number(ele[1]) : null,
    });
  }
  return puntos;
}

const archivos = (await readdir(carpetaGpx)).filter((f) => f.endsWith('.gpx'));
if (!archivos.length) {
  console.error(`No hay archivos .gpx en ${carpetaGpx}`);
  process.exit(1);
}

const previas = existsSync(salida) ? JSON.parse(await readFile(salida, 'utf8')) : [];
const rutas = [];

for (const archivo of archivos) {
  const id = basename(archivo, '.gpx');
  const puntos = leerPuntos(await readFile(join(carpetaGpx, archivo), 'utf8'));
  if (puntos.length < 2) {
    console.warn(`${archivo}: sin puntos de trazado, lo salto.`);
    continue;
  }

  const coordinates = puntos.map((p) => [p.lon, p.lat]);
  let distancia = 0;
  for (let i = 1; i < coordinates.length; i++) {
    distancia += haversine(coordinates[i - 1], coordinates[i]);
  }

  let desnivel = 0;
  let sinElevacion = false;
  for (let i = 1; i < puntos.length; i++) {
    if (puntos[i].ele == null || puntos[i - 1].ele == null) {
      sinElevacion = true;
      continue;
    }
    const delta = puntos[i].ele - puntos[i - 1].ele;
    if (delta > 0) desnivel += delta;
  }
  if (sinElevacion) {
    console.warn(`${archivo}: le faltan puntos de elevación — el desnivel puede quedar corto.`);
  }

  const previa = previas.find((r) => r.id === id) ?? {};
  rutas.push({
    id,
    nombre: previa.nombre || id.replaceAll('-', ' '),
    descripcion_corta: previa.descripcion_corta || '',
    dificultad: previa.dificultad || 'moderado',
    distancia_km: Math.round(distancia * 10) / 10,
    desnivel_m: Math.round(desnivel),
    duracion_estimada: previa.duracion_estimada || '',
    geojson: { type: 'LineString', coordinates },
    fotos: previa.fotos || [],
    es_prueba: previa.es_prueba ?? id.includes('prueba'),
  });
  console.log(
    `${archivo} → ${rutas.at(-1).nombre}: ${rutas.at(-1).distancia_km} km, +${rutas.at(-1).desnivel_m} m`,
  );
}

await writeFile(salida, JSON.stringify(rutas, null, 2) + '\n');
console.log(`Listo: ${rutas.length} ruta(s) en ${salida}`);
