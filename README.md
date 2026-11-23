# Bolsillo

Bolsillo es una herramienta gratuita y de código abierto para comparar cuánto cuesta una lista de compras completa en los supermercados de Rosario. Sol Soletti empezó el comparador en Casa y lo creó junto a Valentín Torassa Colombero como proyecto de Legios.

[Abrir Bolsillo con los precios de Rosario](https://legiosai.github.io/bolsillo/)

## Ejecutarlo en tu computadora

Con Python 3, desde la raíz del repositorio:

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory site
```

Abrí [la demo local](http://127.0.0.1:8080/). Funciona sin cuenta, claves ni servicios de pago. Incluye cuatro productos y tres comercios ficticios con ilustraciones propias. Probá sumar un limón al ejemplo inicial para ver cómo cambia el supermercado más barato. La lista y los favoritos quedan en el navegador.

## Cómo funciona la comparación

El motor de [site/lista.mjs](site/lista.mjs) compara presentaciones equivalentes, elige la oferta más barata que coincide en cada súper y suma en centavos. Se puede desplegar el ticket para revisar cada renglón. Un supermercado al que le falte un producto aparece aparte, con el detalle del faltante.

El sitio lee [site/catalogo.json](site/catalogo.json). El ejemplo muestra la fecha de actualización, los comercios, sus ofertas, la unidad y el precio por unidad. Para adaptar el comparador podés reemplazar los precios por los de tu ciudad, ajustar las presentaciones en el motor y agregar las imágenes con los mismos identificadores en `site/recursos/`. [scripts/exportar.py](scripts/exportar.py) permite convertir un índice compatible ya evaluado por Jev. La demo funciona directamente con su JSON.

## Pruebas y aportes

```sh
node --test tests/lista.test.mjs
```

Podés [abrir un issue](https://github.com/legiosai/bolsillo-codigo/issues) con un producto que falte o una comparación que dé mal. Para reproducirla ayudan la presentación, la cantidad y el resultado esperado. También podés mandar un pull request con el cambio y un caso de prueba.

## Licencias

El código, la documentación, el catálogo ficticio y el arte de ejemplo se distribuyen con la [licencia MIT](LICENSE). Las fuentes DM Sans e Instrument Serif conservan sus respectivas licencias [SIL Open Font License](site/recursos/dm-OFL.txt) y [SIL Open Font License](site/recursos/instrument-OFL.txt). Los logos de las cadenas y las fotos comerciales que aparecen en el sitio de Rosario pertenecen a sus titulares y se gestionan aparte de esta distribución.
