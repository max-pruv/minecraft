// SONDE (v385) : le passage « monter dans un avion » de monte.js, seul, sur
// une page qui joue la séquence — pour le mesurer des deux côtés en deux
// minutes au lieu des quarante de monte.js. Copie conforme du passage.
const { Banc } = require('./banc.js');
const verifier = (nom, ok, d = '') => console.log(`${ok ? '✅' : '❌'} ${nom} — ${d}`);
(async () => {
  const banc = new Banc();
  await banc.ouvrir();
  try {
    const emb = await banc.jouerSeul('SondeAvion', { embarq: 1 });
    await emb.evaluate(async () => {
      const g = window.__game;
      const x = -600.5, z = -520.5;
      g.player.pos.set(x, g.world.terrainHeight(x, z) + 1, z); g.player.vel.set(0, 0, 0);
      await new Promise((r) => setTimeout(r, 4000));
    });
    const embAvion = await emb.evaluate(async () => {
      const THREE = await import('three');
      const g = window.__game, am = g.animalManager;
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const images = async (n) => { const f0 = g.renderer.info.render.frame, t0 = performance.now(); while (g.renderer.info.render.frame - f0 < n && performance.now() - t0 < 20000) await dodo(50); };
      const bouton = () => document.getElementById('ride-btn').click();
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      const descendre = async () => { for (let i = 0; i < 3 && auVolant(); i++) { bouton(); await images(3); } };
      const vider = () => { for (const a of [...am.animals]) { am.scene.remove(a.mesh); am.animals.splice(am.animals.indexOf(a), 1); } };
      const cles = () => new Set((g.renderer.info.programs || []).map((p) => p.cacheKey));
      const x0 = g.player.pos.x, z0 = g.player.pos.z;
      const poser = async (key, dx) => {
        await descendre(); vider();
        g.player.pilote = null; g.player.avionEtat = undefined; g.player.avionEnVol = undefined; g.player.flying = false;
        const a = am.invoquer(key, x0 + dx, z0 - 6, false);
        if (!a) return null;
        // le modèle n'est placé qu'à l'image suivante : on le place ici, sinon
        // sa matrice dit encore l'origine du monde
        a.yaw = 0; a.mesh.rotation.y = Math.PI; a.mesh.position.copy(a.pos);
        a.mesh.updateMatrixWorld(true);
        // l'enfant se pose devant-gauche de l'appareil, et le regarde
        const ici = a.mesh.localToWorld(new THREE.Vector3(-3.5, 0, -5));
        g.player.pos.set(ici.x, g.world.sommetColonne(Math.floor(ici.x), Math.floor(ici.z)) + 1, ici.z);
        g.player.vel.set(0, 0, 0);
        g.player.yaw = Math.atan2(-(a.pos.x - ici.x), -(a.pos.z - ici.z));
        await images(15);
        return a;
      };
      const releve = async (a, ms) => {
        const out = [], t0 = performance.now();
        const porte = a.mesh.userData.porte;
        const m = porte && a.mesh.userData.membres[porte.ouvrant];
        while (performance.now() - t0 < ms) {
          const e = g.player.embarquement;
          out.push({ ph: e ? e.phase : null, v: auVolant(),
            dy: +(g.player.pos.y - a.pos.y).toFixed(2),
            ang: m ? +Math.abs(m.rotation[porte.axe]).toFixed(2) : 0,
            acces: a.mesh.children.length });
          if (!e && auVolant() && out.length > 3) break;
          await dodo(100);
        }
        return out;
      };
      const res = {};
      const avant = cles(), blocs = g.world.edits.size;
      for (const [key, dx] of [['avionligne', 30], ['chasseur', -30]]) {
        const a = await poser(key, dx);
        if (!a) { res[key] = { err: 'pas invoqué' }; continue; }
        const enfants0 = a.mesh.children.length;
        const avantCles = cles();
        bouton();
        const r = await releve(a, 40000);
        const phases = [...new Set(r.map((x) => x.ph).filter(Boolean))];
        const fin = r[r.length - 1];
        res[key] = { phases, n: r.length,
          volantPendant: r.filter((x) => x.v && ['approche', 'gravir', 'ouverture', 'entree'].includes(x.ph)).length,
          // la hauteur des pieds EN HAUT des marches (la porte s'ouvre), pas au départ
          dyHaut: Math.max(-99, ...r.filter((x) => x.ph === 'ouverture').map((x) => x.dy)),
          seuil: a.mesh.userData.porte ? +a.mesh.userData.porte.y.toFixed(2) : null, angMax: Math.max(...r.map((x) => x.ang)),
          accesPendant: r.some((x) => x.acces > enfants0), fin: { ...fin, enfants0 },
          clesNeuves: [...cles()].filter((k) => !avantCles.has(k)).length };
      }
      // un second appui en pleine marche termine tout de suite
      {
        const a = await poser('avionligne', 30);
        const enfants0 = a.mesh.children.length;
        bouton(); await images(2);
        const ph = g.player.embarquement ? g.player.embarquement.phase : null;
        bouton(); await images(2);
        const porte = a.mesh.userData.porte, m = porte && a.mesh.userData.membres[porte.ouvrant];
        res.second = { avant: ph, apres: g.player.embarquement ? g.player.embarquement.phase : null, auVolant: auVolant(),
          ang: m ? Math.abs(m.rotation[porte.axe]) : 0, enfants: a.mesh.children.length, enfants0 };
      }
      // le Concorde n'a pas de porte : il monte d'un coup
      {
        const a = await poser('concorde', 30);
        bouton(); await images(2);
        res.concorde = { porte: a.mesh.userData.porte === undefined ? 'absent' : a.mesh.userData.porte, auVolant: auVolant(), ph: g.player.embarquement ? g.player.embarquement.phase : null };
      }
      await descendre(); vider();
      g.player.pilote = null; g.player.avionEtat = undefined; g.player.avionEnVol = undefined; g.player.flying = false;
      res.clesNeuves = [...cles()].filter((k) => !avant.has(k)).length;
      res.blocs = g.world.edits.size - blocs;
      return res;
    });
    {
      const r = embAvion, ok = (k, ouv) => r[k] && !r[k].err && ['approche', 'gravir', 'ouverture', 'entree'].every((p) => r[k].phases.includes(p))
        && r[k].volantPendant === 0 && r[k].fin.v && !r[k].fin.ph && r[k].dyHaut > r[k].seuil - 0.2 && r[k].angMax > ouv
        && r[k].accesPendant && r[k].fin.acces === r[k].fin.enfants0 && r[k].fin.ang < 0.02;
      verifier('on monte dans un avion par un escalier contre la porte, et dans le chasseur par une échelle — l\'état ne ment pas pendant',
        ok('avionligne', 1.2) && ok('chasseur', 0.6), JSON.stringify({ avionligne: r.avionligne, chasseur: r.chasseur }));
      verifier('un second appui en pleine marche met aux commandes tout de suite, porte fermée, escalier rangé ; le Concorde (sans porte) monte d\'un coup',
        r.second && r.second.avant === 'approche' && !r.second.apres && r.second.auVolant && r.second.ang < 0.02 && r.second.enfants === r.second.enfants0
          && r.concorde && r.concorde.auVolant && !r.concorde.ph,
        JSON.stringify({ second: r.second, concorde: r.concorde }));
      verifier('monter dans un avion ne compile aucun programme et n\'écrit aucun bloc',
        r.clesNeuves === 0 && r.blocs === 0 && r.avionligne && r.avionligne.clesNeuves === 0,
        JSON.stringify({ cles: r.clesNeuves, blocs: r.blocs, parAvion: [r.avionligne && r.avionligne.clesNeuves, r.chasseur && r.chasseur.clesNeuves] }));
    }
    console.log('erreurs', JSON.stringify(emb.erreurs));
  } catch (e) { console.log('ERREUR', e && e.stack || e); }
  await banc.fermer().catch(() => {});
  process.exit(0);
})();
