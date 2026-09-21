// LA VOITURE FRANCHIT-ELLE VRAIMENT UNE MARCHE ? (v285)
//
// Le témoin de la nature ne mesurait rien : posé à (40, −400), il avait devant
// lui une FALAISE de trois blocs (39 · 39 · 39 · 42 · 42 · 45 · 47), qui est un
// mur par construction depuis la v261. Corrigé, il CHERCHE son couloir. Reste à
// répondre à la question qu'il n'a jamais posée, et à en tirer sa BARRE, qui se
// calcule et ne s'écrit pas (v269) : combien de blocs l'ancien code fait-il sur
// CE couloir-là, et combien le neuf ?
//
// A/B SUR LA MÊME PAGE, EN ORDRE ALTERNÉ (v268) : `franchirEnRoulant` est une
// méthode d'instance, on la désarme pour le bras « ancien code ». L'ordre alterné
// est ce qui sépare le traitement de la place dans la série.
const { Banc, souffler } = require('./banc.js');

(async () => {
  const banc = new Banc({ portJeu: 8394, portPairs: 9394 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('SondeMarche', { rr: 4 });
    const out = await page.evaluate(async () => {
      const g = window.__game;
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const vrai = g.player.franchirEnRoulant.bind(g.player);

      const cherche = () => {
        for (let ax = -600; ax <= 600; ax += 40) for (let az = -600; az <= 600; az += 40) {
          for (const [dx, dz] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
            const prof = [];
            for (let k = 0; k <= 70; k++) prof.push(g.world.sommetColonne(ax + dx * k, az + dz * k));
            let pire = 0, marches = 0, eau = false;
            for (let k = 1; k < prof.length; k++) {
              const d = prof[k] - prof[k - 1];
              if (d > pire) pire = d;
              if (d === 1) marches++;
              if (g.world.getBlock(ax + dx * k, prof[k] + 1, az + dz * k) !== 0) eau = true;
            }
            if (pire === 1 && marches >= 3 && !eau) return { ax, az, dx, dz, prof, marches };
          }
        }
        return null;
      };
      const lieu = cherche();
      if (!lieu) return { err: 'aucun couloir trouvé' };
      const X = lieu.ax, Z = lieu.az;
      const yaw = lieu.dz !== 0 ? (lieu.dz < 0 ? 0 : Math.PI)
        : (lieu.dx > 0 ? -Math.PI / 2 : Math.PI / 2);

      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      const vider = () => {
        for (const a of [...g.animalManager.animals]) {
          g.animalManager.scene.remove(a.mesh);
          g.animalManager.animals.splice(g.animalManager.animals.indexOf(a), 1);
        }
      };

      const tour = async (franchit) => {
        // DESCENDRE NE SUFFIT PAS : une monture SUIT le joueur, et le clic
        // suivant la remonterait. On descend, on vide, PUIS on invoque.
        for (let e = 0; e < 6 && auVolant(); e++) {
          document.getElementById('ride-btn').click(); await dodo(400);
        }
        vider();
        g.player.franchirEnRoulant = franchit ? vrai : () => false;
        g.player.pos.set(X + 0.5, g.world.sommetColonne(X, Z) + 2, Z + 0.5);
        g.player.yaw = yaw;
        const t0 = performance.now();
        while (performance.now() - t0 < 15000) {
          await new Promise((r) => requestAnimationFrame(r));
          const cx = Math.floor(g.player.pos.x / 16), cz = Math.floor(g.player.pos.z / 16);
          let pret = true;
          for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
            if (!g.chunkMeshes.has(`${cx + dx},${cz + dz}`)) pret = false;
          if (pret) break;
        }
        const voiture = g.animalManager.invoquer('voiture',
          g.player.pos.x - Math.sin(yaw) * 3, g.player.pos.z - Math.cos(yaw) * 3);
        if (!voiture) return { err: 'aucune voiture' };
        for (let e = 0; e < 6 && !auVolant(); e++) {
          const b = document.getElementById('ride-btn');
          const r = b && b.closest('.fun-target');
          if (b && getComputedStyle(b).display !== 'none'
              && (!r || getComputedStyle(r).display !== 'none')) b.click();
          await dodo(600);
        }
        if (!auVolant()) return { err: 'pas au volant' };
        g.player.yaw = yaw;
        const dep = { x: g.player.pos.x, z: g.player.pos.z, y: g.player.pos.y };
        g.player.keys.add('KeyW');
        const t1 = performance.now();
        let d = 0;
        while (performance.now() - t1 < 20000) {
          await dodo(400);
          d = Math.hypot(g.player.pos.x - dep.x, g.player.pos.z - dep.z);
        }
        g.player.keys.delete('KeyW');
        return { franchit, d: +d.toFixed(1), dy: +(g.player.pos.y - dep.y).toFixed(1),
          secondes: +((performance.now() - t1) / 1000).toFixed(1) };
      };

      const tours = [];
      for (const f of [true, false, false, true]) tours.push(await tour(f));
      g.player.franchirEnRoulant = vrai;
      return { lieu: { x: X, z: Z, vers: [lieu.dx, lieu.dz], marches: lieu.marches,
        profil: lieu.prof.slice(0, 24) }, yaw: +yaw.toFixed(2), tours };
    });
    await page.close();
    if (out.err) { console.log('ÉCHEC : ' + out.err); process.exit(0); }
    console.log('\ncouloir (' + out.lieu.x + ', ' + out.lieu.z + ') vers ' + JSON.stringify(out.lieu.vers)
      + ' · ' + out.lieu.marches + ' marches d\'un bloc · yaw ' + out.yaw);
    console.log('profil : ' + JSON.stringify(out.lieu.profil));
    console.log('\n bras           blocs   Δy   s');
    for (const t of out.tours) console.log(t.err ? '  ÉCHEC ' + t.err
      : `  ${(t.franchit ? 'franchit' : 'DÉSARMÉ').padEnd(10)} ${String(t.d).padStart(7)}`
        + ` ${String(t.dy).padStart(5)} ${t.secondes}`);
  } finally { await banc.fermer(); }
  process.exit(0);
})().catch((e) => { console.error('💥 SONDE PLANTÉE :', e); process.exit(2); });
