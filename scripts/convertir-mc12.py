#!/usr/bin/env python3
"""La Maserati MC12 GT1 Red Bull (Dave Love, Sketchfab, CC-BY-4.0) au contrat
de la flotte : mètres, +Y en haut, +Z vers le nez, roues posées à y = 0,
quatre pivots `Wheel_FL/FR/RL/RR`, un nœud `Interior_SteeringWheel`.

Le paquet livré est un export Sketchfab : une seule hiérarchie de 51 maillages
(un par matériau), les quatre roues fusionnées dans chaque matériau de roue, le
volant fusionné avec la planche de bord. Ce script ne déplace aucun sommet par
rapport aux autres : il cuit la transformation de la racine, découpe les roues
et le volant par la position de leurs triangles, et allège ce qui ne se voit
pas. Ce qu'il change, et pourquoi, est listé dans `vendor/voitures/LICENSE.md`.

  python3 -I scripts/convertir-mc12.py <dossier du paquet> <sortie.glb>
"""
import json, struct, sys, io, hashlib
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path(sys.argv[1]); DEST = Path(sys.argv[2])
g = json.loads((SRC / 'scene.gltf').read_text())
binsrc = (SRC / 'scene.bin').read_bytes()

# --- lecture ---------------------------------------------------------------
par = {c: i for i, n in enumerate(g['nodes']) for c in n.get('children', [])}
def matrice(n):
    return np.array(n['matrix'], float).reshape(4, 4).T if 'matrix' in n else np.eye(4)
def monde(i):
    M = matrice(g['nodes'][i])
    while i in par:
        i = par[i]; M = matrice(g['nodes'][i]) @ M
    return M
