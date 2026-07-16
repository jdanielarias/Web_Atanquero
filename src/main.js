import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/karla';
import './css/app.css';

import { cargarMochilas } from './catalogo/cargar.js';
import { cargarPiezas } from './hilo/cargar.js';
import { wa } from './config.js';

const $ = (s, r = document) => r.querySelector(s);

// El nav pegajoso mide distinto en movil (dos filas) que en escritorio. Se
// publica su alto real para que los saltos de ancla no dejen el rotulo debajo.
const nav = $('.nav');
const medirNav = () =>
  document.documentElement.style.setProperty('--alto-nav', `${nav.offsetHeight}px`);
medirNav();
addEventListener('resize', medirNav);

$('#waTour').href = wa('Hola Enosh, quiero cuadrar un recorrido por Atánquez.');
$('#waPie').href = wa('Hola Enosh, quiero más información.');
$('#waNav').href = wa('Hola Enosh, quiero más información.');

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
