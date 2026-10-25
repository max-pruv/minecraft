#!/usr/bin/env python3
# Ferrari SF90 XX Stradale — du paquet Sketchfab (glTF + bin + textures) au
# GLB du manifeste de la flotte (vendor/voitures/LICENSE.md).
#
# Œuvre d'origine : « 2023 Ferrari SF90 XX Stradale » par Ddiaz Design,
# CC-BY-4.0 (le crédit exact est dans vendor/voitures/LICENSE.md).
#
# Ce que fait ce script, et pourquoi — chaque point est une règle du jeu :
#   - TRANSFORMATIONS CUITES. Le paquet tient en 2 201 nœuds et 1 097
#     maillages, dont 648 pièces de roue réunies sous UN nœud nommé
#     « Front_L » : `normaliserVoiture` ne saurait pas en faire quatre roues.
#     Tout passe dans le repère du monde, puis dans celui du manifeste :
#     mètres, +Y en haut, +Z vers le nez, roues posées à y = 0, origine au
#     milieu des essieux.
#   - L'ÉCHELLE EST CELLE DE L'EMPATTEMENT RÉEL (2,650 m), mesuré entre les
#     centres des roues du modèle : la règle de la Revuelto (v546).
#   - QUATRE PIVOTS `Wheel_FL/FR/RL/RR`, posés au centre de chaque roue ; les
#     pièces se répartissent par quadrant. Les étriers restent fixes (le
#     standard : « étriers hors de la rotation de roulement »).
#   - `Interior_SteeringWheel` : le volant est découpé dans le maillage de
#     l'habitacle par composantes connexes (voir `extraireVolant`).
#   - FUSION PAR MATÉRIAU : un appel de dessin par matériau, jamais 1 097.
#   - LES MATÉRIAUX RETOMBENT SUR DES PROGRAMMES DÉJÀ CHAUFFÉS (signatures.js,
#     v246) : couleurs de sommets, tangentes et second jeu d'UV retirés (le
#     visualiseur de Sketchfab n'affiche pas ces couleurs par défaut ; leur
#     alpha vaut presque zéro), spéculaire et transmission retirés (la
#     transmission demanderait une passe de rendu de plus par image), cartes
#     métal/rugosité remplacées par leur moyenne. La laque prend un vernis.
#   - COMPACTION SANS PERTE de ce qui reste (docs/voitures-poids-et-compression.md) :
#     sommets identiques fusionnés au bit près, sommets inutilisés retirés,
#     index 16 bits quand ils suffisent. Les images sont recopiées octet pour octet.
#
# Usage : python3 -I scripts/ferrari-sf90-xx.py <dossier du paquet> <sortie.glb> [rapport.json]

import json, struct, sys, hashlib, os, io
import numpy as np

EMPATTEMENT = 2.650   # m, Ferrari SF90 XX Stradale (fiche constructeur)

CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def charger(dossier):
    g = json.load(open(os.path.join(dossier, 'scene.gltf')))
    buf = open(os.path.join(dossier, g['buffers'][0]['uri']), 'rb').read()
    return g, buf


def accesseur(g, buf, i):
    a = g['accessors'][i]
    bv = g['bufferViews'][a['bufferView']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    n = NC[a['type']]
    dt = CT[a['componentType']]
    taille = np.dtype(dt).itemsize * n
    pas = bv.get('byteStride', 0)
    if pas and pas != taille:
        brut = np.frombuffer(buf, np.uint8, count=pas * a['count'], offset=off)
        brut = brut.reshape(a['count'], pas)[:, :taille].copy()
        return brut.view(dt).reshape(a['count'], n)
    return np.frombuffer(buf, dt, count=a['count'] * n, offset=off).reshape(a['count'], n)


def matriceLocale(n):
    if 'matrix' in n:
        return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
    t = n.get('translation', [0, 0, 0])
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    s = n.get('scale', [1, 1, 1])
    R = np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4)
    M[:3, :3] = R * np.array(s)
    M[:3, 3] = t
    return M


