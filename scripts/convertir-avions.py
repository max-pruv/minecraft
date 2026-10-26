#!/usr/bin/env python3
# Convertit les avions déposés par Max (octobre 2026, archives Sketchfab
# « airbus_a320 », « airbus_a321-232 », « lockheed_martin_f35_lightning_ii »,
# puis « luxury_private_jet_3d_model__business_aircraft », v565)
# en glb au CONTRAT DES AVIONS DU JEU (voir src/avions.js, `AVIONS_GLB`) :
#
#   - un bloc par unité, la longueur TOTALE de l'appareil égale à `long` de
#     GABARITS_AVION (aeroport.js) : c'est elle qui dimensionne les postes ;
#   - le nez vers −z, la gauche vers −x, +y en haut (la convention du jeu) ;
#   - les roues posées à y = 0 (le A320 n'a pas de train : le jeu lui en
#     fabrique un, et la hauteur se lit sur la vraie hauteur de l'appareil) ;
#   - un nœud `corps`, et un nœud par pièce qui BOUGE : `train_nez`,
#     `train_gauche`, `train_droit` (pivot au sommet de la jambe, le jeu les
#     replie), `verriere` (pivot à son bord arrière, le jeu la lève) ;
#   - les primitives fusionnées par matériau (un appel de dessin chacune),
#     les transformations cuites, les normales recalculées en repère cuit ;
#   - des matériaux metallicRoughness SANS extension : la table des
#     programmes à chauffer (src/signatures.js) se lit dans les fichiers, et
#     un matériau « Physical » serait une signature de plus ;
#   - des textures ramenées à 1 024 pixels au plus, et dédoublonnées.
#
# Usage : python3 -I scripts/convertir-avions.py <dossier des archives> vendor/avions
#
# Puis, pour le chasseur seul (83 000 triangles dans l'archive, dont 15 000
# pour une roulette de nez) : une simplification bornée, sans toucher aux
# nœuds ni aux matériaux —
#   npx @gltf-transform/cli@4.1.1 simplify vendor/avions/chasseur-f35.glb \
#       vendor/avions/chasseur-f35.glb --ratio 0.35 --error 0.0008
# 81 000 → 38 000 triangles, 2,9 → 1,65 Mo, indiscernable en capture.
# Et pour le jet d'affaires (v565), de même :
#   npx @gltf-transform/cli@4.1.1 simplify vendor/avions/jet-prive.glb \
#       vendor/avions/jet-prive.glb --ratio 0.8 --error 0.0008
# 45 000 → 36 000 triangles, 1,2 → 0,99 Mo.
# Le dossier contient les trois dossiers d'origine (scene.gltf, *.bin,
# textures/). Le script imprime ses mesures en JSON : elles sont recopiées
# dans `AVIONS_GLB`, jamais devinées.

import io
import json
import math
import os
import struct
import sys

import numpy as np
from PIL import Image

