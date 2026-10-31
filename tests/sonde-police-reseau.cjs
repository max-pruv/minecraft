// LA POLICE D'UN AMI (police-réseau). Ce qui voyage, ce sont ses ÉTOILES
// (`p.v.w`, dans la position) ; chaque tablette mène sa propre voiture de
// police d'après la piste qu'elle dessine (patrouille.js, `amis`). Le
// conducteur fait une bêtise (provoquée, v233) et roule en temps réel (la
// position fonction de la montre, `rouler` de sonde-amis-fluides) ; chez
// l'observateur, posé près de la route, on relève : les étoiles reçues, une
// escorte qui suit CET ami à son écart, gyrophares allumés. Puis le
// conducteur est pardonné (`remiseAZero`) : l'escorte se gare chez l'autre.
// `escorte` est lue telle quelle par `reseau.js` (direct et relayé, v406) ;
// lancée seule, la sonde rejoue les deux chemins.
const { Banc, nomsVus, dormir, jusqua } = require('./banc.js');

// Monte au volant d'une voiture invoquée et roule vers +x à `v` blocs par
// seconde, position fonction de la montre (physique suspendue), sur `d` blocs
// au plus — puis s'arrête et attend : l'escorte doit s'arrêter à son écart
// derrière lui. Borné en DISTANCE, pas en temps : une page lente du banc
// rendait 540 blocs pour « dix secondes » (ses minuteries prennent du retard)
// et l'ami sortait de la portée de l'observateur.
async function rouler(page, v, d, ms) {
  return page.evaluate(async ({ v, d, ms }) => {
    const g = window.__game; const dodo = (t) => new Promise((f) => setTimeout(f, t));
    if (!(g.fun.montureConduite && g.fun.montureConduite())) {
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
      g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5);
      await dodo(1500);
      for (let e = 0; e < 6 && !(g.fun.montureConduite && g.fun.montureConduite()); e++) { document.getElementById('ride-btn').click(); await dodo(700); }
    }
    const auVolant = !!(g.fun.montureConduite && g.fun.montureConduite());
    const maj = g.player.update; g.player.update = function () {};
    const yaw0 = g.player.yaw; g.player.yaw = -Math.PI / 2;
    const x0 = g.player.pos.x, t0 = performance.now();
    const it = setInterval(() => { g.player.pos.x = x0 + Math.min(d, v * (performance.now() - t0) / 1000); }, 10);
    const t1 = performance.now();
    while (performance.now() - t1 < ms) await dodo(200);
    clearInterval(it);
    const parcouru = g.player.pos.x - x0;
    window.__rendreLaPlace = () => { g.player.pos.x = x0; g.player.yaw = yaw0; g.player.update = maj; };
    return { auVolant, parcouru };
  }, { v, d, ms });
}

// le CANVAS d'une page qui ne fait que relayer (l'hôte) passe à 16 × 16 :
// son réseau tourne, son remplissage ne prend plus les cœurs des deux autres
// (la règle de `banc.aLEcart` ; la fenêtre, elle, mettrait le jeu en pause)
const reduire = (q, oui) => q.evaluate((oui) => {
  const c = window.__game && window.__game.renderer && window.__game.renderer.domElement;
  if (!c) return;
  if (oui) { c.style.setProperty('width', '16px', 'important'); c.style.setProperty('height', '16px', 'important'); }
  else { c.style.removeProperty('width'); c.style.removeProperty('height'); }
}, oui).catch(() => {});