def lire(ai):
    a = g['accessors'][ai]; v = g['bufferViews'][a['bufferView']]
    dt = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}[a['componentType']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    isz = np.dtype(dt).itemsize * n; st = v.get('byteStride') or isz
    off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    raw = np.frombuffer(binsrc, np.uint8, st * (a['count'] - 1) + isz, off)
    idx = np.arange(a['count'])[:, None] * st + np.arange(isz)[None, :]
    return np.ascontiguousarray(raw[idx]).view(dt).reshape(-1, n).copy()

# --- matériaux : ce qui ne se voit pas part --------------------------------
ROUE = {'generic_tread.007', 'generic_tyre.007', 'maserati_mc12_rim.007', 'generic_disc04.003'}
# Le flou de jante n'existe que pour un moteur qui le fond à grande vitesse :
# son opacité est nulle dans le paquet (baseColorFactor alpha 0).
JETES = {'WHEEL_BLUR_RIM.003'}
# Les pièces que le volant peut porter (moyeu, poignées, écran Motec, palettes,
# voyants) ; la carrosserie, les vitres et les garnitures n'en sont jamais.
VOLANT_MATS = {'metal.005', 'Material_35.001', 'badge.001', 'plastic.005', 'digital_gauge.003',
               'bump_stitching.003', 'solid.003', 'gear.003', 'led2.001', 'led_gear.001',
               'Motec_Trasp.001', 'mottled.005', 'rubber.005', 'carbon_fiber_no_env.005'}
# Le volant est un plan à z ≈ 0,3, devant les yeux du pilote (x ≈ 0,32, la
# gauche : la GT1 est à conduite à gauche). On le prend par PIÈCES ENTIÈRES —
# les composantes connexes de chaque matériau — dont la boîte tient dans la
# sienne : la colonne de direction et le combiné Motec de la planche (z 0,5)
# débordent et restent au corps.
VOLANT_BOITE = (np.array([0.10, 0.48, 0.20]), np.array([0.56, 0.92, 0.40]))

def composantes(P, I):
    cle = np.round(P * 1e5).astype(np.int64)
    _, uid = np.unique(cle, axis=0, return_inverse=True); uid = uid.ravel()
    parent = np.arange(uid.max() + 1)
    def racine(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for t in uid[I]:
        a = racine(t[0]); parent[racine(t[1])] = a; parent[racine(t[2])] = a
    return np.array([racine(u) for u in uid[I[:, 0]]])
import re
GARDE_NOM = re.compile(r'paint|light|lamp|glass|reflector|amber|mirror|window', re.I)
NOMS = {'body.007': 'Paint_RedBull', 'body_2.007': 'Paint_RedBull_Bas',
        'tail_light_lod0.005': 'tail_light', 'reverse_light_lod0.003': 'reverse_light'}

def nettoyer(m):
    m = json.loads(json.dumps(m)); m.pop('extras', None)
    # une carte de normales à l'échelle 0 n'agit pas : elle ne coûte qu'une texture
    if 'normalTexture' in m and m['normalTexture'].get('scale', 1) == 0:
        del m['normalTexture']
    if 'normalTexture' in m: m['normalTexture'].pop('texCoord', None)
    ext = m.get('extensions', {})
    # KHR_materials_specular fait passer three au matériau physique ; ses
    # valeurs (0,1 à 1) nuancent à peine des plastiques mats. On le retire,
    # avec la texture de reflet des étriers (2 048², 16 Mo de carte graphique).
    ext.pop('KHR_materials_specular', None)
    if not ext: m.pop('extensions', None)
    pbr = m.get('pbrMetallicRoughness', {})
    bct = pbr.get('baseColorTexture')
    if bct: bct.pop('extensions', None); bct.pop('texCoord', None)
    m['name'] = NOMS.get(m['name'], m['name'].rsplit('.', 1)[0])
    # LA LAQUE AU RÉGLAGE DE LA FLOTTE. Le paquet la règle métal 0,8 et
    # rugosité 0,15 : sous l'éclairage du studio Sketchfab, très bien ; dans le
    # jeu, un métal sombre ne renvoie que la petite sonde des reflets, et la
    # MC12 sortait NOIRE en revue d'écran, livrée invisible. Recalée sur la
    # flotte (0,45 / 0,3), elle restait sombre : le fond de la livrée est un
    # bleu nuit, et le métal retire sa part au diffus. Une livrée imprimée
    # n'est pas un métal : 0,15, le brillant vient du vernis (clearcoat).
    if m['name'].startswith('Paint'):
        pbr['metallicFactor'] = 0.15; pbr['roughnessFactor'] = 0.3
    return m

def transformUV(m):
    bct = m.get('pbrMetallicRoughness', {}).get('baseColorTexture', {})
    t = bct.get('extensions', {}).get('KHR_texture_transform')
    return t

# --- sommets, dans le repère du monde --------------------------------------
morceaux = []   # (groupe, nom matériau original, attrs, indices)
for i, n in enumerate(g['nodes']):
    if 'mesh' not in n: continue
    M = monde(i); R = M[:3, :3]
    assert np.allclose(R @ R.T, np.eye(3), atol=1e-6)
    for p in g['meshes'][n['mesh']]['primitives']:
        mat = g['materials'][p['material']]; nom = mat['name']
        if nom in JETES: continue
        P = lire(p['attributes']['POSITION']).astype(float)
        P = (M @ np.c_[P, np.ones(len(P))].T).T[:, :3]
        N = lire(p['attributes']['NORMAL']).astype(float) @ R.T
        N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)
        attrs = {'POSITION': P, 'NORMAL': N}
        if 'TEXCOORD_0' in p['attributes']:
            uv = lire(p['attributes']['TEXCOORD_0']).astype(float)
            t = transformUV(mat)
            if t:   # KHR_texture_transform cuit dans les UV : uv·échelle, puis décalage
                assert not t.get('rotation')
                uv = uv * np.array(t.get('scale', [1, 1])) + np.array(t.get('offset', [0, 0]))
            attrs['TEXCOORD_0'] = uv
        I = lire(p['indices']).ravel().reshape(-1, 3)
        morceaux.append([nom, attrs, I])

# Les roues au sol : le paquet pose le bas des pneus à −0,032.
sol = min(a['POSITION'][:, 1].min() for nom, a, I in morceaux if nom in ROUE)
for nom, a, I in morceaux: a['POSITION'][:, 1] -= sol

# --- découpe -----------------------------------------------------------------
def sous(a, I, t):
    """Les triangles `t` de (a, I), sommets réindexés."""
    J = I[t]; u, inv = np.unique(J.ravel(), return_inverse=True)
    return {k: v[u] for k, v in a.items()}, inv.reshape(-1, 3)

pneus = np.vstack([a['POSITION'] for nom, a, I in morceaux if nom == 'generic_tyre.007'])
zmid = (pneus[:, 2].min() + pneus[:, 2].max()) / 2
def quart(c):  # +X est la gauche quand on regarde vers +Z
    return ('F' if c[2] > zmid else 'R') + ('L' if c[0] > 0 else 'R')

groupes = {'Body': [], 'Interior_SteeringWheel': [], 'Wheel_FL': [], 'Wheel_FR': [], 'Wheel_RL': [], 'Wheel_RR': []}
for nom, a, I in morceaux:
    C = a['POSITION'][I].mean(1)
    if nom in ROUE:
        q = np.array([quart(c) for c in C])
        for k in ('FL', 'FR', 'RL', 'RR'):
            if (q == k).any(): groupes['Wheel_' + k].append((nom,) + sous(a, I, q == k))
        continue
    if nom in VOLANT_MATS:
        V = a['POSITION'][I]
        tri_dans = ((V >= VOLANT_BOITE[0]) & (V <= VOLANT_BOITE[1])).all(axis=(1, 2))
        comp = composantes(a['POSITION'], I)
        dehors = set(comp[~tri_dans].tolist())   # une pièce qui déborde reste entière au corps
        dans = tri_dans & np.array([c not in dehors for c in comp])
        if dans.any(): groupes['Interior_SteeringWheel'].append((nom,) + sous(a, I, dans))
        if (~dans).any(): groupes['Body'].append((nom,) + sous(a, I, ~dans))
        continue
    groupes['Body'].append((nom, a, I))

# Le pivot de chaque roue au centre de SON pneu ; le volant au centre de sa boîte.
centres = {}
for k in ('FL', 'FR', 'RL', 'RR'):
    P = np.vstack([a['POSITION'] for nom, a, I in groupes['Wheel_' + k] if nom == 'generic_tyre.007'])
    centres['Wheel_' + k] = (P.min(0) + P.max(0)) / 2
P = np.vstack([a['POSITION'] for nom, a, I in groupes['Interior_SteeringWheel']])
centres['Interior_SteeringWheel'] = (P.min(0) + P.max(0)) / 2
centres['Body'] = np.zeros(3)

# --- matériaux : identiques une fois nettoyés → un seul ---------------------
mats_out, mat_index, cle_vers = [], {}, {}
def materiau(nom):
    if nom in mat_index: return mat_index[nom]
    m = nettoyer(next(x for x in g['materials'] if x['name'] == nom))
    cle = json.dumps({k: v for k, v in m.items() if k != 'name'}, sort_keys=True)
    # Les feux, les vitrages et la laque gardent leur matériau, et donc leur
    # NOM : les feux de détresse, les phares et les dégâts les reconnaissent
    # par lui (RE_FEU, RE_PHARE, RE_PHARE_AR) et par la boîte de leur maillage —
    # fusionnés, un feu arrière et un catadioptre avant n'en feraient qu'un.
    if cle in cle_vers and not GARDE_NOM.search(m['name']):
        mat_index[nom] = cle_vers[cle]
    else:
        mats_out.append(m); mat_index[nom] = len(mats_out) - 1; cle_vers.setdefault(cle, mat_index[nom])
    return mat_index[nom]

# --- écriture ------------------------------------------------------------------
chunks, length = [], 0
out = {'asset': {'version': '2.0', 'generator': 'grandtour convertir-mc12.py',
                 'copyright': '"2005 Maserati MC12 GT1 Redbull" by Dave Love SketchFab, CC-BY-4.0'},
       'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'name': 'Maserati_MC12_GT1', 'children': []}],
       'meshes': [], 'materials': mats_out, 'accessors': [], 'bufferViews': [], 'buffers': [],
       'textures': [], 'images': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]}
