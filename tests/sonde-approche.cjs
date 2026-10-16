// Sonde de l'approche assistée (v452) — sous node, sans navigateur :
//   node tests/sonde-approche.cjs src
// Rejoue guiderApproche (src/approche.js) sur chaque piste du monde, trois
// appareils, quatre départs, et dit où l'avion touche et s'arrête.
(async () => {
// Simule l'approche assistée sous node, pour chaque piste du monde, depuis
// plusieurs départs : l'avion se pose-t-il sur la piste, à quelle vitesse
// verticale, et où s'arrête-t-il ?
const SRC = require("path").resolve(process.argv[2] || "src");
const { World } = await import(require('url').pathToFileURL(SRC + '/world.js').href);
const Ap = await import(require('url').pathToFileURL(SRC + '/approche.js').href);
const w = new World();
const FICHES = { avionligne: { max: 95, poussee: 18, decrochage: 30, virage: 0.55, rotation: 42, approche: 45, frein: 30 },
  concorde: { max: 120, poussee: 34, decrochage: 55, virage: 0.40, rotation: 62, approche: 62, frein: 45 },
  chasseur: { max: 120, poussee: 90, decrochage: 40, virage: 1.30, rotation: 48, approche: 50, frein: 60 } };
const solA = (x, z) => w.sommetColonne(Math.floor(x), Math.floor(z));
const angle = Ap.angle;
const resultats = [];
const pistes = Ap.pistesDuMonde();
for (const [k, f] of Object.entries(FICHES)) {
  for (const p of pistes) {
    if (k !== 'chasseur' && p.cle.startsWith('bas-')) continue;
    for (const dep of [[0, 900, 0], [700, -600, 1.2], [-900, 0, 2.5], [1500, 1500, -2]]) {
      const pos = { x: (p.x0 + p.x1) / 2 + dep[0], y: p.sol + 80, z: p.z + dep[1] };
      pos.y = Math.max(pos.y, solA(pos.x, pos.z) + 40);
      let yaw = dep[2], v = f.max * 0.9;
      const choix = Ap.pisteLaPlusProche(pos.x, pos.z, yaw, Ap.PORTEE_PISTE, f);
      if (!choix || choix.piste !== p) continue;
      const ap = { piste: choix.piste, sens: choix.sens, seuil: choix.seuil, phase: 'ralliement' };
      const dt = 1 / 20;
      let finale = p, t = 0, issue = null, vyTouche = 0, sTouche = 0, latTouche = 0;
      let vy = 0;
      while (t < 200) {
        const g = Ap.guiderApproche(ap, pos, yaw, v, f, solA, { dt });
        const e = angle(g.capVise - yaw);
        yaw += Math.sign(e) * Math.min(Math.abs(e), f.virage * dt);
        v += Math.sign(g.vitesse - v) * Math.min(Math.abs(g.vitesse - v), f.poussee * dt);
        vy = g.vy;
        pos.x += -Math.sin(yaw) * v * dt; pos.z += -Math.cos(yaw) * v * dt; pos.y += vy * dt;
        const sol = solA(pos.x, pos.z) + 1;
        if (pos.y <= sol) {
          const r = Ap.repereDePiste(ap, pos.x, pos.z);
          vyTouche = vy; sTouche = r.s; latTouche = r.lat;
          const q = ap.piste; const surPiste = Math.abs(pos.z - q.z) <= q.demi && pos.x >= q.x0 && pos.x <= q.x1; finale = q;
          issue = surPiste ? 'piste' : 'hors';
          break;
        }
        t += dt;
      }
      // freinage : approche²/(2 frein) depuis le toucher
      const arret = sTouche + v * v / (2 * f.frein);
      const longueur = finale.x1 - finale.x0; const arretOk = (ap.sens > 0 ? finale.x0 + arret <= finale.x1 : finale.x1 - arret >= finale.x0);
      resultats.push({ arretOk, change: finale.cle + finale.z, tours: ap.tours || 0, k, cle: p.cle, z: p.z, dep: dep.join('/'), issue: issue || 'temps', t: +t.toFixed(1), vy: +vyTouche.toFixed(1),
        sTouche: Math.round(sTouche), lat: +latTouche.toFixed(1), arret: Math.round(arret), longueur });
    }
  }
}
const mal = resultats.filter((r) => r.issue !== 'piste' || !r.arretOk || r.vy < -3);
console.log('essais', resultats.length, 'en faute', mal.length);
for (const r of mal.slice(0, 30)) console.log(JSON.stringify(r));
const bons = resultats.filter((r) => r.issue === 'piste');
console.log('toucher s min/max', Math.min(...bons.map((r) => r.sTouche)), Math.max(...bons.map((r) => r.sTouche)), 'arrêt max', Math.max(...bons.map((r) => r.arret)), 'vy min', Math.min(...bons.map((r) => r.vy)), 't max', Math.max(...bons.map((r) => r.t)));
for (const k of Object.keys(FICHES)) {
  const b = resultats.filter((r) => r.k === k && r.issue === 'piste' && !r.tours);
  console.log(k, 'toucher s', Math.min(...b.map((r) => r.sTouche)), '…', Math.max(...b.map((r) => r.sTouche)), 'n', b.length, 'remises', resultats.filter((r) => r.k === k && r.tours).length);
}
})();
