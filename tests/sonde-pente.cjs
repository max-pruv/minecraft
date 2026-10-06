// Sonde (palier 3 de la conduite) : la voiture sur de VRAIES pentes et de
// VRAIES crêtes, sous node, avec le joueur du jeu (player.js, three chargé par
// un crochet de module). Un témoin cherche son terrain, il ne l'écrit pas
// (v285) : on balaie la campagne pour des lignes droites de soixante blocs sur
// la surface continue, sans rien de solide à hauteur de carrosserie, et on les
// range en MONTÉE, DESCENTE et CRÊTE d'après leur profil.
//     node tests/sonde-pente.cjs [chemin/vers/src]
// Ce qu'elle publie, par famille : la vitesse au bout de quarante blocs à plein
// gaz (montée, descente) contre la même voiture sur du plat, et, sur une crête
// prise à 40 blocs/s, le temps passé en l'air, la plus grande hauteur au-dessus
// de la surface et ce que la voiture publie (`player.atterrissage`).
const path = require('path');
const { pathToFileURL } = require('url');
const { register } = require('node:module');
const trois = pathToFileURL(path.resolve(__dirname, '../vendor/three.module.min.js')).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
(async () => {
const SRC = pathToFileURL(process.argv[2] || path.resolve(__dirname, '../src')).href;
const { Player } = await import(SRC + '/player.js');
const W = await import(SRC + '/world.js');
const { isSolid } = await import(SRC + '/blocks.js');
const w = new W.World();
const cam = { position: { copy() {} }, rotation: { set() {} } };
let g = 4242; const rnd = () => ((g = (Math.imul(g, 1103515245) + 12345) >>> 0) / 2 ** 32);
const L = 60, PAS = 0.5;
// le profil d'une ligne, ou null si elle n'est pas roulable de bout en bout
function profil(x0, z0, ux, uz) {
  const h = [];
  for (let s = -6; s <= L + 6; s += PAS) {
    const x = x0 + ux * s, z = z0 + uz * s;
    for (const l of [-1.4, 0, 1.4]) {
      const px = x - uz * l, pz = z + ux * l;
      const c = w.solContinu(px, pz);
      if (c === null) return null;
      const y = Math.floor(c + 0.05);
      if (isSolid(w.getBlock(Math.floor(px), y + 1, Math.floor(pz))) || isSolid(w.getBlock(Math.floor(px), y + 2, Math.floor(pz)))) return null;
    }
    h.push(w.solContinu(x, z));
  }
  return h;
}
const sites = { montee: [], descente: [], crete: [], plat: [] };
const assez = () => Object.values(sites).every((l) => l.length >= 6);
for (let essai = 0; essai < 200000 && !assez(); essai++) {
  const x0 = -2600 + rnd() * 1800 + (essai % 3) * 3000, z0 = -3200 + rnd() * 1800 + (essai % 5) * 1500;
  const a = Math.floor(rnd() * 8) * Math.PI / 4, ux = Math.cos(a), uz = Math.sin(a);
  const h = profil(x0, z0, ux, uz);
  if (!h) continue;
  const i0 = 12, iF = 12 + L / PAS;                    // de s=0 à s=L
  const d = h[iF] - h[i0];
  let haut = -Infinity, iH = 0;
  for (let i = i0; i <= iF; i++) if (h[i] > haut) { haut = h[i]; iH = i; }
  const pentes = []; for (let i = i0; i < iF; i++) pentes.push((h[i + 1] - h[i]) / PAS);
  const monotone = (sg) => pentes.every((p) => sg * p > -0.05);
  const site = { x: x0, z: z0, ux, uz, d: +d.toFixed(1) };
  if (d > 9 && monotone(1) && sites.montee.length < 6) sites.montee.push(site);
  else if (d < -9 && monotone(-1) && sites.descente.length < 6) sites.descente.push(site);
  else if (Math.abs(d) < 0.6 && Math.max(...h.slice(i0, iF)) - Math.min(...h.slice(i0, iF)) < 0.6 && sites.plat.length < 6) sites.plat.push(site);
  else if (iH > i0 + 40 && iH < iF - 30 && haut - h[iH - 16] > 1.5 && haut - h[iH + 16] > 1.5 && sites.crete.length < 6) sites.crete.push({ ...site, sommet: +((iH - i0) * PAS).toFixed(1), monte: +(haut - h[iH - 16]).toFixed(1), descend: +(haut - h[iH + 16]).toFixed(1) });
}
function rouler(site, v0, duree) {
  const p = new Player(cam, w); p.gabarit = 2.26; p.boost = 40 / 3.2;   // une sportive
  const s0 = w.solContinu(site.x, site.z);
  p.pos.set(site.x, s0 + 1e-4, site.z); p.onGround = true; p.yaw = Math.atan2(-site.ux, -site.uz);
  p.vitesseVoiture = v0; p.touchMove.f = 1;
  let air = 0, haut = 0, att = null, chocs = 0, parcouru = 0, vAu40 = null;
  for (let t = 0; t < duree; t += 1 / 30) {
    const c0 = p.chocs || 0;
    p.update(1 / 30);
    chocs += (p.chocs || 0) - c0;
    parcouru = (p.pos.x - site.x) * site.ux + (p.pos.z - site.z) * site.uz;
    const s = w.solContinu(p.pos.x, p.pos.z);
    const vole = p.enLair !== undefined ? p.enLair : (s !== null && p.pos.y - s > 0.35);
    if (vole) { air += 1 / 30; haut = Math.max(haut, p.pos.y - (s ?? p.pos.y)); }
    if (p.atterrissage && !att) att = p.atterrissage;
    if (vAu40 === null && parcouru >= 40) vAu40 = +p.vitesseVoiture.toFixed(1);
    if (parcouru >= L && !p.enLair) break;
  }
  return { vAu40, air: +air.toFixed(2), haut: +haut.toFixed(2), att: att ? +att.force.toFixed(2) : null, chocs };
}
if (process.env.DUMP) { console.log(JSON.stringify(sites)); process.exit(0); }
const med = (a) => { const b = a.filter((x) => x != null).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : null; };
const out = {};
for (const k of ['plat', 'montee', 'descente']) {
  const r = sites[k].map((s) => ({ d: s.d, ...rouler(s, 0, 8) }));
  out[k] = { mediane_v_a_40_blocs: med(r.map((x) => x.vAu40)), sites: r };
}
for (const v of [25, 40, 55]) {
  const r = sites.crete.map((s) => ({ monte: s.monte, descend: s.descend, ...rouler({ ...s }, v, 4) }));
  out['crete_' + v] = { air_median: med(r.map((x) => x.air)), haut_median: med(r.map((x) => x.haut)), sites: r };
}
for (const [k, o] of Object.entries(out)) console.log(k.padEnd(9), JSON.stringify({ ...o, sites: o.sites.map((x) => [x.d ?? `${x.monte}/${x.descend}`, x.vAu40, x.air, x.haut, x.att, x.chocs].join(' ')) }));
process.exit(0);
})();