def vue(data, target=None):
    global length
    v = {'buffer': 0, 'byteOffset': length, 'byteLength': len(data)}
    if target: v['target'] = target
    out['bufferViews'].append(v); pad = (-len(data)) % 4; chunks.extend([data, b'\0' * pad]); length += len(data) + pad
    return len(out['bufferViews']) - 1
def accesseur(arr, typ, index=False):
    a = {'bufferView': vue(arr.tobytes(), 34963 if index else 34962), 'count': len(arr) if index else len(arr), 'type': typ,
         'componentType': {np.dtype('float32'): 5126, np.dtype('uint16'): 5123, np.dtype('uint32'): 5125}[arr.dtype]}
    if typ == 'VEC3': a.update(min=arr.min(0).tolist(), max=arr.max(0).tolist())
    out['accessors'].append(a); return len(out['accessors']) - 1

tris = 0
for gname, liste in groupes.items():
    c = centres[gname]
    # un primitive par matériau final : on fusionne ce qui partage le matériau
    parmat = {}
    for nom, a, I in liste: parmat.setdefault(materiau(nom), []).append((a, I))
    prims = []
    for mi, parts in parmat.items():
        texture = 'baseColorTexture' in mats_out[mi].get('pbrMetallicRoughness', {}) or 'normalTexture' in mats_out[mi]
        P, N, U, J, base = [], [], [], [], 0
        for a, I in parts:
            P.append(a['POSITION'] - c); N.append(a['NORMAL']); J.append(I + base); base += len(a['POSITION'])
            if texture: U.append(a['TEXCOORD_0'])
        P = np.ascontiguousarray(np.vstack(P), np.float32); N = np.ascontiguousarray(np.vstack(N), np.float32); J = np.vstack(J)
        # sommets identiques bit à bit fusionnés (la découpe en a dupliqué aucun ; l'export, si)
        rec = [P.view(np.uint8).reshape(len(P), -1), N.view(np.uint8).reshape(len(N), -1)]
        if texture: Uf = np.ascontiguousarray(np.vstack(U), np.float32); rec.append(Uf.view(np.uint8).reshape(len(Uf), -1))
        R = np.ascontiguousarray(np.concatenate(rec, axis=1))
        _, prem, inv = np.unique(R.view(np.dtype((np.void, R.shape[1]))).ravel(), return_index=True, return_inverse=True)
        ordre = np.argsort(prem); rang = np.empty_like(ordre); rang[ordre] = np.arange(len(ordre)); garde = prem[ordre]
        J = rang[inv.ravel()][J]
        attrs = {'POSITION': accesseur(P[garde], 'VEC3'), 'NORMAL': accesseur(N[garde], 'VEC3')}
        if texture: attrs['TEXCOORD_0'] = accesseur(Uf[garde], 'VEC2')
        J = J.ravel().astype(np.uint16 if len(garde) <= 65535 else np.uint32)
        prims.append({'attributes': attrs, 'indices': accesseur(J, 'SCALAR', True), 'material': mi, 'mode': 4})
        tris += len(J) // 3
    out['meshes'].append({'name': gname, 'primitives': prims})
    node = {'name': gname, 'mesh': len(out['meshes']) - 1}
    if gname != 'Body': node['translation'] = [float(x) for x in c]
    out['nodes'].append(node); out['nodes'][0]['children'].append(len(out['nodes']) - 1)