async function escorte(conducteur, observateur, nom, { v = 14, d = 110, ms = 14000, aCote = [] } = {}) {
  for (const q of aCote) await reduire(q, true);
  try { return await escorte1(conducteur, observateur, nom, { v, d, ms }); }
  finally { for (const q of aCote) await reduire(q, false); }
}
async function escorte1(conducteur, observateur, nom, { v, d, ms }) {
  const id = await observateur.evaluate((nom) => {
    for (const [id, rp] of window.__game.remotePlayers) if (rp.name === nom) return id;
    return null;
  }, nom);
  if (!id) return { err: 'ami introuvable chez l\'observateur' };
  const avant = await conducteur.evaluate(() => {
    const p = window.__patrouille; if (!p) return { err: 'pas de patrouille' };
    p.remiseAZero(); p.betise('voiture'); p.betise('voiture');
    return { etoiles: p.etoiles(), x: window.__game.player.pos.x, y: window.__game.player.pos.y, z: window.__game.player.pos.z };
  });
  if (avant.err) return avant;
  // l'observateur à côté de la route (rouler va vers +x), à pied
  await observateur.evaluate((p) => {
    const g = window.__game;
    if (g.fun.montureConduite && g.fun.montureConduite()) document.getElementById('ride-btn').click();
    if (window.__patrouille) window.__patrouille.remiseAZero();
    g.player.pos.set(p.x + 50, p.y + 6, p.z + 14); g.player.vel.set(0, 0, 0); g.player.flying = true;
    window.__escorteVue = { releves: 0, w: 0, vue: null, gyroMax: 0, ecarts: [], autres: 0 };
    const t = setInterval(() => {
      const e = window.__patrouille ? window.__patrouille.etat() : null; const r = window.__escorteVue;
      r.releves++;
      const rp = window.__game.remotePlayers.get(window.__escorteAmi);
      if (rp) { r.vehicule = (r.vehicule || 0) + (rp.vehicule ? 1 : 0); r.etoilesRecues = Math.max(r.etoilesRecues || 0, rp.etoiles || 0); }
      if (!e) return;
      const a = (e.amis || []).find((x) => x.id === window.__escorteAmi);
      if (a) { r.w = Math.max(r.w, a.w); r.pisteMax = Math.max(r.pisteMax || 0, a.piste); r.coupures = a.coupures; r.loin = (r.loin || 0) + (a.loin ? 1 : 0); }
      for (const s of e.escortes || []) {
        if (s.ami !== window.__escorteAmi) { r.autres++; continue; }
        if (!r.vue) r.vue = { type: s.type, ms: Math.round(performance.now() - r.t0) };
        r.gyroMax = Math.max(r.gyroMax, s.gyro || 0);
        if (s.ecart != null) r.ecarts.push(+s.ecart.toFixed(1));
      }
    }, 200);
    window.__escorteVue.t0 = performance.now();
    window.__escorteStop = () => clearInterval(t);
  }, avant);
  await observateur.evaluate((id) => { window.__escorteAmi = id; }, id);
  const roule = await rouler(conducteur, v, d, ms);
  const pendant = await observateur.evaluate(() => {
    const r = window.__escorteVue; const e = r.ecarts.slice(-10);
    return { ...r, ecarts: undefined, ecartFin: e.length ? e[e.length - 1] : null, ecartsFin: e };
  });
  // pardonné chez lui : plus d'étoiles, l'escorte se gare chez l'autre
  await conducteur.evaluate(() => window.__patrouille.remiseAZero());
  await dormir(600);
  // et l'on rend la place telle qu'on l'a trouvée (un témoin d'une suite)
  await conducteur.evaluate(async () => {
    if (window.__rendreLaPlace) window.__rendreLaPlace();
    // il redescend : la suite le retrouve à pied, comme elle l'avait laissé
    const f = window.__game.fun;
    for (let e = 0; e < 4 && f.montureConduite && f.montureConduite(); e++) { document.getElementById('ride-btn').click(); await new Promise((r) => setTimeout(r, 600)); }
  });
  let apres = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    apres = await observateur.evaluate(() => {
      const e = window.__patrouille.etat();
      return { escortes: (e.escortes || []).filter((s) => s.ami === window.__escorteAmi).length,
        w: ((e.amis || []).find((x) => x.id === window.__escorteAmi) || {}).w ?? null };
    });
    if (apres.escortes === 0) break;
    await dormir(500);
  }
  apres.ms = Date.now() - t0;
  await observateur.evaluate(() => { window.__escorteStop(); window.__game.player.flying = false; });
  const direct = await observateur.evaluate((id) => { const c = window.__game.net.conns.get(id); return !!(c && c.conn); }, id);
  return { avant, roule, pendant, apres, direct };
}

// le verdict, partagé avec reseau.js
function juger(r) {
  return !!r && !r.err && r.avant.etoiles >= 1 && r.pendant.w >= 1 && !!r.pendant.vue && r.pendant.vue.type === 'voiture'
    && r.pendant.gyroMax >= 1 && r.pendant.ecartFin != null && r.pendant.ecartFin > 4 && r.pendant.ecartFin < 30
    && r.apres.escortes === 0;
}

module.exports = { escorte, juger };

if (require.main === module) {
  (async () => {
    const banc = new Banc();
    await banc.ouvrir();
    try {
      const { p: hote, code } = await banc.creerMonde('Marlon');
      const alice = await banc.rejoindre('Alice', code);
      const nina = await banc.rejoindre('Nina', code);
      await jusqua(async () => (await nomsVus(alice)).includes('Nina') && (await nomsVus(nina)).includes('Alice'), 60000);
      const d = process.env.SEUL_RELAYE ? null : await escorte(hote, alice, 'Marlon');
      if (d) console.log('direct (Marlon recherché, vu par Alice)', juger(d), JSON.stringify(d));
      // l'hôte ne fait que relayer : mis de côté, il ne prend plus quatre
      // cœurs aux deux autres (v440)
      const r = await escorte(nina, alice, 'Nina', { aCote: [hote] });
      console.log('relayé (Nina recherchée, vue par Alice)', juger(r), JSON.stringify(r));
    } catch (e) { console.log('ERREUR', e && e.stack || e); }
    await banc.fermer().catch(() => {});
    process.exit(0);
  })();
}
