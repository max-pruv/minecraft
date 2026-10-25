// SONDE (v552) : le passage « passager dans l'avion d'un ami » de reseau.js,
// rejoué seul — trois pages au lieu de la suite entière (vingt minutes).
// Aucune suite ne l'importe (sondeIsolee). `node tests/sonde-passager-avion.cjs`
const { Banc, vu, nomsVus, dormir, jusqua } = require('./banc.js');
const { servirLeNuage } = require('./nuage.js');
const echecs = [];
const CAP = process.env.CAPTURES || null;   // dossier : une capture par étape
const capture = async (page, nom) => { if (CAP) { await dormir(1200); await page.screenshot({ path: `${CAP}/${nom}.png` }).catch(() => {}); } };
function verifier(nom, ok, detail = '') { console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`); if (!ok) echecs.push(nom); }
(async () => {
  const banc = new Banc();
  await banc.ouvrir();
  await servirLeNuage(9721);
  try {
    const { p: hote, code } = await banc.creerMonde('Marlon');
    const alice = await banc.rejoindre('Alice', code, process.env.EMBARQ ? { embarq: 1 } : {});
    const nina = await banc.rejoindre('Nina', code);
    const attendu = JSON.stringify([['Alice', 'Nina'], ['Marlon', 'Nina'], ['Alice', 'Marlon']]);
    await jusqua(async () => JSON.stringify([await nomsVus(hote), await nomsVus(alice), await nomsVus(nina)]) === attendu);
    const idDe = (page, nom) => page.evaluate((nom) => {
      for (const [id, rp] of window.__game.remotePlayers) if (rp.name === nom) return id;
      return null;
    }, nom);
    // --- passager dans l'AVION d'un ami, sur `pos` ET `rpos` (v552) ---------
    //
    // Max (20 octobre) : « pouvoir rentrer dans une voiture, avion… en
    // passager sur le jeu online si un autre joueur est déjà conducteur ».
    // Seule la fiche `voiture` portait des `sieges` : un ami aux commandes
    // d'un avion ne se rejoignait pas. Nina pilote un avion de ligne ; Alice
    // monte avec elle. Les deux invitées se voient par l'hôte (`rpos`, v406),
    // l'hôte voit Alice en direct (`pos`) : un seul scénario lit les deux
    // chemins. Puis l'avion décolle (Nina posée à la main, `update` suspendu)
    // : Alice SUIT, ne peut pas sauter en vol (le refus dit quoi faire), et
    // redescend une fois l'avion posé. Sur l'ancien code : pas de bouton.
    const ninaChez = { alice: await idDe(alice, 'Nina'), hote: await idDe(hote, 'Nina') };
    const aliceChezNina = await idDe(nina, 'Alice');
    const piste = await hote.evaluate(() => { const p = window.__game.player.pos; return { x: p.x - 14, y: p.y, z: p.z + 10 }; });
    const ninaPilote = await nina.evaluate(async (p) => {
      const g = window.__game; const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const y = g.world.sommetColonne(p.x, p.z) + 1;
      g.player.pos.set(p.x, y, p.z); g.player.vel.set(0, 0, 0); g.player.yaw = 0;
      g.animalManager.invoquer('avionligne', p.x, p.z - 3);
      await dodo(1200);
      document.getElementById('ride-btn').click();
      await dodo(800);
      const a = g.fun.montureConduite && g.fun.montureConduite();
      return { auxCommandes: !!(a && a.def && a.def.pilote), cle: a && a.def ? a.def.key : null, y };
    }, piste);
    const avionChezAlice = () => alice.evaluate((id) => {
      const rp = window.__game.remotePlayers.get(id);
      const m = rp && rp.vehicule ? rp.vehicule.mesh : null;
      return m ? { x: m.position.x, y: m.position.y, z: m.position.z, cle: rp.vehicule.def.key } : null;
    }, ninaChez.alice);
    await jusqua(async () => !!(await avionChezAlice()), 20000);
    const vuAvion = await avionChezAlice();
    if (vuAvion) await alice.evaluate((p) => { const P = window.__game.player; P.pos.set(p.x + 4, p.y, p.z); P.vel.set(0, 0, 0); }, vuAvion);
    const boutonAvion = await jusqua(async () => alice.evaluate(() => {
      const b = document.getElementById('ride-btn'); return b.style.display !== 'none' && /Monter avec/.test(b.textContent);
    }), 15000);
    if (boutonAvion) await alice.evaluate(() => document.getElementById('ride-btn').click());
    const phases = new Set();
    await jusqua(async () => alice.evaluate(() => { const g = window.__game; const e = g.player.embarquement; return { ph: e ? e.phase : null, p: !!g.fun.passagerDe() }; })
      .then(async (r) => { if (r.ph && !phases.has(r.ph) && r.ph === 'gravir') await capture(alice, '1-escalier'); if (r.ph) phases.add(r.ph); return r.p; }), 30000, 150);
    await capture(alice, '2-assise-au-sol');
    console.log('phases montée', [...phases]);
    const montee = await alice.evaluate(() => { const p = window.__game.fun.passagerDe(); return p ? { de: p.de, s: p.s } : null; });
    // la parenté du maillage, des deux côtés du réseau
    const assiseChez = async (page, idAlice, ninaLocale, idNina) => page.evaluate(({ idAlice, ninaLocale, idNina }) => {
      const g = window.__game, rp = g.remotePlayers.get(idAlice);
      const avion = ninaLocale ? (g.fun.montureConduite() || {}).mesh : ((g.remotePlayers.get(idNina) || {}).vehicule || {}).mesh;
      return !!(rp && avion && rp.mesh.parent === avion);
    }, { idAlice, ninaLocale, idNina });
    const parRelais = await jusqua(async () => assiseChez(nina, aliceChezNina, true), 20000);
    const aliceChezHote2 = await idDe(hote, 'Alice');
    const enDirect = await jusqua(async () => assiseChez(hote, aliceChezHote2, false, ninaChez.hote), 20000);
    verifier('on monte en passager dans l\'avion d\'un ami : assise dans sa cabine, vue par le relais (rpos) et en direct (pos)',
      ninaPilote.auxCommandes && boutonAvion && !!montee && montee.de === ninaChez.alice && parRelais && enDirect,
      JSON.stringify({ ninaPilote, vuAvion, boutonAvion, montee, parRelais, enDirect }));
    // L'AVION DÉCOLLE : Nina monte de trente blocs et avance ; Alice suit
    await nina.evaluate(() => {
      const P = window.__game.player; P.__update = P.update; P.update = () => {};
      let n = 0; const id = setInterval(() => { if (++n > 30) { clearInterval(id); return; } P.pos.y += 1; P.pos.z -= 0.6; }, 100);
    });
    await dormir(3500);
    let enVol = null, dernierVol = null;
    await jusqua(async () => {
      const av = await avionChezAlice(); if (!av) return false;
      const a = await alice.evaluate(() => { const g = window.__game; const P = g.player; return { x: P.pos.x, y: P.pos.y, z: P.pos.z, cx: P.camera.position.x, cy: P.camera.position.y, cz: P.camera.position.z }; });
      dernierVol = { av, a };
      if (av.y > ninaPilote.y + 25 && Math.hypot(a.x - av.x, a.z - av.z) < 6 && a.y > ninaPilote.y + 20) enVol = { av, a };
      return !!enVol;
    }, 20000);
    const camDist = enVol ? Math.hypot(enVol.a.cx - enVol.av.x, enVol.a.cy - enVol.av.y, enVol.a.cz - enVol.av.z) : null;
    await capture(alice, '3-en-vol');
    await alice.evaluate(() => { window.__game.player.yaw += 1.6; window.__game.player.pitch = -0.4; });
    await capture(alice, '4-en-vol-regard');
    // en vol, l'appui ne fait pas descendre : le refus dit quoi faire
    const sautRefuse = await alice.evaluate(async () => {
      const g = window.__game; const r0 = g.fun.refusVol ? g.fun.refusVol() : 0;
      document.getElementById('ride-btn').click();
      await new Promise((f) => setTimeout(f, 300));
      return { passager: !!g.fun.passagerDe(), refus: (g.fun.refusVol ? g.fun.refusVol() : 0) - r0 };
    });
    verifier('passager, on suit l\'avion de l\'ami en vol, la caméra autour de l\'appareil, et l\'on ne saute pas',
      !!enVol && camDist > 3 && camDist < 30 && sautRefuse.passager && sautRefuse.refus === 1,
      JSON.stringify({ enVol, dernierVol, camDist, sautRefuse }));
    // L'AVION SE POSE : Alice redescend, au sol, à côté de l'appareil
    await nina.evaluate((y) => { const P = window.__game.player; P.pos.y = y; }, ninaPilote.y);
    await jusqua(async () => { const av = await avionChezAlice(); return !!av && av.y < ninaPilote.y + 1; }, 20000);
    await dormir(800);
    await alice.evaluate(() => document.getElementById('ride-btn').click());
    const phasesD = new Set();
    await jusqua(async () => alice.evaluate(() => { const e = window.__game.player.embarquement; return e ? e.phase : null; })
      .then((ph) => { if (ph) phasesD.add(ph); return !ph && phasesD.size > 0 || !process.env.EMBARQ; }), 30000, 150);
    console.log('phases descente', [...phasesD]);
    await dormir(1500);
    const auSol = await alice.evaluate(() => { const g = window.__game; const P = g.player; return { passager: !!g.fun.passagerDe(), y: P.pos.y, sol: g.world.sommetColonne(P.pos.x, P.pos.z) + 1 }; });
    verifier('l\'avion posé, le passager descend et se retrouve au sol',
      !!montee && !auSol.passager && Math.abs(auSol.y - auSol.sol) < 2, JSON.stringify({ montee, auSol }));
    await nina.evaluate(() => { const g = window.__game; const P = g.player; if (P.__update) { P.update = P.__update; delete P.__update; }
      if (g.fun.montureConduite && g.fun.montureConduite()) document.getElementById('ride-btn').click(); });
    await dormir(500);

  } catch (e) { console.log('💥', e && e.stack || e); echecs.push('exception'); }
  console.log(echecs.length ? `ROUGE ${echecs.length}` : 'VERT');
  process.exit(echecs.length ? 1 : 0);
})();
