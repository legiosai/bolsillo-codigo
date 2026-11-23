"""Produce un catálogo estático a partir de una corrida de Casa verificada con Jev."""
import argparse
import json
import math
import os
import re
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urlsplit

CATALOGO = {
    "yerba": "Yerba Playadito", "atun": "Atún", "mayonesa": "Mayonesa",
    "huevos": "Huevos", "papa": "Papa", "cebolla": "Cebolla",
    "zanahoria": "Zanahorias", "tomate": "Tomates", "limon": "Limón",
    "detergente": "Detergente", "papel-higienico": "Papel higiénico",
    "rollo-de-cocina": "Rollo de cocina",
    "salsa-cesar": "Salsa César",
    "queso-untable": "Queso untable",
    "arandanos": "Arándanos",
    "ramen-vaso": "Ramen cup Arcor",
    "ramen-bolsa": "Ramen Arcor en bolsita",
    "rucula": "Rúcula",
    "lechuga": "Lechuga de hoja",
    "batata": "Batata",
    "pimiento": "Pimiento",
    "jabon-ropa": "Jabón para la ropa",
    "suavizante": "Suavizante",
    "lavandina": "Lavandina",
    "enjuague-bucal": "Enjuague bucal",
    "algodon": "Algodón",
    "hisopos": "Hisopos",
    "jabon-manos": "Jabón líquido para manos",
    "pasta-dental": "Pasta de dientes",
    "desodorante-ambiente": "Desodorante de ambiente",
}
COMERCIOS = {
    "lagallega": ("La Gallega", "www.lagallega.com.ar"),
    "lareina": ("La Reina", "www.lareinaonline.com.ar"),
    "coto": ("Coto", "www.cotodigital.com.ar"),
    "carrefour": ("Carrefour", "www.carrefour.com.ar"),
    "jumbo": ("Jumbo", "www.jumbo.com.ar"),
    "disco": ("Disco", "www.disco.com.ar"),
    "changomas": ("Changomás", "www.masonline.com.ar"),
    "dia": ("Día", "diaonline.supermercadosdia.com.ar"),
}
UMBRAL_JEV = 0.5


def numero(valor):
    return type(valor) in (int, float) and math.isfinite(valor)


def oferta_publica(c, tienda, identificador):
    puntaje = c.get("jev")
    if not numero(puntaje) or not UMBRAL_JEV <= puntaje <= 1:
        return None
    precio = c.get("precio")
    if not numero(precio) or precio <= 0 or not isinstance(c.get("nombre"), str):
        return None
    linea = {"tienda": tienda, "nombre": c["nombre"].strip(), "precio": precio}
    nombre = linea["nombre"].casefold()
    if identificador == "yerba" and re.search(r"\b(cocido|saquitos?)\b", nombre):
        return None
    partes = urlsplit(c.get("url") or "")
    if partes.scheme == "https" and partes.netloc == COMERCIOS[tienda][1]:
        linea["enlace"] = partes.geturl()
    unidad = c.get("porUnidad") or {}
    if unidad.get("unidad") in ("kg", "l", "u") and numero(unidad.get("precio")) and unidad["precio"] > 0:
        if "precio por kilo" in nombre:
            linea["porUnidad"] = {"unidad": "kg", "precio": precio}
        elif "entre " not in nombre and "rinde " not in nombre:
            linea["porUnidad"] = {"unidad": unidad["unidad"], "precio": unidad["precio"]}
    return linea


def exportar(origen):
    if (origen.get("jev") or {}).get("modo") not in ("on", "shadow"):
        raise ValueError("La corrida necesita verificación Jev para exportarse.")
    tiendas_con_error = set(origen.get("errores", {}))
    consultadas = {t["id"] for t in origen["tiendas"]}
    tiendas = {k: {"nombre": nombre, "disponible": k in consultadas and k not in tiendas_con_error}
               for k, (nombre, _) in COMERCIOS.items()}
    productos = []
    for identificador, nombre in CATALOGO.items():
        coincidencias = [x for x in origen["items"] if x["nombre"] == nombre]
        if len(coincidencias) > 1:
            raise ValueError(f"Definición ambigua para {nombre}")
        precios = coincidencias[0]["precios"] if coincidencias else {}
        ofertas = []
        for k in tiendas:
            if tiendas[k]["disponible"]:
                for candidato in precios.get(k, []):
                    oferta = oferta_publica(candidato, k, identificador)
                    if oferta:
                        ofertas.append(oferta)
        productos.append({"id": identificador, "nombre": nombre, "ofertas": ofertas})
    if not any(p["ofertas"] for p in productos):
        raise ValueError("La corrida carece de ofertas utilizables. Se conserva la publicación anterior.")
    return {"actualizado": origen["actualizado"], "tiendas": tiendas, "productos": productos}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("origen", type=Path)
    parser.add_argument("destino", type=Path)
    args = parser.parse_args()
    datos = exportar(json.loads(args.origen.read_text(encoding="utf-8")))
    with NamedTemporaryFile(mode="w", encoding="utf-8", dir=args.destino.parent, delete=False) as tmp:
        json.dump(datos, tmp, ensure_ascii=False, separators=(",", ":"))
        tmp.write("\n")
    os.chmod(tmp.name, 0o644)
    os.replace(tmp.name, args.destino)
    print(f"{len(datos['productos'])} productos, {sum(len(p['ofertas']) for p in datos['productos'])} ofertas.")


if __name__ == "__main__":
    main()
