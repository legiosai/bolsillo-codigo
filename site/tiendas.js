export function logoTienda(id) {
  const img = document.createElement('img');
  img.className = 'logo-tienda';
  img.src = new URL('./recursos/tiendas/' + encodeURIComponent(id) + '.webp', import.meta.url);
  img.alt = '';
  img.width = 60;
  img.height = 36;
  return img;
}

export function marcaTienda(id, nombre) {
  const marca = document.createElement('strong');
  marca.className = 'marca-tienda';
  marca.append(logoTienda(id), nombre);
  return marca;
}
