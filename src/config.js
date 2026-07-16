// Lo único que hay que cambiar para salir a producción.

export const WHATSAPP = '573213025267'; // el número real, con indicativo y sin +

export function wa(mensaje) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}
