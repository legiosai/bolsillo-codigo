"""Comprueba la exportación de Rosario antes de incorporarla al sitio estático."""
import argparse
from datetime import datetime
import json
from pathlib import Path
from shutil import copyfile
from urllib.parse import urlsplit

from exportar import CATALOGO, COMERCIOS, numero


def fecha(datos):
    hora = datetime.fromisoformat(datos["actualizado"])
    if hora.tzinfo is None:
        raise ValueError("La actualización necesita una fecha con zona horaria.")
    return hora


def validar(datos):
    if set(datos) != {"actualizado", "tiendas", "productos"} or set(datos["tiendas"]) != set(COMERCIOS):
        raise ValueError("Se esperaba el catálogo exportado de Rosario.")
    for identificador, tienda in datos["tiendas"].items():
        if (set(tienda) != {"nombre", "disponible"} or tienda["nombre"] != COMERCIOS[identificador][0]
                or type(tienda["disponible"]) is not bool):
            raise ValueError("Comercio inválido en el catálogo.")
    productos = datos["productos"]
    if len(productos) != len(CATALOGO) or {p["id"] for p in productos} != set(CATALOGO):
        raise ValueError("El catálogo no incluye los productos previstos.")
    total = 0
    for p in productos:
        if set(p) != {"id", "nombre", "ofertas"} or p["nombre"] != CATALOGO[p["id"]]:
            raise ValueError("Producto inválido en el catálogo.")
        for oferta in p["ofertas"]:
            if (set(oferta) - {"tienda", "nombre", "precio", "enlace", "porUnidad"}
                    or not isinstance(oferta["nombre"], str) or not oferta["nombre"].strip()
                    or not numero(oferta["precio"]) or oferta["precio"] <= 0
                    or not datos["tiendas"][oferta["tienda"]]["disponible"]):
                raise ValueError("Oferta inválida en el catálogo.")
            if "enlace" in oferta:
                enlace = urlsplit(oferta["enlace"])
                if enlace.scheme != "https" or enlace.netloc != COMERCIOS[oferta["tienda"]][1]:
                    raise ValueError("El enlace no coincide con el comercio.")
            if "porUnidad" in oferta:
                u = oferta["porUnidad"]
                if (set(u) != {"unidad", "precio"} or u["unidad"] not in {"kg", "l", "u"}
                        or not numero(u["precio"]) or u["precio"] <= 0):
                    raise ValueError("Precio por unidad inválido.")
            total += 1
    if not total:
        raise ValueError("El catálogo no contiene ofertas.")
    return total


def actualizar(origen, destino):
    datos = json.loads(origen.read_text(encoding="utf-8"))
    ofertas = validar(datos)
    if fecha(datos) < fecha(json.loads(destino.read_text(encoding="utf-8"))):
        raise ValueError("El índice es anterior al catálogo incluido en el sitio.")
    copyfile(origen, destino)
    print(f"{datos['actualizado']} · {len(datos['productos'])} productos · {ofertas} ofertas")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("origen", type=Path)
    parser.add_argument("destino", type=Path)
    argumentos = parser.parse_args()
    actualizar(argumentos.origen, argumentos.destino)
