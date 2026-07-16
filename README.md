# El Atánquero

Sitio de mochilas kankuamas y recorridos por Atánquez, con Enosh Arias
(@elatanquero), comunicador kankuamo.

## Correrlo

```bash
npm install     # solo la primera vez
npm run dev     # abre http://localhost:5173
npm run build   # deja el sitio listo para subir, en dist/
```

---

## Agregar una mochila

**No hay que tocar código.** Cada mochila es una carpeta dentro de `mochilas/`.
Creas la carpeta, pones los archivos, y aparece sola en el catálogo.

```
mochilas/
  mochila-del-caracol/        <- el nombre que quieras, sin espacios ni tildes
    mochila.json              <- OBLIGATORIO
    portada.jpg               <- la foto principal del catálogo
    fotos/
      1.jpg
      2.jpg
```

Solo `mochila.json` es obligatorio. Si falta la foto, la mochila igual sale en
el catálogo y te avisa en pantalla qué le falta.

### `mochila.json`

```json
{
  "nombre": "Mochila del caracol",
  "dibujo": "El caracol",
  "estado": "disponible",
  "precio": null,
  "historia": "Una frase corta sobre el dibujo.",
  "ficha": ["Fique de maguey macaneado a mano", "Teñida con palo brasil", "Tejida en Atánquez"]
}
```

- `estado`: `"disponible"` o `"vendida"`. Las vendidas bajan al final solas y
  pierden el botón de WhatsApp.
- `precio`: un número (`180000`) o `null` para que diga "pregunta por WhatsApp".

---

## Agregar un video o una foto (sección "El hilo")

Funciona igual que las mochilas: cada video o foto es una carpeta dentro de
`hilo/`. Creas la carpeta, pones su `pieza.json`, y aparece sola en la sección.

```
hilo/
  corpus-2026/                <- el nombre que quieras, sin espacios ni tildes
    pieza.json                <- OBLIGATORIO
    foto.jpg                  <- solo si la pieza es una foto
```

### Para un video de YouTube

```json
{
  "titulo": "Corpus Christi en Atánquez",
  "nota": "Los diablos, los negros y las cucambas en la calle.",
  "youtube": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  "fecha": "2026-06"
}
```

En `youtube` pega el enlace tal como lo copias de YouTube (sirve el de
compartir, el corto de youtu.be y el de shorts). El video no carga YouTube
hasta que alguien le da play: primero solo se ve la miniatura.

### Para una foto

El mismo `pieza.json` pero sin `youtube`, y pones la imagen como `foto.jpg`
en la carpeta:

```json
{
  "titulo": "El nacimiento del Guatapurí",
  "nota": "Subiendo con el grupo de la universidad.",
  "fecha": "2026-03"
}
```

- `nota` y `fecha` son opcionales.
- `fecha` es `"año-mes"` (`"2026-06"`) y solo se usa para ordenar: lo más
  reciente sale primero, y las piezas sin fecha bajan al final.

---

## Fotos de las mochilas

Con fotos normales alcanza. Cómo salen bien:

1. **Luz pareja, sombra o día nublado.** El sol directo quema el fique y mete
   sombras duras.
2. **Fondo sencillo y quieto**: una pared, una tela, una mesa de madera.
3. La portada sale mejor **vertical** (la tarjeta del catálogo es 4:5).
4. Guárdalas como `portada.jpg` (la principal) y las demás en `fotos/`.

---

## Antes de publicar

- [x] El número de WhatsApp real en `src/config.js`
- [ ] El enlace de YouTube si se quiere sumar (el canal es *El Mochilón TV*);
      Instagram, TikTok, Facebook y X ya apuntan a @elatanquero
- [ ] Las fotos de portada de cada mochila
- [ ] **Que Enosh revise todos los textos.** Salen de las fuentes de abajo,
      pero la última palabra sobre su cultura la tiene él y su pueblo. Con
      más razón ahora: la página habla en primera persona, en su voz
      ("soy Enosh...", "cuéntame..."), así que cada frase debe sonar a él.

---

## Lo que es real (y de dónde sale)

Investigado en julio de 2026, para que la página no invente:

- **Enosh David Arias, "El Atánquero"** — comunicador indígena kankuamo de
  Atánquez, capital del resguardo kankuamo. Realizador audiovisual, fotógrafo
  y podcaster. Dirige el pódcast *El Mochilón de la Sierra*, el canal *El
  Mochilón TV* y el programa *Voces Kankuamas* en Tayrona Stereo 90.7. Hace
  parte de la Comisión de Comunicación Propia e Intercultural del pueblo
  kankuamo. (Periódico El Campesino, Radio Nacional de Colombia)
- **Atánquez** — corregimiento de Valledupar en la ladera suroriental de la
  Sierra Nevada, entre los ríos Chiscuinlla y Candela. Calles empedradas, 18
  barrios. Resguardo kankuamo desde 2003. (El Pilón)
- **La mochila kankuama** — de fique (maguey) o de lana de oveja. Los
  hombres ("macaneros") sacan la fibra a mano; las mujeres la hilan, la
  tiñen y la tejen, y el
  saber pasa de madres y abuelas a hijas. Tintes de planta: dividivi,
  batatilla, palo brasil, eucalipto, morito, entre otros. Dibujos
  tradicionales documentados: **el caracol, el peine, los cerritos** —
  expresan el linaje de la tejedora. La base se llama **chipire** y la gasa
  se teje aparte. Tipos: susugao, tercera, corriente, carguera, mochilón.
  (Artesanías de Colombia)
- **Corpus Christi en Atánquez** — la fiesta grande, en junio: danzas de los
  diablos (rojo, máscaras, espejos y campanas), los negros del palenque
  (sombreros con flores y cintas, machete de palo) y las cucambas (el pájaro
  de la sierra). Representa la pelea del bien y el mal. (Radio Nacional,
  Enfoque Vallenato)
- **Sierra Nevada** — los kankuamos son uno de los cuatro pueblos que la
  cuidan, junto a koguis, wiwas y arhuacos; para ellos es el corazón del
  mundo. (ONIC, El Espectador)

**Ojo:** el número "90K+ de comunidad" que tenía la portada no se pudo
verificar y se quitó. Los precios y qué mochilas hay disponibles son datos
que solo Enosh puede dar.

---

## Cómo está armado

- **Vite**, sin frameworks.
- `src/catalogo/cargar.js` — descubre las carpetas de `mochilas/` sola, con
  `import.meta.glob`. Ahí está la magia de "no tocar código".
- `src/hilo/cargar.js` — lo mismo pero para `hilo/`: los videos de YouTube
  y las fotos de la sección "El hilo".
- `src/css/app.css` — todo el diseño. La paleta sale de materiales reales:
  fique crudo, añil, palo brasil. El único movimiento del sitio está en
  Recorridos: hojas que caen y agua que se mece, en CSS puro.
- `archive/` — la versión anterior del sitio y un telar procedural (tejido
  generado por shader) que se probó y se descartó. No se usa; está guardado por
  si algún día sirve.