# --- textures : celles que les matériaux gardent, réduites quand c'est inutile -
src_tex = g['textures']; src_img = g['images']
tex_map = {}
def image(idx):
    if idx in tex_map: return tex_map[idx]
    uri = src_img[src_tex[idx]['source']]['uri']
    im = Image.open(SRC / uri); w, h = im.size
    a = np.asarray(im)
    if a.size and a.min() == a.max():           # une couleur unie (banner_int : 2 048² de noir)
        im = im.resize((8, 8))
    elif max(w, h) > 1024:                       # 2 048² = 22 Mo de carte graphique avec ses mips
        im = im.resize((min(w, 1024), min(h, 1024)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    out['images'].append({'mimeType': 'image/png', 'bufferView': vue(buf.getvalue()), 'name': Path(uri).stem})
    out['textures'].append({'sampler': 0, 'source': len(out['images']) - 1})
    tex_map[idx] = len(out['textures']) - 1; return tex_map[idx]
def unie(idx):
    """La couleur d'une image unie (tous ses pixels identiques), sinon None."""
    im = Image.open(SRC / src_img[src_tex[idx]['source']]['uri']).convert('RGBA')
    a = np.asarray(im).reshape(-1, 4)
    return a[0] if (a == a[0]).all() else None
def lineaire(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
for m in mats_out:
    pbr = m.get('pbrMetallicRoughness', {})
    # UNE IMAGE UNIE EST UN FACTEUR : la teinte du verre (128² de noir), du
    # chrome (16² de gris), le dessous du bandeau (2 048² de noir). Sans
    # perte, une texture de moins, et la signature de programme des vitrages
    # devient celle que la flotte compile déjà.
    if 'baseColorTexture' in pbr:
        c = unie(pbr['baseColorTexture']['index'])
        if c is not None:
            f = np.array(pbr.get('baseColorFactor', [1, 1, 1, 1]), float)
            f[:3] *= lineaire(c[:3].astype(float)); f[3] *= c[3] / 255.0
            pbr['baseColorFactor'] = [round(float(x), 6) for x in f]; del pbr['baseColorTexture']
    if 'baseColorTexture' in pbr: pbr['baseColorTexture']['index'] = image(pbr['baseColorTexture']['index'])
    if 'normalTexture' in m: m['normalTexture']['index'] = image(m['normalTexture']['index'])
used = sorted({e for m in mats_out for e in m.get('extensions', {})})
if used: out['extensionsUsed'] = used

out['buffers'] = [{'byteLength': length}]
jb = json.dumps(out, separators=(',', ':')).encode(); jb += b' ' * ((-len(jb)) % 4)
bb = b''.join(chunks)
glb = struct.pack('<III', 0x46546c67, 2, 28 + len(jb) + len(bb)) + struct.pack('<II', len(jb), 0x4e4f534a) + jb + struct.pack('<II', len(bb), 0x004e4942) + bb
DEST.write_bytes(glb)
rapport = {'octets': len(glb), 'triangles': tris, 'materiaux': len(mats_out), 'images': len(out['images']),
           'primitives': sum(len(m['primitives']) for m in out['meshes']), 'sol_corrige': round(-sol, 4),
           'centres': {k: [round(float(x), 3) for x in v] for k, v in centres.items()},
           'sha256': hashlib.sha256(glb).hexdigest()}
print(json.dumps(rapport, indent=1))
