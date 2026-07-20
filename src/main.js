import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/karla';
import './css/app.css';

import { cargarMochilas } from './catalogo/cargar.js';
import { cargarPiezas } from './hilo/cargar.js';
import { cargarExperiencias } from './experiencias/cargar.js';
import { wa } from './config.js';

const $ = (s, r = document) => r.querySelector(s);

// El nav pegajoso mide distinto en movil (dos filas) que en escritorio. Se
// publica su alto real para que los saltos de ancla no dejen el rotulo debajo.
const nav = $('.nav');
const medirNav = () =>
  document.documentElement.style.setProperty('--alto-nav', `${nav.offsetHeight}px`);
medirNav();
addEventListener('resize', medirNav);

// El mismo script sirve a la principal y a mochilas.html: cada enlace y cada
// lista solo se tocan si existen en la pagina.
const enlaceWa = (sel, mensaje) => {
  const el = $(sel);
  if (el) el.href = wa(mensaje);
};
enlaceWa('#waTour', 'Hola Enosh, quiero cuadrar un recorrido por Atánquez.');
enlaceWa('#waPie', 'Hola Enosh, quiero más información.');
enlaceWa('#waNav', 'Hola Enosh, quiero más información.');

// El mapa del territorio vive en la portada. MapLibre pesa mas que todo el
// resto del sitio junto, asi que va en su propio pedazo del build y solo se
// carga en la pagina que tiene el contenedor. Ademas no lo arrancamos en el
// mismo momento del render: esperamos con IntersectionObserver a que el mapa
// este por entrar en pantalla, para que el titulo, la foto y el texto de la
// portada pinten primero y MapLibre no compita con ellos por el hilo principal.
// Mientras tanto el contenedor muestra su fondo de polvo (ver app.css).
const lienzoMapa = $('#mapa-territorio');
if (lienzoMapa) {
  const arrancarMapa = () =>
    import('./mapa/territorio.js').then((m) => m.montarMapa(lienzoMapa));
  const vigia = new IntersectionObserver(
    (entradas, obs) => {
      if (entradas.some((e) => e.isIntersecting)) {
        obs.disconnect();
        arrancarMapa();
      }
    },
    // Un margen para que arranque un poco antes de asomarse, sin sorpresas.
    { rootMargin: '300px' },
  );
  vigia.observe(lienzoMapa);
}

const mochilas = cargarMochilas();
const lista = $('#catalogo');

const texto = (t) => document.createTextNode(t);

function tarjeta(m) {
  const li = document.createElement('li');
  li.className = 'mochila';

  const hilo = document.createElement('span');
  hilo.className = 'hilo-lateral';
  hilo.setAttribute('aria-hidden', 'true');
  li.append(hilo);

  // --- foto ---
  const foto = document.createElement('div');
  foto.className = 'mochila-foto';
  if (m.portada) {
    const img = document.createElement('img');
    img.src = m.portada;
    img.alt = `${m.nombre}, tejida a mano en Atánquez`;
    img.loading = 'lazy';
    foto.append(img);
  } else {
    const vacio = document.createElement('div');
    vacio.className = 'sin-foto';
    const p = document.createElement('p');
    p.append(texto('Falta la foto'));
    const c = document.createElement('code');
    c.append(texto(`mochilas/${m.id}/portada.jpg`));
    vacio.append(p, c);
    foto.append(vacio);
  }

  // --- cuerpo ---
  const cuerpo = document.createElement('div');
  cuerpo.className = 'mochila-cuerpo';

  const marca = document.createElement('span');
  marca.className = `marca ${m.estado === 'vendida' ? 'vendida' : 'disponible'}`;
  marca.append(texto(m.estado === 'vendida' ? 'Vendida' : 'Disponible'));

  const h3 = document.createElement('h3');
  h3.append(texto(m.nombre));

  cuerpo.append(marca, h3);

  if (m.historia) {
    const p = document.createElement('p');
    p.className = 'mochila-historia';
    p.append(texto(m.historia));
    cuerpo.append(p);
  }

  if (m.precio) {
    const p = document.createElement('p');
    p.className = 'mochila-precio';
    p.append(texto(`$${m.precio.toLocaleString('es-CO')} COP`));
    cuerpo.append(p);
  }

  if (m.ficha.length) {
    const ul = document.createElement('ul');
    ul.className = 'mochila-ficha';
    for (const f of m.ficha) {
      const li2 = document.createElement('li');
      li2.append(texto(f));
      ul.append(li2);
    }
    cuerpo.append(ul);
  }

  // --- acciones ---
  const acciones = document.createElement('div');
  acciones.className = 'mochila-acciones';

  if (m.estado === 'vendida') {
    const sp = document.createElement('span');
    sp.className = 'boton';
    sp.setAttribute('aria-disabled', 'true');
    sp.append(texto('Ya tiene dueño'));
    acciones.append(sp);
  } else {
    const a = document.createElement('a');
    a.className = 'boton solido';
    a.href = wa(`Hola Enosh, me interesa la ${m.nombre}.`);
    a.target = '_blank';
    a.rel = 'noopener';
    a.append(texto('Preguntar'));
    acciones.append(a);
  }

  cuerpo.append(acciones);
  li.append(foto, cuerpo);
  return li;
}