# Les pièces se reconnaissent à leur NOM quand l'auteur les a nommées, et à
# leur PLACE quand elles sont fusionnées avec le reste (le train du chasseur
# est dans le même maillage que le fuselage) : une boîte en mètres d'origine,
# dans le repère de l'archive (nez vers +z), qui prend un triangle par son
# centre.
MODELES = {
    'a320': {
        'dossier': 'airbus_a320',
        'sortie': 'airbus-a320.glb',
        'long': 16.0,
        # pas de train dans l'archive : le sol est sous le sommet de la dérive
        # à la vraie hauteur de l'appareil (11,76 m)
        'hauteurReelle': 11.76,
        # les halos de phares d'atterrissage et de roulage : des volumes
        # translucides de douze mètres sous le fuselage
        'retirer_materiau': ['material04'],
        'retirer_noeud': [],
        'pieces': {},
        'tuyeres': [  # nacelles : x de part et d'autre, une boîte large
            {'boite': [4.5, -2.9, -1.5, 7.0, -1.0, 6.0], 'sortie': 0.62},
            {'boite': [-7.0, -2.9, -1.5, -4.5, -1.0, 6.0], 'sortie': 0.62},
        ],
    },
    'a321': {
        'dossier': 'airbus_a321-232',
        'sortie': 'airbus-a321.glb',
        'long': 16.0,
        'hauteurReelle': None,
        'retirer_materiau': ['iris.001'],
        # Les yeux de dessin animé dans le cockpit (`eye_0`, `eye.001_1`), et
        # trois pièces de l'archive posées de travers : une lame qui sort de
        # la dérive (Cube001) et deux qui prolongent l'empennage (Cube005,
        # Cube002), plus deux vérins de train qui traversent l'aile
        # (Cylinder022, Cylinder025) — mesurés à la capture, retirés.
        'retirer_noeud': ['eye_0', 'eye001_1', 'Cube001_38', 'Cube005_20', 'Cube002_22',
                          'Cylinder022_7', 'Cylinder025_14'],
        # le train d'origine, jambe par jambe et par son nom (portes de la
        # roulette de nez comprises) ; l'archive a son +x à droite du pilote,
        # c'est-à-dire la GAUCHE du jeu une fois le nez retourné
        'pieces': {
            'train_nez': [{'noeud': r'^(front_gear|gear_1_12|Cylinder018_10|Cylinder020_11)'}],
            'train_gauche': [{'noeud': r'^(geaqr_2_9|Cylinder019_6|Cylinder023_8)$'}],
            'train_droit': [{'noeud': r'^(gear_3_16|Cylinder024_13|Cylinder027_15)$'}],
        },
        'tuyeres': [
            {'boite': [0.6, -0.6, -1.3, 1.0, -0.1, -0.3], 'sortie': 0.62},
            {'boite': [-1.0, -0.6, -1.3, -0.6, -0.1, -0.3], 'sortie': 0.62},
        ],
    },
    'f35': {
        'dossier': 'lockheed_martin_f35_lightning_ii',
        'sortie': 'chasseur-f35.glb',
        'binaire': 'cene.bin',          # l'archive le nomme ainsi
        'long': 10.0,
        'hauteurReelle': None,
        # les deux feux de bout d'aile : le jeu pose les siens (feuxNavigation)
        'retirer_materiau': ['Red_light_strong', 'Green_light_strong'],
        'retirer_noeud': [],
        # Le train de la roulette de nez est FUSIONNÉ dans le fuselage
        # (`Cylinder.042_16`) : on le prend par sa matière et sa place, sous le
        # ventre. Le train principal a ses nœuds, porte comprise. Et la
        # verrière est un nœud à elle : sa bulle, son verre, son cadre.
        'pieces': {
            'train_nez': [{'noeud': r'^Cylinder042_16$', 'materiau': ['Rubber.001', 'Material.008', 'metal', 'Whitish_grey'],
                           'boite': [-0.1, 0.0, 0.0, 0.1, 0.32, 0.4]}],
            'train_gauche': [{'noeud': r'^(Cylinder010_9|Plane001_20)$'}],
            'train_droit': [{'noeud': r'^(Plane020_21|Plane0(2[2-9]|3[0-2])_\d+|Plane003_4)$'}],
            'verriere': [{'noeud': r'^Cylinder007_15$'}],
        },
        # la tuyère orientable : sa matière le dit (l'intérieur, la couronne)
        'tuyeres': [{'boite': [-0.2, 0.3, -2.3, 0.2, 0.7, -1.6], 'sortie': 0.9,
                     'materiau': ['TVC_inside', 'screen', 'Brownish_engine_color']}],
    },
    # Le jet d'affaires (archive « luxury_private_jet_3d_model__business_
    # aircraft », pranavy94, CC-BY-4.0), une variante de l'avion de ligne
    # (v565). Son nœud « red aeroplane » porte une rotation de présentation
    # quelconque (l'appareil est de travers dans la scène : axes principaux
    # à 25° des axes du monde) ; ses maillages, eux, sont alignés dans leur
    # propre repère — envergure en y, longueur en z, nez vers −z, haut vers
    # −x (la dérive en T monte à x −2,19). On part donc de ce nœud avec une
    # matrice écrite (`depart`) qui ramène ce repère à la convention de
    # l'archive (nez +z, haut +y) : (x, y, z) ← (−y, −x, −z), déterminant +1.
    'jet': {
        'dossier': 'luxury_private_jet_3d_model__business_aircraft',
        'sortie': 'jet-prive.glb',
        # PLUS COURT QUE SON GABARIT, ET C'EST VOULU : un déposé doit tenir
        # DANS le gabarit de son espèce (16 blocs). Un jet d'affaires de la
        # classe du G650 fait 30 m pour les 37,6 m d'un A320 ; à l'échelle de
        # l'A320 (0,426 bloc/m) il ferait 12,9 blocs — on en prend 13.
        'long': 13.0,
        'depart': {'noeud': 'red_aeroplane', 'matrice': [[0, -1, 0, 0], [-1, 0, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]]},
        # pas de train dans l'archive : le sol se pose sous le ventre (−0,975
        # dans l'archive, la dérive culmine à 2,19) avec la garde d'un vrai
        # jet d'affaires, environ un mètre — 0,64 unité sur 19,4 de long
        'hauteurReelle': 2.194 + 0.975 + 0.64,
        'retirer_materiau': [],
        'retirer_noeud': [],
        # le « verre » de l'archive est un gris clair opaque à 0,8 : sur le
        # fuselage blanc, les hublots disparaissaient. Un vitrage de cockpit
        # est sombre (même teinte que la baie d'une porte).
        'couleurs': {'glass': [0.05, 0.07, 0.09, 1]},
        'pieces': {},
        # les deux réacteurs arrière, sur mâts au-dessus de l'aile, par leur
        # matière (le reste de Material.002 est le nez)
        'tuyeres': [
            {'boite': [1.0, 0.2, -5.0, 2.1, 1.5, -1.2], 'sortie': 0.62, 'materiau': ['Material.002']},
            {'boite': [-2.1, 0.2, -5.0, -1.0, 1.5, -1.2], 'sortie': 0.62, 'materiau': ['Material.002']},
        ],
    },
}

