// SONDE (v530) : ce que coûte une minicarte TOUJOURS affichée, en vol, là où
// elle défile le plus vite (v233). Le même vol au-dessus du Sahara (relief,
// pas de ville, v233), aux commandes du chasseur, à la distance d'affichage
// de l'iPad (rr 12), à la taille de l'iPhone de Max — minicarte affichée
// contre `?minicarte=0`, en ordre alterné (ABBA, v268) : une page à la fois,
// refermée avant la suivante (v220). On publie, par passage, la cadence, la
// médiane et la pire image et la part d'images au-delà de 150 ms, mesurées en
// temps réel sur `requestAnimationFrame`, et les blocs parcourus (un vol
// qui n'avance pas ne mesure rien, v236).
//
//     cd tests && node sonde-minicarte-cout.cjs
const { Banc } = require('./banc.js');
const BRAS = [['avec', ''], ['sans', '&minicarte=0'], ['sans', '&minicarte=0'], ['avec', '']];
(async () => {
  const banc = new Banc(); await banc.ouvrir();
  const res = [];
  try {
    for (const [nom, params] of BRAS) {
      const p = await banc.jouerSeul('Cout' + nom + res.length, { viewport: { width: 430, height: 932 }, tactile: true, rr: 12, params });
      const r = await p.evaluate(async () => {
        const g = window.__game, am = g.animalManager, P = g.player;
        const att = (ms) => new Promise((f) => setTimeout(f, ms));
        for (const a of [...am.animals]) am.scene.remove(a.mesh);
        am.animals.length = 0;
        P.pos.set(0.5, g.world.sommetColonne(0, 20000) + 1.5, 20000.5); P.yaw = -Math.PI / 2; P.pitch = 0;
        await att(1500);
        am.invoquer('chasseur', P.pos.x + 3, P.pos.z);
        await att(800);
        for (let e = 0; e < 8 && !P.pilote; e++) { document.getElementById('ride-btn').click(); await att(500); }
        if (!P.pilote) return { err: 'pas aux commandes' };
        P.pos.y += 60; P.yaw = 0;
        P.avionEtat = 'vol'; P.avionEnVol = true; P.vitesseAvion = P.pilote.max; P.altitudeDecollage = -9999;
        await att(3000);
        const mini = getComputedStyle(document.getElementById('minimap')).display;
        const x0 = P.pos.x, z0 = P.pos.z, c0 = window.__minicarte(), tc = performance.now();
        const dts = []; let t = performance.now();
        await new Promise((fin) => {
          const pas = (n) => { dts.push(n - t); t = n; if (dts.length < 400 && performance.now() - tc < 30000) requestAnimationFrame(pas); else fin(); };
          requestAnimationFrame((n) => { t = n; requestAnimationFrame(pas); });
        });
        const tri = [...dts].sort((a, b) => a - b), total = dts.reduce((a, b) => a + b, 0);
        return { mini, images: dts.length, cadence: +(dts.length / (total / 1000)).toFixed(1),
          mediane: Math.round(tri[tri.length >> 1]), pire: Math.round(tri[tri.length - 1]),
          lentes: +(100 * dts.filter((d) => d > 150).length / dts.length).toFixed(1),
          parcouru: Math.round(Math.hypot(P.pos.x - x0, P.pos.z - z0)),
          // le travail de la minicarte, en millisecondes par seconde réelle
          msParS: +((window.__minicarte().ms - c0.ms) / ((performance.now() - tc) / 1000)).toFixed(2),
          dessinsParS: +((window.__minicarte().dessins - c0.dessins) / ((performance.now() - tc) / 1000)).toFixed(1) };
      });
      await p.close();
      res.push({ bras: nom, ...r });
      console.log(nom, JSON.stringify(r));
    }
  } finally { await banc.fermer(); }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
