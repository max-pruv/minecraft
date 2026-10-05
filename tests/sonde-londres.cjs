// POURQUOI LONDRES PLAFONNE À 70 QUAND PARIS TIENT 80 ? (v370)
//
// La v360 a mesuré Londres à 148–152 blocs de monde devant soi pour 160 à
// 80 b/s, quand Paris, Rome, l'A1 et la campagne tiennent : son worker coûte
// autant que celui de Paris (6,4 ms contre 6,3–7) et reste à sec 23–28 %. Une
// cause NON mesurée — donc on ne propose pas d'hypothèse, on sépare les cas,
// en une exécution, des deux villes côte à côte, en ordre alterné (v268) :
//   • ce que coûte un morceau d'EAU contre un morceau de terre (la Tamise) ;
//   • ce que le worker fait HORS du morceau (copie, message, mobilier
//     cloné, oubli : `cumul.hors`) contre ce qu'il y fait (`cumul.ms`) ;
//   • combien de temps une demande attend son morceau (en vol) ;
//   • et à chaque relevé, chaque morceau MANQUANT dans le champ (±40°) :
//     en vol, encore dans la file (à quel rang), ou absent de la file —
//     jamais demandé.
//
// Usage : node sonde-londres.cjs [v] [lieux] [tours] [params]
//   ex. node sonde-londres.cjs 80 londres,paris 2 '&file=cone&recharge=arrivee'
const { Banc, souffler } = require('./banc.js');
const v = Number(process.argv[2] || 80);
const lieux = (process.argv[3] || 'londres,paris').split(',');
const tours = Number(process.argv[4] || 2);
const params = process.argv[5] || '&file=cone&recharge=arrivee';
const rr = 12;
(async () => {
  const banc = new Banc({ portJeu: 8398, portPairs: 9398 });
  await banc.ouvrir();
  try {
    let n = 0;
    for (let tour = 0; tour < tours; tour++) {
      const ordre = tour % 2 ? [...lieux].reverse() : lieux;
      for (const lieu of ordre) {
        await souffler();
        const page = await banc.jouerSeul(`Londres${n++}`, { rr, params });
        const r = await page.evaluate(async ({ lieu, v, rr }) => {
          const g = window.__game;
          const { positionDe } = await import('./src/mondes.js');
          const { WATER_LEVEL } = await import('./src/world.js');
          const CHUNK = 16, R = rr;
          const p0 = positionDe(lieu); const C = { x: p0.x, z: p0.z };
          const x0 = C.x - v * 7;
          const patienter = (ms) => new Promise((fin) => {
            const t0 = performance.now();
            const tic = () => (performance.now() - t0 < ms ? requestAnimationFrame(tic) : fin());
            requestAnimationFrame(tic);
          });
          const p = g.player;
          const poser = (x) => { p.pos.set(x, 140, C.z + 0.5); p.vel.set(0, 0, 0); p.yaw = -Math.PI / 2; p.pitch = 0; };
          p.flying = true; poser(x0);
          const tAttente = performance.now();
          while (performance.now() - tAttente < 40000) {
            poser(x0);
            let k = 0; const pcx = Math.floor(x0 / CHUNK), pcz = Math.floor(C.z / CHUNK);
            for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) if (g.chunkMeshes.has(`${pcx + dx},${pcz + dz}`)) k++;
            if (k >= (2 * R + 1) ** 2 * 0.9) break;
            await patienter(250);
          }
          // la part d'eau d'un morceau, au relief (fonction pure) : 4 × 4 colonnes
          const eauMemo = new Map();
          const eau = (cx, cz) => {
            const cle = cx + ',' + cz;
            if (!eauMemo.has(cle)) {
              let e = 0;
              for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (g.world.terrainHeight(cx * CHUNK + 2 + i * 4, cz * CHUNK + 2 + j * 4) < WATER_LEVEL) e++;
              eauMemo.set(cle, e / 16);
            }
            return eauMemo.get(cle);
          };
          const depart = performance.now();
          let roule = true;
          const tic = () => { if (!roule) return; poser(x0 + v * (performance.now() - depart) / 1000); requestAnimationFrame(tic); };
          requestAnimationFrame(tic);
          await patienter(4000);
          // chaque morceau qui arrive pendant la fenêtre
          const arrivees = [], parCle = new Map(), plusProches = [];
          g.statsMaillage.sonde = (m, attente) => {
            parCle.set(m.cx + ',' + m.cz, { ms: Math.round(m.ms), att: attente && attente.depuis ? Math.round(performance.now() - attente.depuis) : null });
            arrivees.push({ ms: m.ms, eau: eau(m.cx, m.cz), attente: attente && attente.depuis ? performance.now() - attente.depuis : null,
              devant: m.cx - Math.floor(p.pos.x / CHUNK) });
          };
          const S0 = { ...g.statsMaillage, workerCumul: { ...(g.statsMaillage.workerCumul || { ms: 0, hors: 0 }) } };
          const t0 = performance.now();
          const classes = { enVol: 0, enFile: 0, absent: 0 }, absLen = []; let absBlocs = 0; const rangs = [], trous = [], eauManquants = [];
          for (let k = 0; k < 6; k++) {
            await patienter(1000);
            const pcx = Math.floor(p.pos.x / CHUNK), pcz = Math.floor(p.pos.z / CHUNK);
            const file = g.fileDeMorceaux, rang = new Map();
            for (let i = 0; i < file.length; i++) rang.set(file[i].cx + ',' + file[i].cz, file.length - 1 - i);   // 0 = le prochain
            let trou = R, proche = null;
            for (let dz = -R; dz <= R; dz++) for (let dx = 1; dx <= R; dx++) {
              const len = Math.hypot(dx, dz);
              if (len > R || dx / len < 0.766) continue;          // ±40°
              const cle = (pcx + dx) + ',' + (pcz + dz);
              if (g.chunkMeshes.has(cle)) continue;
              if (len < trou) { trou = len; proche = { cle, dx, dz }; }
              eauManquants.push(eau(pcx + dx, pcz + dz));
              if (g.statsMaillage.enAttente.has(cle)) classes.enVol++;
              else if (rang.has(cle)) { classes.enFile++; rangs.push(rang.get(cle)); }
              else { classes.absent++; absLen.push(len); if (g.world.chunks.has(cle)) absBlocs++; }
            }
            trous.push(Math.round(trou * CHUNK));
            if (proche) {
              const a = g.statsMaillage.enAttente.get(proche.cle);
              proche.classe = a ? 'vol' : rang.has(proche.cle) ? 'file' : 'absent';
              if (a) proche.age = Math.round(performance.now() - a.depuis);
              if (rang.has(proche.cle)) proche.rang = rang.get(proche.cle);
              proche.eau = eau(pcx + proche.dx, pcz + proche.dz);
            }
            plusProches.push(proche);
          }
          roule = false;
          await patienter(1500);
          g.statsMaillage.sonde = null;
          for (const pp of plusProches) if (pp && parCle.has(pp.cle)) Object.assign(pp, { recu: parCle.get(pp.cle) });
          const mur = (performance.now() - t0) / 1000, S1 = g.statsMaillage;
          const moy = (a) => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null;
          const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? +b[b.length >> 1].toFixed(1) : null; };
          const deEau = arrivees.filter((a) => a.eau >= 0.5), deTerre = arrivees.filter((a) => a.eau < 0.5);
          return { lieu, v, parcouru: Math.round(p.pos.x - x0), trou: med(trous), trous,
            debit: +((S1.distants - S0.distants) / mur).toFixed(1), refuses: S1.refuses - S0.refuses,
            worker: { ms: Math.round((S1.workerCumul.ms - S0.workerCumul.ms) / mur), hors: Math.round((S1.workerCumul.hors - S0.workerCumul.hors) / mur),
              sec: Math.round((S1.workerInactifMs - S0.workerInactifMs) / mur) },
            morceaux: arrivees.length, partEau: +(deEau.length / (arrivees.length || 1)).toFixed(2),
            msTerre: moy(deTerre.map((a) => a.ms)), msEau: moy(deEau.map((a) => a.ms)),
            attenteMediane: med(arrivees.filter((a) => a.attente != null).map((a) => a.attente)),
            devantMedian: med(arrivees.map((a) => a.devant)), derriere: arrivees.filter((a) => a.devant < -1).length,
            manquants: classes, plusProches, absentDistMediane: med(absLen), absentAuBord: absLen.filter((l) => l > R - 1).length, absentAvecBlocs: absBlocs, cadence: +(S1.images - S0.images) / mur, rangMedian: med(rangs), eauDesManquants: moy(eauManquants) };
        }, { lieu, v, rr });
        console.log(JSON.stringify(r));
        await page.context().close();
      }
    }
  } finally { await banc.fermer(); process.exit(0); }
})();
