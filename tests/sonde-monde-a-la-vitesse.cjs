// LE MONDE SUIT-IL UNE VOITURE RAPIDE ? (v337)
//
// On avance l'enfant en ligne droite à v blocs par seconde de TEMPS RÉEL (la
// position posée à chaque image, pas une physique : on mesure le chargement,
// pas la voiture), en régime établi — le disque chargé à l'arrêt d'abord,
// quatre secondes de roulage pour établir le régime, puis six relevés à une
// seconde d'intervalle (critère de la v229). Pour chaque relevé : le trou
// devant soi (distance au premier morceau non maillé dans un cône de ±72°),
// le trou dans l'AXE (le morceau pile devant), et sur la fenêtre la cadence,
// la pire image, la part du temps dans des images de plus de 300 ms, et le
// débit de morceaux reçus du worker.
//
// Usage : node sonde-monde-a-la-vitesse.cjs [rr] [vitesses] [lieux] [variantes] [tours]
//   ex. node sonde-monde-a-la-vitesse.cjs 12 20,40,60 campagne,paris '&file=cone|&file=regard' 2
// Le banc rend en LOGICIEL, où le jeu garde l'ordre de file d'avant (main.js) :
// `&file=cone` (le défaut ici) force l'ordre neuf, `&file=regard` l'ancien.
const { Banc, souffler } = require('./banc.js');
const rr = Number(process.argv[2] || 12);
const vitesses = (process.argv[3] || '20,30,40,50,60').split(',').map(Number);
const lieux = (process.argv[4] || 'campagne,a1,paris,londres,rome').split(',');
// Variantes de paramètres séparées par « | » : chaque mesure les joue toutes,
// en ORDRE ALTERNÉ (v268), une page à la fois (deux pages ouvertes coûtent la
// cadence, v220).
const variantes = (process.argv[5] || '&file=cone').split('|');
const tours = Number(process.argv[6] || 1);
(async () => {
  const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
  await banc.ouvrir();
  try {
    let n = 0;
    for (let tour = 0; tour < tours; tour++) for (const lieu of lieux) {
      for (const v of vitesses) for (let k = 0; k < variantes.length; k++) {
        const params = variantes[(k + tour) % variantes.length];
        await souffler();
        const page = await banc.jouerSeul(`Vitesse${n++}`, { rr, params });
        const r = await page.evaluate(async ({ lieu, v, rr }) => {
          const g = window.__game;
          const { positionDe } = await import('./src/mondes.js');
          const CHUNK = 16, R = rr;
          // Le point de passage au MILIEU de la fenêtre de mesure (t = 7 s) :
          // la fenêtre [4 s, 10 s] couvre donc ±3v autour de lui.
          let C;
          if (lieu === 'campagne') C = { x: 30000, z: 30000 };
          else if (lieu === 'a1') {
            // le milieu de l'A1, Paris–Lille, le long de laquelle on roule
            const P = positionDe('paris'), L = positionDe('lille');
            C = { x: (P.x + L.x) / 2, z: (P.z + L.z) / 2 };
          } else { const p = positionDe(lieu); C = { x: p.x, z: p.z }; }
          const x0 = C.x - v * 7;
          const patienter = (ms) => new Promise((fin) => {
            const t0 = performance.now();
            const tic = () => (performance.now() - t0 < ms ? requestAnimationFrame(tic) : fin());
            requestAnimationFrame(tic);
          });
          const p = g.player;
          const poser = (x) => { p.pos.set(x, 140, C.z + 0.5); p.vel.set(0, 0, 0); p.yaw = -Math.PI / 2; p.pitch = 0; };
          p.flying = true;
          poser(x0);
          // Le disque d'abord chargé à l'arrêt (borné) : on mesure un régime,
          // pas le rattrapage d'une téléportation.
          const attendu = (2 * R + 1) ** 2 * 0.9;
          const tAttente = performance.now();
          while (performance.now() - tAttente < 40000) {
            poser(x0);
            let n = 0; const pcx = Math.floor(x0 / CHUNK), pcz = Math.floor(C.z / CHUNK);
            for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) if (g.chunkMeshes.has(`${pcx + dx},${pcz + dz}`)) n++;
            if (n >= attendu) break;
            await patienter(250);
          }
          const chargeEn = Math.round(performance.now() - tAttente);
          // Le roulage : la position est une fonction du TEMPS RÉEL.
          const depart = performance.now();
          let roule = true;
          const durees = []; let prec = performance.now();
          const tic = (t) => {
            if (!roule) return;
            const s = (performance.now() - depart) / 1000;
            poser(x0 + v * s);
            if (s > 4) { durees.push(t - prec); }
            prec = t;
            requestAnimationFrame(tic);
          };
          requestAnimationFrame(tic);
          await patienter(4000);
          const distants0 = g.statsMaillage.distants, t0 = performance.now();
          const trous = [], axes = [], cones = [];
          // les morceaux installés PENDANT la fenêtre, et où ils sont tombés
          const vus = new Set(g.chunkMeshes.keys());
          let derriere = 0, dansCone = 0, installes = 0, appels = 0, triangles = 0, nImg = 0;
          let suivre = true;
          const guetter = () => {
            if (!suivre) return;
            const pcx = Math.floor(p.pos.x / CHUNK);
            const info = g.renderer.info.render; appels += info.calls; triangles += info.triangles; nImg++;
            for (const k of g.chunkMeshes.keys()) {
              if (vus.has(k)) continue;
              vus.add(k); installes++;
              const [kx, kz] = k.split(',').map(Number);
              if (kx < pcx - 2) derriere++;
              const ax = kx - pcx, az = kz - Math.floor(p.pos.z / CHUNK);
              if (ax > 0 && Math.abs(az) <= ax * 0.84) dansCone++;          // ±40°
            }
            requestAnimationFrame(guetter);
          };
          requestAnimationFrame(guetter);
          for (let n = 0; n < 6; n++) {
            await patienter(1000);
            const pcx = Math.floor(p.pos.x / CHUNK), pcz = Math.floor(p.pos.z / CHUNK);
            let trou = R, axe = R, cone = R;
            for (let dz = -R; dz <= R; dz++) {
              for (let dx = -R; dx <= R; dx++) {
                const len = Math.hypot(dx, dz);
                if (len > R || len < 0.5) continue;
                if (dx / len < 0.3) continue;                        // pas devant
                const mai = g.chunkMeshes.has(`${pcx + dx},${pcz + dz}`);
                if (!mai) trou = Math.min(trou, len);
                if (!mai && dz === 0) axe = Math.min(axe, len);
                if (!mai && dx / len >= 0.766) cone = Math.min(cone, len);   // ±40°
              }
            }
            trous.push(Math.round(trou * CHUNK)); axes.push(Math.round(axe * CHUNK)); cones.push(Math.round(cone * CHUNK));
          }
          roule = false; suivre = false;
          const debit = (g.statsMaillage.distants - distants0) / ((performance.now() - t0) / 1000);
          const parcouru = Math.round(p.pos.x - x0);
          p.flying = false;
          trous.sort((a, b) => a - b); axes.sort((a, b) => a - b); cones.sort((a, b) => a - b);
          const total = durees.reduce((a, c) => a + c, 0) || 1;
          const tri = [...durees].sort((a, b) => a - b);
          return { lieu, v, parcouru, chargeEn, trou: trous[3], trous, axe: axes[3], cone40: cones[3], installes, derriere, dansCone, partCone: +(dansCone / (installes || 1)).toFixed(2), appels: Math.round(appels / (nImg || 1)), ktri: Math.round(triangles / (nImg || 1) / 1000),
            debit: +debit.toFixed(1), besoin: +((2 * R + 1) * v / CHUNK).toFixed(1),
            cadence: +(durees.length / (total / 1000)).toFixed(1),
            mediane: Math.round(tri[tri.length >> 1] || 0), pire: Math.round(tri[tri.length - 1] || 0),
            au300: +(durees.filter((d) => d > 300).reduce((a, c) => a + c, 0) / total * 100).toFixed(1) };
        }, { lieu, v, rr });
        r.params = params;
        console.log(JSON.stringify(r));
        await page.context().close();
      }
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
