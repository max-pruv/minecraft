#!/usr/bin/env python3
"""Extraire un atlas de volumes, pas charger les 307 Mo du modèle sur tablette.

Usage : python3 scripts/extraire-manhattan-osm.py /chemin/scene.gltf
Prérequis hors jeu : numpy, scipy. Source attendue : MENUDQ2, CC BY 4.0.
Les coordonnées OSM brutes sont métriques (Z vertical). Les matrices Sketchfab
ne sont que la présentation miniature du modèle, pas son unité géographique.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

# Fenêtres dans le repère OSM redressé de 29° : exclure Brooklyn et le New Jersey.
# Elles servent à échantillonner un tissu, pas à attribuer une adresse cadastrale.
QUARTIERS = [
    ("heights", -1700, 200, 4700, 10000),
    ("harlem", -1300, 2100, 1600, 4700),
    ("west", -1300, -100, -2500, 1600),
    ("east", 750, 2300, -2500, 1600),
    ("midtown", -1400, 2100, -5400, -2500),
    ("chelsea", -1300, 900, -6500, -5400),
    ("village", -500, 2300, -7500, -6500),
    ("soho", 0, 2200, -8100, -7500),
    ("tribeca", 0, 1100, -9000, -8100),
    ("chinatown", 1100, 2700, -9000, -8100),
    ("financial", 300, 1800, -10550, -9000),
]
ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"
GRILLE = 12


def extraire(source, cache=None):
    g = json.loads(source.read_text())
    raw = (source.parent / g["buffers"][0]["uri"]).read_bytes()
    signature = hashlib.sha256(source.read_bytes() + raw).hexdigest()
    if cache and cache.exists():
        q = np.load(cache)
        if "signature" in q and str(q["signature"]) == signature:
            return g, raw, *(q[k] for k in ("v", "t", "labels", "mins", "maxs"))

    def lire(i):
        a = g["accessors"][i]
        v = g["bufferViews"][a["bufferView"]]
        dt = {5126: "<f4", 5125: "<u4", 5123: "<u2"}[a["componentType"]]
        n = {"VEC3": 3, "SCALAR": 1}[a["type"]]
        if v.get("byteStride", np.dtype(dt).itemsize * n) != np.dtype(dt).itemsize * n:
            raise ValueError("Accessors entrelacés non pris en charge")
        return np.frombuffer(raw, dtype=dt, count=a["count"] * n,
                             offset=v.get("byteOffset", 0) + a.get("byteOffset", 0)).reshape(-1, n)

    sommets, triangles, offset = [], [], 0
    for m in g["meshes"]:
        if "buildings" not in m.get("name", ""):
            continue
        for p in m["primitives"]:
            v = lire(p["attributes"]["POSITION"])
            sommets.append(v)
            triangles.append(lire(p["indices"]).reshape(-1, 3) + offset)
            offset += len(v)
    v, t = np.concatenate(sommets), np.concatenate(triangles)
    # Souder en XY les coutures de matériaux/normales. Les parties surélevées
    # disjointes seront rattachées au raster de leur bâtiment porteur ci-dessous.
    xy, inv = np.unique(np.round(v[:, :2] * 100).astype("int32"), axis=0, return_inverse=True)
    e = inv[t]
    graph = coo_matrix((np.ones(len(e) * 3, dtype="uint8"),
                        (e[:, [0, 1, 2]].ravel(), e[:, [1, 2, 0]].ravel())),
                       shape=(len(xy), len(xy))).tocsr()
    n, labels = connected_components(graph, directed=False)
    vl = labels[inv]
    tl = vl[t[:, 0]]
    angle = np.deg2rad(29)
    p = np.column_stack([v[:, 0] * np.cos(angle) - v[:, 1] * np.sin(angle),
                         v[:, 0] * np.sin(angle) + v[:, 1] * np.cos(angle), v[:, 2]])
    lo, hi = np.full((n, 3), np.inf), np.full((n, 3), -np.inf)
    np.minimum.at(lo, vl, p)
    np.maximum.at(hi, vl, p)
    if cache:
        np.savez(cache, v=p, t=t, labels=tl, mins=lo, maxs=hi, signature=signature)
    return g, raw, p, t, tl, lo, hi


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--cache", type=Path)
    parser.add_argument("--output", type=Path, default=Path("src/manhattan-osm-data.js"))
    parser.add_argument("--report", type=Path, default=Path("docs/manhattan-osm-extraction.json"))
    args = parser.parse_args()
    g, raw, v, t, labels, lo, hi = extraire(args.source, args.cache)
    centres, taille = (hi + lo) / 2, hi - lo
    ordre = np.argsort(labels, kind="stable")
    limites = np.searchsorted(labels[ordre], np.arange(len(lo) + 1))
    profils, bilan = [], {}
    for nom, x0, x1, y0, y1 in QUARTIERS:
        valide = ((centres[:, 0] >= x0) & (centres[:, 0] < x1) &
                  (centres[:, 1] >= y0) & (centres[:, 1] < y1) &
                  (lo[:, 2] < 1) & (hi[:, 2] >= 6) & (hi[:, 2] < 440) &
                  (taille[:, 0] >= 6) & (taille[:, 0] <= 160) &
                  (taille[:, 1] >= 6) & (taille[:, 1] <= 160))
        ids = np.flatnonzero(valide)
        if not len(ids):
            raise ValueError(f"Quartier sans source : {nom}")
        # Quantiles de hauteur : conserver la distribution, y compris les rares
        # tours ; choisir spatialement à égalité, sans générateur aléatoire caché.
        ids = ids[np.lexsort((centres[ids, 0], centres[ids, 1], hi[ids, 2]))]
        selection = ids[np.unique(np.linspace(0, len(ids) - 1, min(80, len(ids))).astype(int))]
        debut = len(profils)
        for k in selection:
            morceaux = np.flatnonzero((lo[:, 2] > 1) &
                (lo[:, 0] >= lo[k, 0] - .1) & (hi[:, 0] <= hi[k, 0] + .1) &
                (lo[:, 1] >= lo[k, 1] - .1) & (hi[:, 1] <= hi[k, 1] + .1))
            faces = np.concatenate([ordre[limites[j]:limites[j + 1]] for j in [k, *morceaux]])
            hauteur = float(max(hi[[k, *morceaux], 2]))
            xs = lo[k, 0] + (np.arange(GRILLE) + .5) * taille[k, 0] / GRILLE
            # Z du jeu croît vers le sud, d'où l'ordre inverse des rangées.
            ys = hi[k, 1] - (np.arange(GRILLE) + .5) * taille[k, 1] / GRILLE
            xx, yy = np.meshgrid(xs, ys)
            champ = np.zeros((GRILLE, GRILLE))
            for face in t[faces]:
                a, b, c = v[face]
                den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
                if abs(den) < .001:
                    continue
                u = ((b[1] - c[1]) * (xx - c[0]) + (c[0] - b[0]) * (yy - c[1])) / den
                w = ((c[1] - a[1]) * (xx - c[0]) + (a[0] - c[0]) * (yy - c[1])) / den
                h = u * a[2] + w * b[2] + (1 - u - w) * c[2]
                champ = np.maximum(champ, np.where((u >= -1e-6) & (w >= -1e-6) & (u + w <= 1 + 1e-6), h, 0))
            masque = np.clip(np.rint(champ / hauteur * 35), 0, 35).astype(int)
            if np.count_nonzero(masque) < 20:
                continue
            profils.append([nom, int(k), round(float(centres[k, 0]), 1), round(float(centres[k, 1]), 1),
                            round(float(taille[k, 0]), 1), round(float(taille[k, 1]), 1), round(hauteur, 1),
                            "".join(ALPHABET[i] for i in masque.ravel())])
        bilan[nom] = {"composantesEligibles": len(ids), "profils": len(profils) - debut,
                       "hauteursModele": [round(float(np.quantile(hi[ids, 2], q)), 1) for q in (0, .5, .9, 1)]}
    header = ("// Engendré par scripts/extraire-manhattan-osm.py — ne pas éditer à la main.\n"
              "// MENUDQ2, Manhattan OSM Complete Model, CC BY 4.0 ; voir docs/manhattan-osm.md.\n"
              "// [quartier, composante, est, nord, largeur, profondeur, hauteur, champ 12×12 en base 36]\n")
    args.output.write_text(header + "export const PROFILS_OSM = " + json.dumps(profils, separators=(",", ":")) + ";\n")
    rapport = {"source": g["asset"]["extras"], "sha256Gltf": hashlib.sha256(args.source.read_bytes()).hexdigest(),
               "sha256Bin": hashlib.sha256(raw).hexdigest(), "composantes": len(lo), "profils": len(profils),
               "octetsSourceBin": len(raw), "octetsAtlas": args.output.stat().st_size, "quartiers": bilan}
    args.report.write_text(json.dumps(rapport, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(rapport, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