TEX_MAX = 1024
COMPOSANTS = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NB = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def lire_accessoire(g, binaire, i):
    a = g['accessors'][i]
    bv = g['bufferViews'][a['bufferView']]
    dt = np.dtype(COMPOSANTS[a['componentType']])
    n, k = a['count'], NB[a['type']]
    debut = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    pas = bv.get('byteStride', dt.itemsize * k)
    if pas == dt.itemsize * k:
        out = np.frombuffer(binaire, dt, n * k, debut).reshape(n, k)
    else:
        brut = np.frombuffer(binaire, np.uint8, pas * (n - 1) + dt.itemsize * k, debut)
        out = np.stack([np.frombuffer(brut[j * pas:j * pas + dt.itemsize * k].tobytes(), dt) for j in range(n)])
    out = out.astype(np.float64)
    if a.get('normalized'):
        out /= float(np.iinfo(dt).max)
    return out


def matrice(n):
    if 'matrix' in n:
        return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
    t = np.array(n.get('translation', [0, 0, 0]), dtype=np.float64)
    q = n.get('rotation', [0, 0, 0, 1])
    s = np.array(n.get('scale', [1, 1, 1]), dtype=np.float64)
    x, y, z, w = q
    r = np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])
    m = np.eye(4)
    m[:3, :3] = r * s
    m[:3, 3] = t
    return m


def nom_net(n):
    return (n or '').replace('.', '').replace(' ', '_')


def dans(b, p):
    return (p[:, 0] >= b[0]) & (p[:, 0] <= b[3]) & (p[:, 1] >= b[1]) & (p[:, 1] <= b[4]) & (p[:, 2] >= b[2]) & (p[:, 2] <= b[5])


