// Sonde (v513) : peut-on ROULER à travers la campagne boisée ? Le vrai joueur
// au volant (player.js, three chargé par un crochet de module), sous node, en
// ligne droite à plein gaz à travers chaque biome boisé : forêt tempérée
// (bruit de forêt dense), campagne tempérée quelconque, taïga, forêt tropicale,
// et, pour contrôle, steppe, savane et méditerranée.
//     node tests/sonde-rouler-foret.cjs [chemin/vers/src]
// Un témoin cherche son terrain (v285) : les départs sont tirés au hasard
// (graine fixe) et gardés si le climat et la forêt sont ceux du biome. Un
// ARRÊT, c'est moins d'un bloc et demi gagné en une seconde de jeu à plein
// gaz ; sa CAUSE se lit devant le capot : un tronc ou des feuilles dans la
// boîte de la voiture (arbre), sinon le relief, l'eau ou autre chose. Après un
// arrêt on repart huit blocs plus loin sur la même ligne. Ce qu'elle publie,
// par biome : les blocs parcourus, les arrêts par un arbre, les autres arrêts,
// et la distance moyenne entre deux arrêts d'arbre.
const path = require('path');
const { pathToFileURL } = require('url');
const { register } = require('node:module');
const trois = pathToFileURL(path.resolve(__dirname, '../vendor/three.module.min.js')).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
const ARBRE = new Set([5, 6, 16]);                    // LOG, LEAVES, BIRCH
async function mesurer(src, opts = {}) {
  const SRC = pathToFileURL(src).href;
  const { Player } = await import(SRC + '/player.js');
  const W = await import(SRC + '/world.js');
  const w = new W.World();
  const cam = { position: { copy() {} }, rotation: { set() {} } };
  let g = 777; const rnd = () => ((g = (Math.imul(g, 1103515245) + 12345) >>> 0) / 2 ** 32);
  const BIOMES = {
    foret: (cl, f) => cl === null && f > 0.55,
    campagne: (cl) => cl === null,
    taiga: (cl) => cl === 'taiga',
    tropiques: (cl) => cl === 'tropiques',
    steppe: (cl) => cl === 'steppe',
    savane: (cl) => cl === 'savane',
    mediterranee: (cl) => cl === 'mediterranee',
  };
  const N = opts.lignes || 8, L = opts.longueur || 300;
  const sites = Object.fromEntries(Object.keys(BIOMES).map((k) => [k, []]));
  for (let essai = 0; essai < 400000; essai++) {
    if (Object.values(sites).every((l) => l.length >= N)) break;
    const x = Math.round(-55000 + rnd() * 110000), z = Math.round(-16000 + rnd() * 56000);
    const a = Math.floor(rnd() * 8) * Math.PI / 4;
    const h = w.terrainHeight(x, z);
    if (h <= 31 || h >= 56 || w.cityAt(x, z)) continue;
    // le bruit de forêt d'avant les bosquets : les mêmes départs des deux côtés
    const conf = w.conf; w.conf = { ...conf, clairieres: false };
    const cl = w.climat(x, z), f = w.foret(x, z);
    w.conf = conf;
    for (const [k, test] of Object.entries(BIOMES)) {
      if (sites[k].length < N && test(cl, f)) {
        // la ligne reste dans le biome sur toute sa longueur
        let ok = true;
        for (let s = 0; s <= L && ok; s += 25) {
          const px = x + Math.cos(a) * s, pz = z + Math.sin(a) * s;
          if (w.cityAt(px, pz) || w.climat(px, pz) !== cl || w.terrainHeight(px, pz) <= 31) ok = false;
        }
        if (ok) { sites[k].push({ x, z, ux: Math.cos(a), uz: Math.sin(a) }); break; }
      }
    }
  }
  function cause(p, ux, uz) {
    const y0 = Math.floor(p.pos.y);
    for (let s = 1; s <= 4; s += 0.5) for (let l = -1.3; l <= 1.3; l += 0.65) for (let dy = 0; dy <= 2; dy++) {
      const bx = Math.floor(p.pos.x + ux * s - uz * l), bz = Math.floor(p.pos.z + uz * s + ux * l);
      if (ARBRE.has(w.getBlock(bx, y0 + dy, bz))) return 'arbre';
    }
    for (let s = 1; s <= 4; s++) {
      const bx = Math.floor(p.pos.x + ux * s), bz = Math.floor(p.pos.z + uz * s);
      if (w.getBlock(bx, y0, bz) === 9 || w.getBlock(bx, y0 - 1, bz) === 9) return 'eau';
    }
    return 'autre';
  }
  function rouler(site) {
    const p = new Player(cam, w); p.gabarit = 2.26; p.boost = 30 / 3.2;   // une berline
    let s = 0, arbres = 0, autres = 0, parcouru = 0, dansMassif = 0, dansClairiere = 0;
    const DT = 1 / 30;
    while (s < L) {
      const x = site.x + site.ux * s, z = site.z + site.uz * s;
      const c = w.solContinu(x, z);
      p.pos.set(x, (c ?? w.terrainHeight(x, z) + 1) + 0.02, z); p.onGround = true;
      p.yaw = Math.atan2(-site.ux, -site.uz); p.vitesseVoiture = 0; p.touchMove.f = 1; p.touchMove.s = 0;
      let hist = [], t = 0, arret = null;
      while (t < 40) {
        p.update(DT); t += DT;
        const d = (p.pos.x - site.x) * site.ux + (p.pos.z - site.z) * site.uz;
        hist.push(d);
        if (d >= L) break;
        if (hist.length > 30 && d - hist[hist.length - 31] < 1.5) { arret = cause(p, site.ux, site.uz); break; }
      }
      const d = (p.pos.x - site.x) * site.ux + (p.pos.z - site.z) * site.uz;
      parcouru += Math.max(0, d - s);
      if (!arret) break;
      if (arret === 'arbre') { arbres++; if (w.bosquet) { const m = w.bosquet(p.pos.x, p.pos.z); if (m >= 0.99) dansMassif++; else if (m <= 0.01) dansClairiere++; } } else autres++;
      s = Math.max(d, s) + 8;
    }
    return { parcouru: Math.round(parcouru), arbres, autres, dansMassif, dansClairiere };
  }
  const out = {};
  for (const [k, l] of Object.entries(sites)) {
    const r = l.map(rouler);
    const par = r.reduce((a, b) => a + b.parcouru, 0), ar = r.reduce((a, b) => a + b.arbres, 0), au = r.reduce((a, b) => a + b.autres, 0);
    out[k] = { lignes: l.length, parcouru: par, arretsArbre: ar, arretsAutres: au, entreArbres: ar ? Math.round(par / ar) : null,
      massif: r.reduce((a, b) => a + b.dansMassif, 0), clairiere: r.reduce((a, b) => a + b.dansClairiere, 0) };
  }
  return out;
}
module.exports = { mesurer };
if (require.main === module) {
  (async () => {
    const out = await mesurer(process.argv[2] || path.resolve(__dirname, '../src'), { lignes: +(process.env.LIGNES || 8) });
    for (const [k, o] of Object.entries(out)) console.log(k.padEnd(13), JSON.stringify(o));
    process.exit(0);
  })();
}
