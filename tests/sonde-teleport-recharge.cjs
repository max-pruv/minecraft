// LA RECHARGE À L'ARRIVÉE APRÈS UNE TÉLÉPORTATION : DÉBIT ET CADENCE (v376)
//
// La v360 a noté qu'à l'arrêt, la recharge forcée (`?recharge=arrivee`) charge
// le disque de Paris en 4–5 s au lieu de 18 au banc, et ne l'a PAS armée : un
// débit de saturation n'est pas un confort (v269). On mesure donc les DEUX
// chiffres, dans les secondes qui suivent l'arrivée, page par page, en ordre
// alterné (v268) :
//   • le débit : à quelle seconde la moitié, puis 90 % du disque sont maillés ;
//   • la cadence : images par seconde, médiane, pire image, part du temps dans
//     des images de plus de 300 ms, sur les vingt premières secondes ;
//   • et la même chose dans une scène VIDE (`vide=1`, la leçon de la v360) :
//     ce qui reste quand on retire le dessin, c'est ce que coûtent le worker et
//     l'installation — ce qui se transpose à la tablette. Le dessin en rendu
//     logiciel, lui, ne se transpose pas.
//
// Usage : node sonde-teleport-recharge.cjs [lieu] [tours] [variantes]
//   ex. node sonde-teleport-recharge.cjs paris 2 '&recharge=image|&recharge=arrivee'
const { Banc, souffler } = require('./banc.js');
const lieu = process.argv[2] || 'paris';
const tours = Number(process.argv[3] || 2);
const variantes = (process.argv[4] || '&recharge=image|&recharge=arrivee|&recharge=image&vide=1|&recharge=arrivee&vide=1').split('|');
const rr = 12;
(async () => {
  const banc = new Banc({ portJeu: 8399, portPairs: 9399 });
  await banc.ouvrir();
  try {
    let n = 0;
    for (let tour = 0; tour < tours; tour++) {
      const ordre = tour % 2 ? [...variantes].reverse() : variantes;
      for (const params of ordre) {
        await souffler();
        const page = await banc.jouerSeul(`Tele${n++}`, { rr, params });
        const r = await page.evaluate(async ({ lieu, rr }) => {
          const g = window.__game;
          const { positionDe } = await import('./src/mondes.js');
          const CHUNK = 16, R = rr;
          const patienter = (ms) => new Promise((fin) => {
            const t0 = performance.now();
            const tic = () => (performance.now() - t0 < ms ? requestAnimationFrame(tic) : fin());
            requestAnimationFrame(tic);
          });
          // le disque du point d'apparition d'abord chargé : on part d'un monde
          // installé, comme l'enfant qui ouvre la carte
          await patienter(8000);
          if (location.search.includes('vide=1')) {
            const rendre = g.renderer.render.bind(g.renderer), vide = new g.scene.constructor();
            g.renderer.render = (s, c) => rendre(vide, c);
          }
          const C = positionDe(lieu);
          const p = g.player;
          const y = g.world.terrainHeight(C.x, C.z) + 3;
          p.flying = true; p.pos.set(C.x + 0.5, y, C.z + 0.5); p.vel.set(0, 0, 0);
          const pcx = Math.floor(C.x / CHUNK), pcz = Math.floor(C.z / CHUNK);
          const total = (2 * R + 1) ** 2;
          const compter = () => { let k = 0; for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) if (g.chunkMeshes.has(`${pcx + dx},${pcz + dz}`)) k++; return k; };
          const t0 = performance.now();
          const durees = []; let prec = t0, suivre = true, a50 = null, a90 = null;
          const tic = (t) => {
            if (!suivre) return;
            durees.push(t - prec); prec = t;
            p.pos.set(C.x + 0.5, y, C.z + 0.5); p.vel.set(0, 0, 0);
            const k = compter();
            if (a50 === null && k >= total * 0.5) a50 = Math.round(t - t0);
            if (a90 === null && k >= total * 0.9) a90 = Math.round(t - t0);
            requestAnimationFrame(tic);
          };
          requestAnimationFrame(tic);
          const enVolMax = { n: 0 };
          const surveiller = setInterval(() => { enVolMax.n = Math.max(enVolMax.n, g.statsMaillage.enAttente.size); }, 20);
          await patienter(20000);
          suivre = false; clearInterval(surveiller);
          const tri = [...durees].sort((a, b) => a - b), somme = durees.reduce((a, c) => a + c, 0) || 1;
          // les huit premières secondes à part : c'est là que la recharge travaille
          let acc = 0; const debut = [];
          for (const d of durees) { acc += d; if (acc > 8000) break; debut.push(d); }
          const s8 = debut.reduce((a, c) => a + c, 0) || 1;
          return { a50, a90, final: compter(), total, enVolMax: enVolMax.n,
            cadence: +(durees.length / (somme / 1000)).toFixed(1), mediane: Math.round(tri[tri.length >> 1]), pire: Math.round(tri[tri.length - 1]),
            au300: +(durees.filter((d) => d > 300).reduce((a, c) => a + c, 0) / somme * 100).toFixed(1),
            cadence8: +(debut.length / (s8 / 1000)).toFixed(1), pire8: Math.round(Math.max(...debut)),
            au300_8: +(debut.filter((d) => d > 300).reduce((a, c) => a + c, 0) / s8 * 100).toFixed(1) };
        }, { lieu, rr });
        r.params = params;
        console.log(JSON.stringify(r));
        await page.context().close();
      }
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
