# El Atanquero — Mapa de rutas (estilo Strava) — Prompts para Claude Code

Dáselos en orden a Claude Code, dentro del mismo proyecto que ya tienen. Antes de
empezar, sube tu archivo GPX a una carpeta del proyecto, por ejemplo:
`/src/data/routes/nombre-de-la-ruta.gpx`

---

## Contexto técnico (pégalo antes del Prompt 1, o inclúyelo en tu CLAUDE.md)

```
Vamos a agregar un mapa interactivo del territorio Kankuamo (alrededor de
Atánquez, Cesar, Sierra Nevada de Santa Marta — coordenadas aprox. lat 10.70,
lon -73.35) con las rutas de los tours guiados, estilo Strava/Wikiloc:
un mapa real (no ilustrado) centrado SOLO en esta zona, con las rutas dibujadas
encima con una animación de trazo, y al hacer clic en una ruta se abre un panel
con fotos y datos.

Librerías a usar (ambas gratuitas, sin API key ni tarjeta de crédito):
- MapLibre GL JS: renderiza el mapa interactivo (fork de código abierto de
  Mapbox GL JS, mismo API, sin necesidad de token de pago)
- Tiles: OpenFreeMap (https://openfreemap.org) — mapas vectoriales gratuitos
  basados en OpenStreetMap, sin registro ni API key. Usa el estilo "liberty"
  como base y lo re-estilizamos.

No uses Google Maps ni Mapbox de pago — ambos requieren tarjeta de crédito o
tienen límites de uso pagos a futuro.
```

---

## PROMPT 1 — Setup del mapa base, acotado al territorio

```
Instala maplibre-gl como dependencia del proyecto.

Crea un componente de mapa (ej. TerritoryMap) que:

1. Use MapLibre GL JS con el estilo de tiles de OpenFreeMap
   (style URL: https://tiles.openfreemap.org/styles/liberty)
2. Centre el mapa en Atánquez: lat 10.70, lon -73.35, zoom inicial 12
3. Restrinja el mapa para que NO se pueda alejar más allá del territorio
   Kankuamo — usa maxBounds de MapLibre con un cuadro aproximado alrededor de
   Atánquez (dame el código con un bounding box de ejemplo tipo
   [[-73.55, 10.55], [-73.15, 10.85]] que yo puedo ajustar después)
4. Limite el zoom mínimo para que no se pueda alejar a ver el mundo entero
   (minZoom alrededor de 10-11)
5. Oculte o simplifique las capas que no aportan (nombres de países, fronteras,
   POIs genéricos de otras ciudades) — solo debe verse relieve, ríos, y las
   vías principales

Sobrescribe los colores del estilo del mapa para que combinen con nuestra
paleta de diseño (variables ya definidas en tokens.css):
- Fondo/tierra: tonos de --bg-void y --bg-surface
- Agua/ríos: --river o un azul-verde apagado similar
- Vegetación: --sierra-green
- Vías: --ochre muy tenue

Dime qué capas tiene el estilo "liberty" de OpenFreeMap para poder decirte
exactamente cuáles ocultar o recolorear.
```

---

## PROMPT 2 — Crear el esquema de datos y una ruta de PRUEBA (aún sin tu GPX real)

```
Todavía no voy a subir mi archivo GPX real — quiero que primero dejes
funcionando todo el sistema con una ruta de PRUEBA, para poder ver el mapa y
las animaciones funcionando ya. Cuando tenga mi GPX real, lo voy a subir y
te pediré que lo proceses con el mismo sistema, sin tener que rehacer nada.

Por eso, haz esto en dos partes:

PARTE A — Define el esquema y el pipeline reutilizable:
Escribe un script (a correr una sola vez, ej. con Node, no en el navegador)
que:
1. Lea cualquier archivo .gpx que yo ponga en /src/data/routes/
2. Extraiga la secuencia de coordenadas (lat/lon) como una línea GeoJSON
   (LineString)
3. Calcule la distancia total en km y el desnivel positivo aproximado a
   partir de los puntos de elevación del GPX
4. Guarde el resultado en /src/data/routes.json con esta estructura (así
   puedo agregar rutas nuevas más adelante sin tocar código):

{
  "id": "ruta-001",
  "nombre": "",
  "descripcion_corta": "",
  "dificultad": "moderado",   // "facil" | "moderado" | "dificil"
  "distancia_km": 0,
  "desnivel_m": 0,
  "duracion_estimada": "",
  "geojson": { "type": "LineString", "coordinates": [] },
  "fotos": [],                 // rutas a fotos de esa ruta, las agrego yo después
  "es_prueba": false            // true si es una ruta de prueba, para poder identificarlas y quitarlas fácil
}

PARTE B — Genera una ruta de prueba realista:
Como todavía no tengo el GPX real, genera TÚ un archivo .gpx de muestra
(guárdalo en /src/data/routes/ruta-prueba.gpx) con un trazado de caminata
plausible cerca de Atánquez (lat 10.70, lon -73.35, Sierra Nevada de Santa
Marta, terreno de montaña) — unos 15-25 puntos con coordenadas que se muevan
de forma realista por esa zona y con elevación variando entre 1900 y 2300
metros (Atánquez está a ~2000 msnm). No tiene que ser exacto, solo servir
para probar que todo el sistema funciona de principio a fin.

Corre el script sobre ese GPX de prueba, guarda el resultado en routes.json
marcado con "es_prueba": true, y muéstrame el resultado.
```

