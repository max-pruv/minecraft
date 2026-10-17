// CE QUI SE COMPTE EN SECONDES DE LA VRAIE VIE, À CINQ IMAGES PAR SECONDE (v483).
//
// `main.js` borne `dt` à un vingtième de seconde. Un minuteur écrit
// `minuteur -= dt` hérite de la borne : à cinq images par seconde, une seconde
// de minuteur en réclame quatre de montre. C'est juste pour une animation, et
// faux pour ce qui se mesure en secondes de pendule — la naissance des bêtes
// autour de l'enfant (une cadence de ménage, v226) et le chronomètre de la
// course du parc, qui écrit un RECORD que Marlon et Alice comparent.
//
// LA CADENCE BASSE SE PROVOQUE (v233, v234) : chaque image brûle 190 ms de fil
// principal, et l'on mesure une fenêtre de temps RÉEL connue. Partagé par la
// sonde (`sonde-minuteurs.cjs`) et le témoin de `monte.js` : une copie de sonde
// finit par diverger du témoin (v400).
async function mesurerMinuteurs(page, { fenetre = 12000, course = 8000 } = {}) {
  return page.evaluate(async ({ fenetre, course }) => {
    const g = window.__game, am = g.animalManager, P = g.player;
    const att = (ms) => new Promise((f) => setTimeout(f, ms));
    const images = () => (g.renderer ? g.renderer.info.render.frame : 0);
    window.__lestMinuteurs = true;
    const lest = () => {
      if (!window.__lestMinuteurs) return;
      const t = performance.now(); while (performance.now() - t < 190) { /* on occupe le fil */ }
      requestAnimationFrame(lest);
    };
    requestAnimationFrame(lest);
    try {
      await att(1500);   // le lest s'installe

      // 1. La naissance des bêtes : on compte les essais de naissance.
      let essais = 0;
      const origine = am.trySpawn;
      am.trySpawn = function () { essais++; return origine.apply(this, arguments); };
      const i0 = images(), t0 = performance.now();
      await att(fenetre);
      const reel = (performance.now() - t0) / 1000;
      const cadence = (images() - i0) / reel;
      am.trySpawn = origine;
      const naissances = { reel: +reel.toFixed(1), essais, attendus: +(reel / 1.5).toFixed(1),
        part: +(essais * 1.5 / reel).toFixed(2), cadence: +cadence.toFixed(1) };

      // 2. Le chronomètre de la course : départ, `course` ms réelles, arrivée.
      const { PARK } = await import('./src/world.js');
      const lire = () => (g.fun.courseEtat ? g.fun.courseEtat() : null);
      const depart = { x: PARK.x - 16, z: PARK.z - 18 }, arrivee = { x: PARK.x - 16, z: PARK.z + 20 };
      const poser = (q) => {
        P.flying = false; P.vel.set(0, 0, 0);
        const y = g.world.sommetColonne(Math.floor(q.x), Math.floor(q.z));
        P.pos.set(q.x + 0.5, y + 1.05, q.z + 0.5);
      };
      const cleRec = 'web-minecraft-records-v1';
      const recordAvant = (() => { try { return JSON.parse(localStorage.getItem(cleRec) || '{}').bestRace || 0; } catch { return 0; } })();
      poser(depart);
      // départ : le jeu le voit à l'image suivante (on attend, borné à 6 s)
      let tA = null, cA = null;
      const td = performance.now();
      while (performance.now() - td < 6000) {
        poser(depart);
        const e = lire();
        if (e && e.chrono !== null) { tA = performance.now(); cA = e.chrono; break; }
        if (!e) { await att(1500); tA = performance.now(); cA = 0; break; }   // ancien code : pas de sonde
        await att(50);
      }
      // on quitte la zone de départ (sinon le délai finit et la course repart)
      poser({ x: depart.x + 6, z: depart.z + 6 });
      await att(course);
      const eB = lire();
      const tB = performance.now();
      poser(arrivee);
      // arrivée : le record s'écrit à l'image suivante (borné à 6 s)
      const ta = performance.now();
      let record = null;
      while (performance.now() - ta < 6000) {
        poser(arrivee);
        try { const r = JSON.parse(localStorage.getItem(cleRec) || '{}').bestRace; if (r && r !== recordAvant) { record = r; break; } } catch { /* rien */ }
        await att(100);
      }
      const tFin = performance.now();
      const reelCourse = tA === null ? null : (tB - tA) / 1000;
      const compteSonde = eB && eB.chrono !== null && cA !== null ? eB.chrono - cA : null;
      return {
        naissances,
        course: {
          sonde: !!lire(), depart: tA !== null, reel: reelCourse === null ? null : +reelCourse.toFixed(1),
          compte: compteSonde === null ? null : +compteSonde.toFixed(1),
          part: compteSonde === null || !reelCourse ? null : +(compteSonde / reelCourse).toFixed(2),
          // le record écrit, rapporté à la course ENTIÈRE (du départ vu à l'arrivée vue)
          record: record === null ? null : +record.toFixed(1),
          reelEntier: tA === null ? null : +((tFin - tA) / 1000).toFixed(1),
          partRecord: record === null || tA === null ? null : +(record / ((tFin - tA) / 1000)).toFixed(2),
        },
      };
    } catch (e) {
      return { err: String(e && e.message || e) };
    } finally {
      window.__lestMinuteurs = false;
    }
  }, { fenetre, course });
}

module.exports = { mesurerMinuteurs };
