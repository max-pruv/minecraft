// CE QUE COÛTE UNE VOITURE DE LA RUE, MILIEU PAR MILIEU (v586). La règle de la
// v579 : toute livraison qui change la composition de la flotte publie la
// moyenne des triangles et des maillages par voiture, avant et après. Sous
// node : chaque prototype se charge (géométrie seule, images vides), puis on
// pondère par la part que la règle de tirage donne à chaque modèle, avec la
// règle d'avant (recopiée ici, figée) et celle d'aujourd'hui.
// Usage : node --import <crochet three> tests/sonde-cout-flotte.mjs
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

function sansNavigateur() {
  if (typeof globalThis.document !== 'undefined') return;
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'measureText' ? () => ({ width: 1 }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } });
  globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => ctx, style: {} }) };
  const vides = () => ({ name: 'NODE_SANS_IMAGE', loadTexture: () => Promise.resolve(new THREE.Texture()) });
  GLTFLoader.prototype.loadAsync = function (url) {
    const o = readFileSync(new URL('../' + url.replace(/^\.\//, ''), import.meta.url));
    return new GLTFLoader().register(vides).parseAsync(o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength), '');
  };
}

// la règle d'avant la v586, telle qu'elle était
function choixAvant(FLOTTE, n, ville) {
  const choix = FLOTTE.filter((e) => !e.horsRue && (ville === 'ny' ? e.ville === 'ny' : e.ville !== 'ny'));
  if (ville !== 'ny' && n % 6 === 0) return FLOTTE.find((e) => e.fichier === 'berline-citadine');
  if (ville !== 'ny' && n % 6 === 3) return FLOTTE.find((e) => e.fichier === (((n % 12) + 12) % 12 === 3 ? 'fourgonnette' : 'pickup'));
  return choix[((n % choix.length) + choix.length) % choix.length];
}

export async function mesurerCout() {
  sansNavigateur();
  const V = await import('../src/vehicules.js');
  const cout = new Map();
  for (const e of V.FLOTTE.filter((f) => !f.horsRue)) {
    const m = await V.chargerVoitureFlotte(e);
    let tri = 0, maillages = 0;
    m.traverse((o) => { if (!o.isMesh || !o.geometry) return; maillages++; const g = o.geometry; tri += (g.index ? g.index.count : g.attributes.position.count) / 3; });
    cout.set(e.fichier, { tri, maillages });
  }
  const moyenne = (tirer) => {
    let t = 0, m = 0; const N = 3000, vus = new Set();
    for (let i = 0; i < N; i++) { const e = tirer(i * 17 + 4321); vus.add(e.fichier); const c = cout.get(e.fichier); t += c.tri; m += c.maillages; }
    return { triangles: Math.round(t / N), maillages: +(m / N).toFixed(1), modeles: vus.size };
  };
  const out = {};
  for (const [nom, o] of [['Manhattan', { ville: 'ny', voie: 'avenue' }], ['Paris', { ville: 'paris' }], ['Houston', { ville: 'houston' }],
    ['Tokyo', { ville: 'tokyo' }], ['A1 (route Europe)', { ville: 'paris', voie: 'autoroute' }], ['I-45 (route Amérique)', { ville: 'dallas', voie: 'autoroute' }]]) {
    const mi = V.milieuDe(o);
    out[nom] = { milieu: mi.cle, avant: moyenne((n) => choixAvant(V.FLOTTE, n, o.ville)), apres: moyenne((n) => V.choixFlotte(n, o.ville, mi)) };
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await mesurerCout();
  for (const [k, v] of Object.entries(r)) console.log(k.padEnd(24), v.milieu.padEnd(16), 'avant', JSON.stringify(v.avant), ' après', JSON.stringify(v.apres));
  process.exit(0);
}