---

## PROMPT 3 — Dibujar la ruta en el mapa con animación estilo Strava

```
En el componente TerritoryMap, carga las rutas desde /src/data/routes.json y
dibuja cada una como una capa de línea sobre el mapa (source type "geojson" +
layer type "line"), con:

- Color de línea: --terracota, grosor 3-4px, con un halo/sombra sutil detrás
  (una segunda línea más gruesa y más oscura debajo, técnica típica de mapas
  de rutas para que se lea bien sobre cualquier fondo)
- Animación de "trazo apareciendo": cuando el mapa carga o cuando la ruta
  entra en el viewport, anima la línea dibujándose de inicio a fin (como el
  efecto de Strava/Wikiloc), usando line-dasharray animado o recortando la
  cantidad de coordenadas mostradas progresivamente con requestAnimationFrame
- Un marcador en el punto de inicio y otro en el punto final de la ruta,
  con un estilo simple (círculo con el color de acento) en vez de los pines
  por defecto de Maplibre

Al pasar el mouse sobre una ruta, resáltala (aumenta el grosor o cambia a
--ochre). Al hacer clic sobre la ruta, abre un panel lateral o modal con:
- Nombre de la ruta
- Distancia, desnivel, dificultad, duración estimada
- Galería de fotos (usa las de /src/data/routes.json, con placeholders si el
  array de fotos está vacío)
- Botón de "Agendar este tour por WhatsApp" con mensaje pre-llenado
  mencionando el nombre de la ruta (misma constante de WhatsApp que ya usamos
  en el resto del sitio)

Respeta prefers-reduced-motion: si está activado, dibuja la ruta completa de
una vez, sin animación de trazado.
```

---

## PROMPT 4 — Integración visual con el resto del sitio

```
Integra TerritoryMap dentro del Capítulo II (Tours), reemplazando o
complementando la lista de tours actual — el mapa debe sentirse parte del
mismo sistema de diseño, no un widget insertado de otra app:

- Aplica el mismo radio de bordes, tipografía (JetBrains Mono para las
  etiquetas de distancia/dificultad, Fraunces para el nombre de la ruta en
  el panel) y espaciados que ya usamos en el resto del sitio
- El contenedor del mapa debe tener el mismo tratamiento de borde
  (var(--line)) que las demás tarjetas
- En mobile, el mapa debe seguir siendo usable: controles de zoom accesibles
  al tacto, y el panel de detalles de la ruta debe abrirse como hoja
  deslizante desde abajo en vez de modal centrado

Revisa que el mapa cargue de forma perezosa (lazy) — que no se descargue el
JS de MapLibre hasta que la sección de Tours esté por entrar en el viewport,
para no afectar el tiempo de carga inicial del hero.

Al final, dime:
1. Cómo agrego una ruta nueva (otro GPX) sin tener que pedirte ayuda cada vez
2. Cómo cambio el bounding box del mapa si quiero mostrar un área más amplia
3. Si hay algún límite de uso gratuito de OpenFreeMap que debería tener en
   cuenta si el sitio crece mucho en visitas
```

---

## PROMPT 5 — Reemplazar la ruta de prueba por tu GPX real (cuando lo tengas listo)

```
Ya subí mi archivo GPX real a /src/data/routes/[nombre-del-archivo].gpx —
es el trazado real de uno de nuestros tours.

Corre el mismo script de conversión que ya construiste (el que lee un .gpx
y lo agrega a routes.json) sobre este archivo real, y agrégalo a
routes.json como una ruta nueva con "es_prueba": false.

Después, elimina del archivo routes.json (y del proyecto, incluyendo
/src/data/routes/ruta-prueba.gpx) la ruta de prueba que generaste antes —
ya no la necesitamos, era solo para probar que el sistema funcionaba.

Confirma que el mapa siga funcionando igual de bien con la ruta real que con
la de prueba (mismo trazado animado, mismo panel al hacer clic, etc.) y
avísame si la distancia o el desnivel calculados no coinciden con lo que tú
sabes que es la ruta real, para revisar si el GPX trae buenos datos de
elevación.
```

---

## Nota sobre tu archivo GPX

Cuando lo subas al proyecto, revisa que tenga los puntos de **elevación**
incluidos (no todos los exportadores los guardan) — los necesitamos para
calcular el desnivel. Si tu app de grabación (Strava, Wikiloc, etc.) permite
exportar en formato ".gpx" directamente desde la actividad, ese suele traer
la elevación completa.

Si tienes más de una ruta grabada, puedes repetir el Prompt 2 con cada
archivo — el sistema ya queda listo para múltiples rutas en el mismo
`routes.json`.