def primitivesDuMonde(g, buf):
    """Chaque primitive, positions et normales dans le repère du monde."""
    out = []

    def marche(i, parent, chemin):
        n = g['nodes'][i]
        W = parent @ matriceLocale(n)
        ch = chemin + [n.get('name', '')]
        if 'mesh' in n:
            A = W[:3, :3]
            N = np.linalg.inv(A).T
            retourne = np.linalg.det(A) < 0
            for p in g['meshes'][n['mesh']]['primitives']:
                if p.get('mode', 4) != 4:
                    continue
                at = p['attributes']
                P = accesseur(g, buf, at['POSITION']).astype(np.float64)
                P = P @ A.T + W[:3, 3]
                Nn = accesseur(g, buf, at['NORMAL']).astype(np.float64) @ N.T
                Nn /= np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-12)
                uv = accesseur(g, buf, at['TEXCOORD_0']).astype(np.float64) if 'TEXCOORD_0' in at else None
                I = accesseur(g, buf, p['indices']).astype(np.int64).reshape(-1, 3)
                if retourne:
                    I = I[:, [0, 2, 1]]
                out.append(dict(P=P, N=Nn, uv=uv, I=I, mat=p['material'], chemin=ch))
        for c in n.get('children', []):
            marche(c, W, ch)

    for r in g['scenes'][g.get('scene', 0)]['nodes']:
        marche(r, np.eye(4), [])
    return out


def fusion(prims):
    """Concatène des primitives d'un même matériau en une seule."""
    P, N, U, I, base = [], [], [], [], 0
    avecUV = all(p['uv'] is not None for p in prims)
    for p in prims:
        P.append(p['P']); N.append(p['N'])
        if avecUV:
            U.append(p['uv'])
        I.append(p['I'] + base)
        base += len(p['P'])
    return dict(P=np.concatenate(P), N=np.concatenate(N),
                uv=np.concatenate(U) if avecUV else None, I=np.concatenate(I))