if (lista) {
  if (!mochilas.length) {
    const li = document.createElement('li');
    li.className = 'aviso';
    li.append(
      texto('Todavía no hay mochilas. Crea una carpeta en mochilas/ con su mochila.json — mira el README.'),
    );
    lista.append(li);
  } else {
    lista.append(...mochilas.map(tarjeta));
  }
}

// --- el hilo: videos y fotos que se van sumando --------------------------
// El video no carga nada de YouTube hasta que se toca: primero es solo la
// miniatura (una imagen) con el boton de play. Al tocar, entra el iframe de
// youtube-nocookie con autoplay.
const piezas = cargarPiezas();
const hiloLista = $('#hilo-lista');

function tarjetaPieza(pz) {
  const li = document.createElement('li');
  li.className = 'pieza';

  const marco = document.createElement('div');
  marco.className = 'pieza-marco';

  if (pz.youtube) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'pieza-video';
    boton.setAttribute('aria-label', `Ver el video: ${pz.titulo}`);
    const img = document.createElement('img');
    img.src = `https://i.ytimg.com/vi/${pz.youtube}/hqdefault.jpg`;
    img.alt = '';
    img.loading = 'lazy';
    const play = document.createElement('span');
    play.className = 'pieza-play';
    play.setAttribute('aria-hidden', 'true');
    boton.append(img, play);
    boton.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${pz.youtube}?autoplay=1`;
      iframe.title = pz.titulo;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      marco.replaceChildren(iframe);
    });
    marco.append(boton);
  } else if (pz.foto) {
    const img = document.createElement('img');
    img.src = pz.foto;
    img.alt = pz.titulo;
    img.loading = 'lazy';
    marco.append(img);
  } else {
    const vacio = document.createElement('div');
    vacio.className = 'sin-foto';
    const p = document.createElement('p');
    p.append(texto('Falta el video o la foto'));
    const c = document.createElement('code');
    c.append(texto(`hilo/${pz.id}/pieza.json`));
    vacio.append(p, c);
    marco.append(vacio);
  }

  const pie = document.createElement('div');
  pie.className = 'pieza-pie';

  const tipo = document.createElement('span');
  tipo.className = 'pieza-tipo';
  tipo.append(texto(pz.youtube ? 'Video' : 'Foto'));

  const h3 = document.createElement('h3');
  h3.append(texto(pz.titulo));
  pie.append(tipo, h3);

  if (pz.nota) {
    const p = document.createElement('p');
    p.append(texto(pz.nota));
    pie.append(p);
  }

  li.append(marco, pie);
  return li;
}

if (hiloLista) {
  if (!piezas.length) {
    const li = document.createElement('li');
    li.className = 'aviso';
    li.append(
      texto('Todavía no hay videos ni fotos. Crea una carpeta en hilo/ con su pieza.json — mira el README.'),
    );
    hiloLista.append(li);
  } else {
    hiloLista.append(...piezas.map(tarjetaPieza));
  }
}

// --- experiencias: las puntadas que van quedando -------------------------
// Cada experiencia es una tarjeta con su carrusel de fotos: la tira se
// desliza con scroll-snap (dedo en el celular) y las flechas y puntos solo
// aparecen cuando hay mas de una foto.
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// "2026-06" -> "junio de 2026" y "2026-06-14" -> "14 de junio de 2026".
function fechaBonita(fecha) {
  const [a, m, d] = String(fecha).split('-').map(Number);
  if (!a) return '';
  if (d && MESES[m - 1]) return `${d} de ${MESES[m - 1]} de ${a}`;
  if (MESES[m - 1]) return `${MESES[m - 1]} de ${a}`;
  return String(a);
}

function carrusel(exp) {
  const caja = document.createElement('div');
  caja.className = 'exp-carrusel';

  const tira = document.createElement('div');
  tira.className = 'exp-tira';
  tira.setAttribute('role', 'group');
  tira.setAttribute('aria-label', `Fotos de ${exp.titulo}`);
  tira.tabIndex = 0;

  exp.fotos.forEach((url, i) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = `${exp.titulo} — foto ${i + 1} de ${exp.fotos.length}`;
    img.loading = i === 0 ? 'eager' : 'lazy';
    tira.append(img);
  });
  caja.append(tira);

  // Con una sola foto no hay nada que pasar: ni flechas ni puntos.
  if (exp.fotos.length < 2) return caja;

  const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const irA = (i) => {
    const tope = Math.max(0, Math.min(i, exp.fotos.length - 1));
    tira.scrollTo({ left: tope * tira.clientWidth, behavior: suave ? 'smooth' : 'auto' });
  };
  const actual = () => Math.round(tira.scrollLeft / tira.clientWidth);

  const flecha = (clase, rotulo, salto) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `exp-flecha ${clase}`;
    b.setAttribute('aria-label', rotulo);
    b.append(texto(clase === 'atras' ? '‹' : '›'));
    b.addEventListener('click', () => irA(actual() + salto));
    return b;
  };
  caja.append(
    flecha('atras', 'Foto anterior', -1),
    flecha('alante', 'Foto siguiente', 1),
  );

  const puntos = document.createElement('div');
  puntos.className = 'exp-puntos';
  const botones = exp.fotos.map((_, i) => {
    const p = document.createElement('button');
    p.type = 'button';
    p.setAttribute('aria-label', `Ir a la foto ${i + 1}`);
    if (i === 0) p.setAttribute('aria-current', 'true');
    p.addEventListener('click', () => irA(i));
    puntos.append(p);
    return p;
  });
  caja.append(puntos);

  // El punto encendido sigue al scroll, venga de las flechas o del dedo.
  let espera = null;
  tira.addEventListener('scroll', () => {
    if (espera) return;
    espera = requestAnimationFrame(() => {
      espera = null;
      const en = actual();
      botones.forEach((p, i) =>
        i === en ? p.setAttribute('aria-current', 'true') : p.removeAttribute('aria-current'),
      );
    });
  });

  return caja;
}

function tarjetaExperiencia(exp) {
  const art = document.createElement('article');
  art.className = 'experiencia';

  const hiloLat = document.createElement('span');
  hiloLat.className = 'hilo-lateral';
  hiloLat.setAttribute('aria-hidden', 'true');
  art.append(hiloLat);

  if (exp.fotos.length) {
    art.append(carrusel(exp));
  } else {
    const marco = document.createElement('div');
    marco.className = 'exp-carrusel';
    const vacio = document.createElement('div');
    vacio.className = 'sin-foto';
    const p = document.createElement('p');
    p.append(texto('Faltan las fotos'));
    const c = document.createElement('code');
    c.append(texto(`experiencias/${exp.id}/fotos/`));
    vacio.append(p, c);
    marco.append(vacio);
    art.append(marco);
  }

  const cuerpo = document.createElement('div');
  cuerpo.className = 'exp-texto';

  const cuando = [fechaBonita(exp.fecha), exp.lugar].filter(Boolean).join(' · ');
  if (cuando) {
    const sp = document.createElement('span');
    sp.className = 'exp-fecha';
    sp.append(texto(cuando));
    cuerpo.append(sp);
  }

  const h3 = document.createElement('h3');
  h3.append(texto(exp.titulo));
  cuerpo.append(h3);

  if (exp.descripcion) {
    const p = document.createElement('p');
    p.append(texto(exp.descripcion));
    cuerpo.append(p);
  }

  art.append(cuerpo);
  return art;
}

const experienciasLista = $('#experiencias-lista');
if (experienciasLista) {
  const experiencias = cargarExperiencias();
  if (!experiencias.length) {
    const aviso = document.createElement('div');
    aviso.className = 'aviso';
    aviso.append(
      texto('Todavía no hay experiencias. Crea una carpeta en experiencias/ con su experiencia.json — mira el README — o súbela desde el panel /admin/.'),
    );
    experienciasLista.append(aviso);
  } else {
    experienciasLista.append(...experiencias.map(tarjetaExperiencia));
  }
}
