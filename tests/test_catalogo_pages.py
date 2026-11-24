import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from actualizar_catalogo import actualizar
from exportar import CATALOGO, COMERCIOS


def ejemplo():
    productos = [{"id": k, "nombre": v, "ofertas": []} for k, v in CATALOGO.items()]
    productos[0]["ofertas"] = [{"tienda": "coto", "nombre": "Ejemplo", "precio": 50}]
    return {"actualizado": "2026-11-23T08:45:00Z",
            "tiendas": {k: {"nombre": v[0], "disponible": True} for k, v in COMERCIOS.items()},
            "productos": productos}


class CatalogoPagesTest(unittest.TestCase):
    def test_copia_solo_una_exportacion_publica_vigente(self):
        with TemporaryDirectory() as carpeta:
            origen = Path(carpeta) / "entrante.json"
            destino = Path(carpeta) / "sitio.json"
            base = ejemplo()
            destino.write_text(json.dumps(base))
            nuevo = ejemplo()
            nuevo["actualizado"] = "2026-11-24T08:45:00Z"
            origen.write_text(json.dumps(nuevo))
            actualizar(origen, destino)
            aprobado = destino.read_bytes()
            self.assertEqual(aprobado, origen.read_bytes())

            for fallo in ("antiguo", "campo privado", "tienda de otro dominio", "sin ofertas"):
                with self.subTest(fallo=fallo):
                    candidato = ejemplo()
                    if fallo != "antiguo":
                        candidato["actualizado"] = nuevo["actualizado"]
                    if fallo == "campo privado":
                        candidato["productos"][0]["ofertas"][0]["nota"] = "ejemplo"
                    elif fallo == "tienda de otro dominio":
                        candidato["productos"][0]["ofertas"][0]["enlace"] = "https://example.org/"
                    elif fallo == "sin ofertas":
                        candidato["productos"][0]["ofertas"] = []
                    origen.write_text(json.dumps(candidato))
                    with self.assertRaises(ValueError):
                        actualizar(origen, destino)
                    self.assertEqual(aprobado, destino.read_bytes())