def convertir(racine, cle, conf, dossier_sortie):
    d = os.path.join(racine, conf['dossier'])
    g = json.load(open(os.path.join(d, 'scene.gltf')))
    binaire = open(os.path.join(d, conf.get('binaire', g['buffers'][0]['uri'])), 'rb').read()

    # 1. Les triangles, cuits dans le repère du monde de l'archive
    triangles = []        # (piece, materiau, positions (n,3,3), normales, uv)
    retirer_n = set(conf['retirer_noeud'])
    inverses = []
    retirer_m = set(conf['retirer_materiau'])

    def marcher(i, parent, coupe, lignee=()):
        n = g['nodes'][i]
        m = parent @ matrice(n)
        lignee = lignee + (nom_net(n.get('name')),)
        coupe = coupe or (nom_net(n.get('name')) in retirer_n)
        if 'mesh' in n and not coupe:
            for p in g['meshes'][n['mesh']]['primitives']:
                if p.get('mode', 4) != 4:
                    continue
                mat = p.get('material')
                nom_mat = g['materials'][mat].get('name') if mat is not None else None
                if nom_mat in retirer_m:
                    continue
                pos = lire_accessoire(g, binaire, p['attributes']['POSITION'])
                nrm = lire_accessoire(g, binaire, p['attributes']['NORMAL']) if 'NORMAL' in p['attributes'] else None
                uv = lire_accessoire(g, binaire, p['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in p['attributes'] else None
                idx = lire_accessoire(g, binaire, p['indices']).astype(np.int64).ravel() if 'indices' in p else np.arange(len(pos))
                P = (np.c_[pos, np.ones(len(pos))] @ m.T)[:, :3]
                if nrm is not None:
                    nm = np.linalg.inv(m[:3, :3]).T
                    N = nrm @ nm.T
                    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)
                else:
                    N = None
                t = idx.reshape(-1, 3)
                # une matrice à déterminant négatif retourne les faces : on
                # rétablit l'enroulement en cuisant
                if np.linalg.det(m[:3, :3]) < 0:
                    t = t[:, [0, 2, 1]]
                # ET DES NORMALES QUI CONTREDISENT L'ENROULEMENT : l'aile
                # gauche et un plan fixe du A321 les ont à l'envers dans
                # l'archive (vu en capture : une aile noire). Un matériau à
                # double face retourne la normale des faces vues de dos — il
                # faut donc que normale et enroulement disent la même chose.
                if N is not None:
                    fn = np.cross(P[t[:, 1]] - P[t[:, 0]], P[t[:, 2]] - P[t[:, 0]])
                    accord = np.einsum('ij,ij->i', fn, N[t].mean(axis=1))
                    if (accord < 0).sum() > (accord > 0).sum():
                        t = t[:, [0, 2, 1]]
                        inverses.append(nom_net(n.get('name')))
                triangles.append({'mat': mat, 'noeud': lignee, 'nom_mat': nom_mat, 'P': P[t], 'N': None if N is None else N[t],
                                  'UV': None if uv is None else uv[t]})
        for c in n.get('children', []):
            marcher(c, m, coupe, lignee)

    if conf.get('depart'):
        dep = conf['depart']
        i0 = next(i for i, n in enumerate(g['nodes']) if nom_net(n.get('name')) == dep['noeud'])
        M0 = np.array(dep['matrice'], dtype=np.float64)
        for c in g['nodes'][i0].get('children', []):
            marcher(c, M0, False, (dep['noeud'],))
    else:
        for r in g['scenes'][g.get('scene', 0)]['nodes']:
            marcher(r, np.eye(4), False)

    # 2. Chaque triangle à sa pièce, par son centre
    import re
    for t in triangles:
        c = t['P'].mean(axis=1)
        piece = np.array(['corps'] * len(c), dtype=object)
        for nom, regles in conf['pieces'].items():
            for r in regles:
                ok = np.ones(len(c), dtype=bool)
                if 'noeud' in r and not any(re.search(r['noeud'], x) for x in t['noeud']):
                    ok[:] = False
                if 'materiau' in r and t['nom_mat'] not in r['materiau']:
                    ok[:] = False
                if 'boite' in r:
                    ok &= dans(r['boite'], c)
                piece[(piece == 'corps') & ok] = nom
        t['piece'] = piece

    # 3. Le repère du jeu : nez vers −z (demi-tour autour de y), échelle,
    #    centre en x et en z, roues au sol
    tout = np.concatenate([t['P'].reshape(-1, 3) for t in triangles])
    zmin, zmax = tout[:, 2].min(), tout[:, 2].max()
    s = conf['long'] / (zmax - zmin)
    cx = (tout[:, 0].min() + tout[:, 0].max()) / 2
    cz = (zmin + zmax) / 2
    if conf['hauteurReelle']:
        sol = tout[:, 1].max() - conf['hauteurReelle']
    else:
        trains = np.concatenate([t['P'][t['piece'] != 'corps'].reshape(-1, 3) for t in triangles
                                 if (t['piece'] != 'corps').any()] or [tout])
        sol = trains[:, 1].min()

    def versJeu(P):
        Q = np.empty_like(P)
        Q[..., 0] = -(P[..., 0] - cx) * s
        Q[..., 1] = (P[..., 1] - sol) * s
        Q[..., 2] = -(P[..., 2] - cz) * s
        return Q

    def normalesJeu(N):
        Q = N.copy()
        Q[..., 0] = -N[..., 0]
        Q[..., 2] = -N[..., 2]
        return Q

    # 4. Regrouper par (pièce, matériau)
    groupes = {}
    for t in triangles:
        for piece in set(t['piece']):
            sel = t['piece'] == piece
            P = versJeu(t['P'][sel])
            if t['N'] is not None:
                N = normalesJeu(t['N'][sel])
            else:
                e1, e2 = P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]
                fn = np.cross(e1, e2)
                fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
                N = np.repeat(fn[:, None, :], 3, axis=1)
            UV = t['UV'][sel] if t['UV'] is not None else None
            k = (piece, t['mat'])
            groupes.setdefault(k, []).append((P, N, UV))

    # 5. Les matériaux, simplifiés au contrat
    images_sortie, textures_sortie, cle_image = [], [], {}
    materiaux_sortie, index_mat = [], {}

    def image_de(i_tex):
        tex = g['textures'][i_tex]
        src = tex['source']
        chemin = os.path.join(d, g['images'][src]['uri'])
        octets = open(chemin, 'rb').read()
        h = hash(octets)
        if h in cle_image:
            return cle_image[h]
        im = Image.open(io.BytesIO(octets))
        alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
        im = im.convert('RGBA' if alpha else 'RGB')
        f = min(1.0, TEX_MAX / max(im.size))
        if f < 1:
            im = im.resize((max(1, round(im.size[0] * f)), max(1, round(im.size[1] * f))), Image.LANCZOS)
        b = io.BytesIO()
        if alpha:
            im.save(b, 'PNG', optimize=True)
            mime = 'image/png'
        else:
            im.save(b, 'JPEG', quality=84, optimize=True)
            mime = 'image/jpeg'
        images_sortie.append((b.getvalue(), mime, im.size))
        textures_sortie.append({'source': len(images_sortie) - 1, 'sampler': 0})
        cle_image[h] = len(textures_sortie) - 1
        return cle_image[h]

    def materiau(mat, avec_uv=True, opaque=False):
        # un matériau texturé porté par une primitive sans coordonnées de
        # texture perd sa carte (sinon il lirait un seul texel au hasard)
        cle_m = (mat, avec_uv, opaque)
        if cle_m in index_mat:
            return index_mat[cle_m]
        src = g['materials'][mat] if mat is not None else {}
        pbr = src.get('pbrMetallicRoughness', {})
        sortie = {'name': src.get('name', 'materiau'), 'pbrMetallicRoughness': {
            'baseColorFactor': pbr.get('baseColorFactor', [1, 1, 1, 1]),
            'metallicFactor': min(0.3, pbr.get('metallicFactor', 1.0)),
            'roughnessFactor': max(0.35, pbr.get('roughnessFactor', 1.0)),
        }}
        if 'baseColorTexture' in pbr and avec_uv:
            sortie['pbrMetallicRoughness']['baseColorTexture'] = {'index': image_de(pbr['baseColorTexture']['index'])}
        # UNE JAMBE DE TRAIN N'EST PAS EN VERRE : le chasseur partage la
        # matière translucide de sa bulle avec ses jambes de train
        if src.get('alphaMode') == 'BLEND' and not opaque:
            sortie['alphaMode'] = 'BLEND'
        else:
            sortie['pbrMetallicRoughness']['baseColorFactor'] = sortie['pbrMetallicRoughness']['baseColorFactor'][:3] + [1]
        # un facteur gris uniforme sous une livrée l'assombrit (0,588 : la
        # valeur par défaut d'un export) — la livrée dit déjà sa couleur
        f = sortie['pbrMetallicRoughness']['baseColorFactor']
        if 'baseColorTexture' in sortie['pbrMetallicRoughness'] and f[0] == f[1] == f[2] and f[0] >= 0.5:
            sortie['pbrMetallicRoughness']['baseColorFactor'] = [1, 1, 1, f[3]]
        if src.get('name') in conf.get('couleurs', {}):
            sortie['pbrMetallicRoughness']['baseColorFactor'] = conf['couleurs'][src['name']]
        if src.get('doubleSided'):
            sortie['doubleSided'] = True
        materiaux_sortie.append(sortie)
        index_mat[cle_m] = len(materiaux_sortie) - 1
        return index_mat[cle_m]

    # 6. Les tampons
    blobs = []
    vues, accessoires = [], []

    def ajouter(octets, cible=None):
        decal = sum(len(b) for b in blobs)
        pad = (-decal) % 4
        if pad:
            blobs.append(b'\0' * pad)
            decal += pad
        blobs.append(octets)
        v = {'buffer': 0, 'byteOffset': decal, 'byteLength': len(octets)}
        if cible:
            v['target'] = cible
        vues.append(v)
        return len(vues) - 1

    def accessoire(tab, type_, comp, cible, minmax=False):
        vue = ajouter(tab.tobytes(), cible)
        a = {'bufferView': vue, 'componentType': comp, 'count': int(tab.shape[0]), 'type': type_}
        if minmax:
            a['min'] = [float(x) for x in tab.min(axis=0)]
            a['max'] = [float(x) for x in tab.max(axis=0)]
        accessoires.append(a)
        return len(accessoires) - 1

    pieces = {}
    mesures = {'triangles': {}, 'appels': 0}
    for (piece, mat), liste in sorted(groupes.items(), key=lambda kv: (kv[0][0], kv[0][1] if kv[0][1] is not None else -1)):
        P = np.concatenate([x[0] for x in liste]).reshape(-1, 3)
        N = np.concatenate([x[1] for x in liste]).reshape(-1, 3)
        avec_uv = all(x[2] is not None for x in liste) and mat is not None and \
            'baseColorTexture' in g['materials'][mat].get('pbrMetallicRoughness', {})
        UV = np.concatenate([x[2] for x in liste]).reshape(-1, 2) if avec_uv else None
        # souder les sommets identiques (position, normale, uv) : non indexé,
        # le fichier triplerait
        cles = np.round(np.c_[P, N, UV] if UV is not None else np.c_[P, N], 5)
        uniq, inv = np.unique(cles, axis=0, return_inverse=True)
        inv = inv.ravel()
        P2, N2 = uniq[:, :3], uniq[:, 3:6]
        N2 /= np.maximum(np.linalg.norm(N2, axis=1, keepdims=True), 1e-12)
        UV2 = uniq[:, 6:8] if UV is not None else None
        pieces.setdefault(piece, []).append((mat, P2, N2, UV2, inv))
        mesures['triangles'][piece] = mesures['triangles'].get(piece, 0) + len(inv) // 3
        mesures['appels'] += 1

    noeuds, maillages = [], []
    racine = {'name': 'Avion', 'children': []}
    noeuds.append(racine)
    pivots = {}
    for piece in sorted(pieces):
        tous = np.concatenate([x[1] for x in pieces[piece]])
        if piece == 'corps':
            pivot = np.zeros(3)
        elif piece == 'verriere':
            # la verrière d'un chasseur moderne bascule vers l'avant : le pivot
            # est son bord AVANT (le −z du jeu), en bas de la bulle
            pivot = np.array([0.0, tous[:, 1].min(), tous[:, 2].min()])
        else:
            # le sommet de la jambe, au milieu de sa section
            pivot = np.array([(tous[:, 0].min() + tous[:, 0].max()) / 2, tous[:, 1].max(),
                              (tous[:, 2].min() + tous[:, 2].max()) / 2])
        pivots[piece] = [round(float(v), 3) for v in pivot]
        prims = []
        for mat, P2, N2, UV2, inv in pieces[piece]:
            attrs = {
                'POSITION': accessoire((P2 - pivot).astype(np.float32), 'VEC3', 5126, 34962, True),
                'NORMAL': accessoire(N2.astype(np.float32), 'VEC3', 5126, 34962),
            }
            if UV2 is not None:
                attrs['TEXCOORD_0'] = accessoire(UV2.astype(np.float32), 'VEC2', 5126, 34962)
            idx = inv.astype(np.uint32 if len(P2) > 65535 else np.uint16).reshape(-1, 1)
            prim = {'attributes': attrs, 'indices': accessoire(idx, 'SCALAR', 5125 if idx.dtype == np.uint32 else 5123, 34963),
                    'material': materiau(mat, UV2 is not None or mat is None
                                         or 'baseColorTexture' not in g['materials'][mat].get('pbrMetallicRoughness', {}),
                                         opaque=piece.startswith('train')), 'mode': 4}
            prims.append(prim)
        maillages.append({'name': piece, 'primitives': prims})
        noeud = {'name': piece, 'mesh': len(maillages) - 1}
        if piece != 'corps':
            noeud['translation'] = [float(v) for v in pivot]
        noeuds.append(noeud)
        racine['children'].append(len(noeuds) - 1)

    for donnees, mime, taille in images_sortie:
        vue = ajouter(donnees)
        pass
    images_json = []
    k0 = len(vues) - len(images_sortie)
    for i, (donnees, mime, taille) in enumerate(images_sortie):
        images_json.append({'bufferView': k0 + i, 'mimeType': mime})

    binb = b''.join(blobs)
    binb += b'\0' * ((-len(binb)) % 4)
    gltf = {
        'asset': {'version': '2.0', 'generator': 'grand tour — scripts/convertir-avions.py'},
        'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': noeuds, 'meshes': maillages,
        'materials': materiaux_sortie, 'accessors': accessoires, 'bufferViews': vues,
        'buffers': [{'byteLength': len(binb)}],
    }
    if images_json:
        gltf['images'] = images_json
        gltf['textures'] = textures_sortie
        gltf['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    sortie = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binb)) \
        + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binb), 0x004E4942) + binb
    chemin = os.path.join(dossier_sortie, conf['sortie'])
    open(chemin, 'wb').write(sortie)

    # 7. Les mesures que le jeu recopie
    jeu = np.concatenate([versJeu(t['P']).reshape(-1, 3) for t in triangles])
    corps = np.concatenate([versJeu(t['P'][t['piece'] == 'corps']).reshape(-1, 3) for t in triangles if (t['piece'] == 'corps').any()])
    mesures['fichier'] = conf['sortie']
    mesures['octets'] = len(sortie)
    mesures['echelle'] = round(s, 5)
    mesures['boite'] = [[round(float(v), 3) for v in jeu.min(axis=0)], [round(float(v), 3) for v in jeu.max(axis=0)]]
    mesures['pivots'] = pivots
    mesures['textures'] = [list(t) for _, _, t in images_sortie]
    # la section du fuselage tous les deux blocs : où loger sièges et porte
    sections = []
    for z in np.arange(-conf['long'] / 2 + 1, conf['long'] / 2, 1.0):
        sel = corps[(np.abs(corps[:, 2] - z) < 0.25) & (np.abs(corps[:, 0]) < 0.15)]
        large = corps[(np.abs(corps[:, 2] - z) < 0.25) & (np.abs(corps[:, 1] - (sel[:, 1].mean() if len(sel) else 0)) < 0.15)]
        if len(sel):
            sections.append([round(float(z), 1), round(float(sel[:, 1].min()), 2), round(float(sel[:, 1].max()), 2),
                             round(float(np.abs(large[:, 0]).max()), 2) if len(large) else None])
    mesures['sections'] = sections   # z, bas, haut, demi-largeur à l'axe
    tuy = []
    for tconf in conf['tuyeres']:
        # la nacelle entière : son rayon est sa plus grande demi-largeur, son
        # axe à un rayon au-dessus de son point le plus bas (le mât, au-dessus,
        # ne compte pas), et la flamme sort de son bout arrière
        src = np.concatenate([t['P'].reshape(-1, 3) for t in triangles
                              if 'materiau' not in tconf or t['nom_mat'] in tconf['materiau']])
        sel = src[dans(tconf['boite'], src)]
        if not len(sel):
            continue
        q = versJeu(sel)
        r = (q[:, 0].max() - q[:, 0].min()) / 2
        tuy.append({'x': round(float((q[:, 0].min() + q[:, 0].max()) / 2), 3),
                    'y': round(float(q[:, 1].min() + r), 3),
                    'z': round(float(q[:, 2].max()), 3),
                    'rayon': round(float(r * tconf.get('sortie', 0.62)), 3)})
    mesures['tuyeres'] = tuy
    mesures['enroulements_retablis'] = inverses
    return mesures


if __name__ == '__main__':
    racine, sortie = sys.argv[1], sys.argv[2]
    os.makedirs(sortie, exist_ok=True)
    seuls = sys.argv[3:] or list(MODELES)
    out = {}
    for cle in seuls:
        out[cle] = convertir(racine, cle, MODELES[cle], sortie)
    print(json.dumps(out, indent=1))