def composantes(I, nbSommets, P):
    """Composantes connexes par sommets confondus (positions arrondies)."""
    cle = np.round(P / 1e-5).astype(np.int64)
    _, idx = np.unique(cle, axis=0, return_inverse=True)
    idx = idx.reshape(-1)
    parent = np.arange(idx.max() + 1)

    def trouve(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for t in I:
        a, b, c = trouve(idx[t[0]]), trouve(idx[t[1]]), trouve(idx[t[2]])
        parent[b] = a
        parent[trouve(c)] = a
    racine = np.array([trouve(idx[t[0]]) for t in I])
    return racine


# Le volant dans le repère du manifeste : centre mesuré sur le paquet (la
# jante de 0,36 × 0,25 m devant le siège gauche, conduite à gauche) et une
# boîte qui ne prend que des pièces entières — la jante, le haut de jante en
# carbone et ses diodes, les palettes et les boutons. La colonne (z 0,59 à
# 0,87) et le combiné (z 0,68 à 1,04) en sortent par leur profondeur.
VOLANT_LO = np.array([0.13, 0.52, 0.43])
VOLANT_HI = np.array([0.56, 0.93, 0.63])


def extraireVolant(m):
    """Les composantes connexes entièrement dans la boîte du volant."""
    rac = composantes(m['I'], len(m['P']), m['P'])
    garde = np.zeros(len(m['I']), bool)
    for r in np.unique(rac):
        tri = rac == r
        S = m['P'][m['I'][tri].reshape(-1)]
        if (S.min(0) >= VOLANT_LO).all() and (S.max(0) <= VOLANT_HI).all():
            garde |= tri
    return garde


def sousMaillage(m, masqueTri):
    I = m['I'][masqueTri]
    return dict(P=m['P'], N=m['N'], uv=m['uv'], I=I)


def compacter(m):
    """Sommets utilisés seulement, identiques au bit près fusionnés."""
    P = m['P'].astype(np.float32)
    N = m['N'].astype(np.float32)
    cols = [P, N]
    if m['uv'] is not None:
        cols.append(m['uv'].astype(np.float32))
    V = np.ascontiguousarray(np.concatenate(cols, axis=1))
    utilises = np.unique(m['I'].reshape(-1))
    Vu = V[utilises]
    vue = Vu.view(np.dtype((np.void, Vu.dtype.itemsize * Vu.shape[1]))).reshape(-1)
    _, premier, inverse = np.unique(vue, return_index=True, return_inverse=True)
    remap = np.full(len(V), -1, np.int64)
    remap[utilises] = inverse.reshape(-1)
    V2 = Vu[premier]
    I2 = remap[m['I']]
    out = dict(P=V2[:, 0:3], N=V2[:, 3:6], uv=V2[:, 6:8] if m['uv'] is not None else None, I=I2)
    return out


def moyenneMR(dossier, uri):
    """Moyenne (rugosité, métal) d'une carte métal/rugosité, canaux G et B."""
    from PIL import Image
    im = np.asarray(Image.open(os.path.join(dossier, uri)).convert('RGB'), dtype=np.float64) / 255
    return float(im[..., 1].mean()), float(im[..., 2].mean())


# Les matériaux de sortie : nom, et la façon de traduire celui du paquet.
# Les noms se lisent dans le jeu : `Paint_Primary_XX` est la laque qu'on repeint
# (EST_LAQUE), `Paint_Secondary` la livrée qu'on garde ; « light » et
# « head » désignent les optiques que posent les feux (RE_FEU, RE_PHARE).
NOMS = {
    'Paint_Material': 'Paint_Primary_XX',
    'phong1': 'Paint_Secondary',
    'Window_Material': 'Glass_Windows',
    'WindowInside_Material': 'Glass_Inside',
    'RED_GLASS': 'Taillight_Glass',
    'LightA_Material': 'Lights',
    'Carbon2M_Material': 'Carbon_Fiber',
    'EngineA_Material': 'Engine',
    'InteriorA_Material': 'Interior_Main',
    'InteriorTillingA_Material': 'Interior_Trim',
    'SeatBelt_Material': 'Interior_Seats',
    'Base_Material': 'Underbody',
    'BadgeA_Material': 'Badges',
    'MIRROR': 'Chrome',
    '_Wheel1A_3D_3DWheel1C_Material1': 'Rim_Tire',
    '_CallipersCalliperA_Zone_Material1': 'Brake_Caliper',
    'ManufacturerPlateA_Material': 'Plate',
    'TexturedA_Material': 'Decals',
}


def nomCourt(m):
    return m['name'].replace('Ferrari_SF90XXStradale_2024', '')


def traduireMateriau(g, dossier, i):
    src = g['materials'][i]
    court = nomCourt(src)
    p = dict(src.get('pbrMetallicRoughness', {}))
    ext = src.get('extensions', {})
    m = {'name': NOMS.get(court, court.replace('_Material', '')), 'doubleSided': True}
    pbr = {}
    if 'baseColorFactor' in p:
        pbr['baseColorFactor'] = p['baseColorFactor']
    if 'baseColorTexture' in p:
        pbr['baseColorTexture'] = {'index': p['baseColorTexture']['index']}
    met = p.get('metallicFactor', 1.0)
    rough = p.get('roughnessFactor', 1.0)
    if 'metallicRoughnessTexture' in p:
        img = g['images'][g['textures'][p['metallicRoughnessTexture']['index']]['source']]
        r, mt = moyenneMR(dossier, img['uri'])
        rough, met = rough * r, met * mt
    pbr['metallicFactor'] = round(float(met), 4)
    pbr['roughnessFactor'] = round(float(rough), 4)
    m['pbrMetallicRoughness'] = pbr
    if 'normalTexture' in src:
        m['normalTexture'] = {'index': src['normalTexture']['index']}
    if src.get('alphaMode') == 'BLEND':
        m['alphaMode'] = 'BLEND'
        # la transmission tombe : c'est l'opacité qui la remplace
        tr = ext.get('KHR_materials_transmission', {}).get('transmissionFactor', 0)
        c = list(pbr.get('baseColorFactor', [1, 1, 1, 1]))
        c[3] = round(max(0.18, min(c[3], 1 - 0.7 * tr)), 4)
        pbr['baseColorFactor'] = c
    if court in ('Paint_Material', 'phong1'):
        m['extensions'] = {'KHR_materials_clearcoat': {'clearcoatFactor': 1.0, 'clearcoatRoughnessFactor': 0.03}}
    return m


def main():
    dossier, sortie = sys.argv[1], sys.argv[2]
    rapport = sys.argv[3] if len(sys.argv) > 3 else None
    g, buf = charger(dossier)
    prims = primitivesDuMonde(g, buf)

    # --- le repère : source en +Y, longueur sur z (mesuré), le moteur à -z
    estRoue = lambda p: 'Combined_Wheels_3D_' in p['chemin']
    estEtrier = lambda p: any('Calliper' in c for c in p['chemin'])
    roues = [p for p in prims if estRoue(p)]
    toutes = np.concatenate([p['P'] for p in prims])
    lo, hi = toutes.min(0), toutes.max(0)
    assert (hi - lo)[2] > (hi - lo)[0], 'la longueur devait être sur z'
    moteur = np.concatenate([p['P'] for p in prims if nomCourt(g['materials'][p['mat']]) == 'EngineA_Material'])
    nez = -1.0 if moteur[:, 2].mean() > (lo[2] + hi[2]) / 2 else 1.0   # moteur central arrière
    cx, cz = (lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2

    def quadrant(c):
        avant = (c[2] - cz) * nez > 0
        gauche = (c[0] - cx) * nez > 0        # +X à gauche quand le nez est +Z
        return ('F' if avant else 'R') + ('L' if gauche else 'R')

    # centres des roues (boîte de toutes les pièces du quadrant)
    parQ = {}
    for p in roues:
        q = quadrant(p['P'].mean(0))
        parQ.setdefault(q, []).append(p)
    assert sorted(parQ) == ['FL', 'FR', 'RL', 'RR'], sorted(parQ)
    centres = {}
    for q, ps in parQ.items():
        S = np.concatenate([p['P'] for p in ps])
        centres[q] = (S.min(0) + S.max(0)) / 2
    emp = abs(((centres['FL'] + centres['FR']) / 2 - (centres['RL'] + centres['RR']) / 2)[2])
    k = EMPATTEMENT / emp
    sol = min(np.concatenate([p['P'] for p in roues])[:, 1])
    milieu = sum(centres.values()) / 4

    def versManifeste(P, N=None):
        Q = (P - np.array([milieu[0], sol, milieu[2]])) * k
        Q[:, 0] *= nez; Q[:, 2] *= nez
        if N is None:
            return Q
        M = N.copy(); M[:, 0] *= nez; M[:, 2] *= nez
        return Q, M

    for p in prims:
        if estRoue(p):
            p['q'] = quadrant(p['P'].mean(0))
        p['P'], p['N'] = versManifeste(p['P'], p['N'])
    centres = {q: versManifeste(c[None])[0] for q, c in centres.items()}

    # --- regroupement
    groupes = {}          # (groupe, matériau) -> [prims]
    for p in prims:
        if estRoue(p):
            grp = 'Wheel_' + p['q']
        elif estEtrier(p):
            grp = 'Etriers'
        else:
            grp = 'Corps'
        groupes.setdefault((grp, p['mat']), []).append(p)

    # --- le volant, découpé dans l'habitacle et dans le carbone
    volants, pieces = [], {}
    for cle in [c for c in groupes if c[0] == 'Corps'
                and nomCourt(g['materials'][c[1]]) in ('InteriorA_Material', 'Carbon2M_Material')]:
        m = fusion(groupes.pop(cle))
        masque = extraireVolant(m)
        pieces[cle] = sousMaillage(m, ~masque)
        if masque.any():
            volants.append((cle[1], sousMaillage(m, masque)))
    Sv = np.concatenate([v['P'][v['I'].reshape(-1)] for _, v in volants]) if volants else np.zeros((1, 3))
    centreVolant = (Sv.min(0) + Sv.max(0)) / 2

    # --- écriture
    materiaux, imgsUtiles = [], {}
    matSortie = {}

    def materiau(i):
        if i not in matSortie:
            m = traduireMateriau(g, dossier, i)
            matSortie[i] = len(materiaux)
            materiaux.append(m)
        return matSortie[i]

    bin_ = io.BytesIO()
    vues, accs, maillages, noeuds = [], [], [], []

    def ajouterVue(octets, cible=None):
        while bin_.tell() % 4:
            bin_.write(b'\0')
        off = bin_.tell()
        bin_.write(octets)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(octets)}
        if cible:
            v['target'] = cible
        vues.append(v)
        return len(vues) - 1

    def ajouterAcc(arr, type_, ct, cible, minmax=False):
        a = {'bufferView': ajouterVue(arr.tobytes(), cible), 'componentType': ct,
             'count': len(arr), 'type': type_}
        if minmax:
            a['min'] = [float(x) for x in arr.min(0)]
            a['max'] = [float(x) for x in arr.max(0)]
        accs.append(a)
        return len(accs) - 1

    stats = {'primitives': 0, 'triangles': 0, 'sommets': 0}

    def ajouterMaillage(nom, m, mat, decal=np.zeros(3)):
        src = g['materials'][mat]
        if 'baseColorTexture' not in src.get('pbrMetallicRoughness', {}) and 'normalTexture' not in src:
            m = dict(m, uv=None)          # pas de carte, pas d'UV (rien ne les lit)
        c = compacter(m)
        P = (c['P'] - decal.astype(np.float32)).astype(np.float32)
        at = {'POSITION': ajouterAcc(P, 'VEC3', 5126, 34962, True),
              'NORMAL': ajouterAcc(c['N'].astype(np.float32), 'VEC3', 5126, 34962)}
        if c['uv'] is not None:
            at['TEXCOORD_0'] = ajouterAcc(c['uv'].astype(np.float32), 'VEC2', 5126, 34962)
        I = c['I'].reshape(-1)
        if len(P) < 65536:
            ia = ajouterAcc(I.astype(np.uint16), 'SCALAR', 5123, 34963)
        else:
            ia = ajouterAcc(I.astype(np.uint32), 'SCALAR', 5125, 34963)
        maillages.append({'name': nom, 'primitives': [{'attributes': at, 'indices': ia, 'material': materiau(mat)}]})
        noeuds.append({'name': nom, 'mesh': len(maillages) - 1})
        stats['primitives'] += 1
        stats['triangles'] += len(I) // 3
        stats['sommets'] += len(P)
        return len(noeuds) - 1

    enfants = []
    for (grp, mat), ps in sorted(groupes.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        if grp == 'Corps':
            enfants.append(ajouterMaillage(materiauNom(g, mat), fusion(ps), mat))
    for (grp, mat), ps in sorted(groupes.items()):
        if grp == 'Etriers':
            enfants.append(ajouterMaillage('Brake_Calipers', fusion(ps), mat))
    for (grp, mat), m in sorted(pieces.items()):
        enfants.append(ajouterMaillage(materiauNom(g, mat), m, mat))
    for q in ['FL', 'FR', 'RL', 'RR']:
        sous = [ajouterMaillage('Rim_Tire_' + q, fusion(ps), mat, centres[q])
                for (grp, mat), ps in sorted(groupes.items()) if grp == 'Wheel_' + q]
        noeuds.append({'name': 'Wheel_' + q, 'translation': [float(x) for x in centres[q]], 'children': sous})
        enfants.append(len(noeuds) - 1)
    if volants:
        sv = [ajouterMaillage('SteeringWheel_' + materiauNom(g, mat), v, mat, centreVolant) for mat, v in volants]
        noeuds.append({'name': 'Interior_SteeringWheel', 'translation': [float(x) for x in centreVolant], 'children': sv})
        enfants.append(len(noeuds) - 1)
    noeuds.append({'name': 'Ferrari_SF90_XX_Stradale', 'children': enfants})
    racine = len(noeuds) - 1

    # textures : seules celles que les matériaux de sortie lisent, recopiées
    texs, images = [], []
    texSortie = {}

    def texture(i):
        if i not in texSortie:
            src = g['textures'][i]
            img = g['images'][src['source']]
            octets = open(os.path.join(dossier, img['uri']), 'rb').read()
            images.append({'bufferView': ajouterVue(octets), 'mimeType': 'image/png', 'name': os.path.basename(img['uri'])})
            texs.append({'sampler': 0, 'source': len(images) - 1})
            texSortie[i] = len(texs) - 1
        return texSortie[i]
    for m in materiaux:
        p = m['pbrMetallicRoughness']
        if 'baseColorTexture' in p:
            p['baseColorTexture']['index'] = texture(p['baseColorTexture']['index'])
        if 'normalTexture' in m:
            m['normalTexture']['index'] = texture(m['normalTexture']['index'])

    while bin_.tell() % 4:
        bin_.write(b'\0')
    octets = bin_.getvalue()
    gl = {'asset': {'version': '2.0', 'generator': 'scripts/ferrari-sf90-xx.py',
                    'copyright': '2023 Ferrari SF90 XX Stradale by Ddiaz Design, CC-BY-4.0'},
          'scene': 0, 'scenes': [{'nodes': [racine]}], 'nodes': noeuds, 'meshes': maillages,
          'materials': materiaux, 'accessors': accs, 'bufferViews': vues,
          'buffers': [{'byteLength': len(octets)}],
          'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
          'textures': texs, 'images': images}
    if any('extensions' in m for m in materiaux):
        gl['extensionsUsed'] = ['KHR_materials_clearcoat']
    js = json.dumps(gl, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(octets))
    glb += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(octets), 0x004E4942) + octets
    open(sortie, 'wb').write(glb)

    tout = np.concatenate([p['P'] for p in prims])
    lo, hi = tout.min(0), tout.max(0)
    info = dict(stats, octets=len(glb), sha256=hashlib.sha256(glb).hexdigest(), echelle=k,
                longueur=float(hi[2] - lo[2]), largeur=float(hi[0] - lo[0]), hauteur=float(hi[1] - lo[1]),
                roues={q: [round(float(x), 4) for x in c] for q, c in centres.items()},
                volant=dict(triangles=int(sum(len(v['I']) for _, v in volants)), centre=[round(float(x), 4) for x in centreVolant], taille=[round(float(x), 3) for x in Sv.max(0) - Sv.min(0)]),
                materiaux=len(materiaux), images=len(images))
    print(json.dumps(info, indent=1))
    if rapport:
        json.dump(info, open(rapport, 'w'), indent=1)


def materiauNom(g, i):
    return NOMS.get(nomCourt(g['materials'][i]), nomCourt(g['materials'][i]).replace('_Material', ''))


if __name__ == '__main__':
    main()
