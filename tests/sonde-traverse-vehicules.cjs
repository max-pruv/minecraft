// Sonde (v560) : « les véhicules ne doivent pas pouvoir passer les uns dans
// les autres ; aujourd'hui c'est encore possible » (Max). On MESURE avant
// d'écrire (v223) : par paire, combien de relevés où deux rectangles se
// recouvrent VRAIMENT (séparation d'axes, v244, enfoncement > 0,25 bloc —
// un frôlement n'est pas une traversée), et jusqu'où.
//
//   · rue      : l'enfant au volant dans Paris, pleins gaz, le volant tourné
//                vers la voiture de la rue la plus proche (on cherche le
//                contact, comme un enfant qui joue à GTA) — 40 s ;
//                on compte aussi rue contre rue pendant ce temps ;
//   · garée    : une voiture invoquée à quatorze blocs devant, pleins gaz
//                dedans, et l'on garde le doigt sur l'accélérateur ;
//   · collé    : une voiture invoquée collée contre notre flanc (l'état que
//                laisse un choc), une seconde devant nous : on accélère.
//     node tests/sonde-traverse-vehicules.cjs
// Les trains ont leur témoin (`monte.js`, v304 et v451), l'ami aussi
// (`reseau.js`, v383) : la règle neuve passe par le même crochet.
const { Banc, dormir } = require('./banc.js');

async function mesurer(tab, seul = null) {
  return tab.evaluate(async (seul) => {
    const g = window.__game, V = window.__vehicules;
    const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
    const rect = (x, z, cap, a, b) => { const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux;
      return [[x + ux * a + vx * b, z + uz * a + vz * b], [x + ux * a - vx * b, z + uz * a - vz * b], [x - ux * a - vx * b, z - uz * a - vz * b], [x - ux * a + vx * b, z - uz * a + vz * b]]; };
    const prof = (P, Q) => { let m = Infinity; for (const R of [P, Q]) for (let k = 0; k < 4; k++) {
      const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0], n = Math.hypot(ax, az);
      const p = P.map((q) => (q[0] * ax + q[1] * az) / n), q = Q.map((s) => (s[0] * ax + s[1] * az) / n);
      const o = Math.min(Math.max(...p), Math.max(...q)) - Math.max(Math.min(...p), Math.min(...q));
      if (o <= 0) return 0; m = Math.min(m, o); } return m; };
    const dims = (nom) => /bus/i.test(nom) ? [3.3, 1.13] : /train|tgv|ice|metro|métro|rame|shinkansen|ligne/i.test(nom) ? [3.7, 0.9] : [2.2, 1.13];
    const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
    const descendre = async () => { for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await dodo(400); } };
    const vider = () => { for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh); g.animalManager.animals.length = 0; };
    const monter = async (x, z, yaw) => {
      await descendre(); vider();
      g.player.flying = false; g.player.pilote = null;
      const a = g.animalManager.invoquer('voiture', x, z, false, { flotte: 'berline-citadine' });
      await dodo(700);
      for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await dodo(500); }
      g.player.yaw = yaw; return a;
    };
    const moi = () => rect(g.player.pos.x, g.player.pos.z, g.player.yaw + Math.PI, 2.2, Math.max(0.3, g.player.gabarit / 2));
    const res = {};

    // --- rue ---------------------------------------------------------------
    if (seul !== 'colle') {
    const m = await import('./src/mondes.js'); const P = m.positionDe('paris');
    g.player.flying = true; g.player.pos.set(P.x + 30, 60, P.z - 10);
    const t00 = performance.now();
    while (performance.now() - t00 < 30000 && (V.etat() || []).filter((c) => c.routier).reduce((n, c) => n + c.visibles, 0) < 8) await dodo(500);
    // un départ sur la voie d'un convoi routier, face au trafic
    const e0 = V.etat(); const ci = e0.findIndex((c) => c.routier && c.visibles >= 3);
    const pt = ci >= 0 ? V.point(ci, 30) : null;
    if (!pt) return { err: 'pas de convoi routier' };
    g.player.flying = false; g.player.pos.set(pt.x, pt.y + 0.05, pt.z); g.player.vel.set(0, 0, 0);
    await dodo(500);
    await monter(pt.x, pt.z, pt.cap);
    if (!auVolant()) return { err: 'pas monté (rue)', pt };
    const rue = { cas: [], releves: 0, paires: 0, dedans: 0, nouveaux: 0, pire: 0, parType: {}, rueRue: 0, rueRuePaires: 0, chocs: 0 };
    const exclues = new Set(); const avant = new Set(); const posPrec = new Map(); let moiPrec = null;
    let dernierChoc = null;
    const t0 = performance.now();
    while (performance.now() - t0 < 40000 && auVolant()) {
      await dodo(150);
      const R = moi(); rue.releves++;
      const autres = [];
      for (const c of V.etat() || []) for (const pl of c.places) autres.push({ id: c.cle + '#' + pl[3], nom: c.nom, x: pl[0], z: pl[1], cap: pl[2], r: rect(pl[0], pl[1], pl[2], ...dims(c.nom)) });
      let proche = null, dmin = Infinity;
      const ici = new Set();
      for (const o of autres) {
        const d = Math.hypot(o.x - g.player.pos.x, o.z - g.player.pos.z);
        if (d < dmin && d > 1) { dmin = d; proche = o; }
        if (d > 9) continue;
        rue.paires++;
        const p = prof(R, o.r);
        // posée sur une voiture au départ (le tracé du convoi) : ce n'est pas
        // une traversée, on l'écarte une fois pour toutes (v279)
        if (rue.releves === 1 && p > 0) exclues.add(o.id);
        if (exclues.has(o.id)) continue;
        if (p > 0.25 && !avant.has(o.id) && rue.cas.length < 6) {
          const pp = posPrec.get(o.id);
          rue.cas.push({ id: o.id, p: +p.toFixed(2), luiBouge: pp ? +Math.hypot(o.x - pp[0], o.z - pp[1]).toFixed(2) : null,
            moiBouge: moiPrec ? +Math.hypot(g.player.pos.x - moiPrec[0], g.player.pos.z - moiPrec[1]).toFixed(2) : null,
            v: +(g.player.vitesseVoiture || 0).toFixed(1), contact: g.player.contact && g.player.contact.famille });
        }
        if (p > 0.25) { rue.dedans++; ici.add(o.id); if (!avant.has(o.id)) rue.nouveaux++; rue.pire = Math.max(rue.pire, +p.toFixed(2)); rue.parType[o.nom] = (rue.parType[o.nom] || 0) + 1; }
      }
      avant.clear(); for (const k of ici) avant.add(k);
      posPrec.clear(); for (const o of autres) posPrec.set(o.id, [o.x, o.z]); moiPrec = [g.player.pos.x, g.player.pos.z];
      for (let i = 0; i < autres.length; i++) for (let j = i + 1; j < autres.length; j++) {
        const A = autres[i], B = autres[j];
        if (Math.hypot(A.x - B.x, A.z - B.z) > 5 || Math.hypot(A.x - g.player.pos.x, A.z - g.player.pos.z) > 60) continue;
        rue.rueRuePaires++; if (prof(A.r, B.r) > 0.25) rue.rueRue++;
      }
      if (g.player.choc && g.player.choc !== dernierChoc) { dernierChoc = g.player.choc; rue.chocs++; }
      // le volant vers la plus proche : on cherche le contact
      if (proche) {
        const vise = Math.atan2(-(proche.x - g.player.pos.x), -(proche.z - g.player.pos.z));
        const e = Math.atan2(Math.sin(vise - g.player.yaw), Math.cos(vise - g.player.yaw));
        g.player.touchMove.s = Math.max(-1, Math.min(1, -e * 2));
      }
      g.player.touchMove.f = 1;
    }
    g.player.touchMove.f = 0; g.player.touchMove.s = 0;
    rue.exclues = exclues.size;
    res.rue = rue;
    }

    // --- garée -------------------------------------------------------------
    // une dalle de pierre loin de tout, au-dessus du relief (le port de
    // `monte.js`) : la même situation à tous les coups (v233)
    const { BLOCK } = await import('./src/blocks.js');
    const X0 = 31200, Z0 = 31500;
    let Y0 = 0;
    for (let d = -8; d <= 40; d += 4) for (let w = -8; w <= 8; w += 4) Y0 = Math.max(Y0, g.world.terrainHeight(X0 + d, Z0 + w));
    Y0 += 2;
    for (let d = -8; d <= 40; d++) for (let w = -8; w <= 8; w++) {
      g.world.setBlock(X0 + d, Y0, Z0 + w, BLOCK.STONE);
      for (let h = 1; h <= 6; h++) if (g.world.getBlock(X0 + d, Y0 + h, Z0 + w) !== 0) g.world.setBlock(X0 + d, Y0 + h, Z0 + w, 0);
    }
    const gare = async (colle) => {
      g.player.flying = false;
      g.player.pos.set(X0, Y0 + 1.01, Z0 + 0.5); g.player.vel.set(0, 0, 0);
      await dodo(600);
      const x = g.player.pos.x, z = g.player.pos.z;
      await monter(x, z, -Math.PI / 2);     // cap vers +x
      if (!auVolant()) return { err: 'pas monté' };
      g.player.vel.set(0, 0, 0); await dodo(300);
      const dx = colle ? 0 : 14, dz = colle ? 1.8 : 0;
      const b = g.animalManager.invoquer('voiture', g.player.pos.x + dx, g.player.pos.z + dz, false, { flotte: 'berline-citadine' });
      if (b) b.yaw = colle ? Math.PI / 2 : 0;   // collée : parallèle, flanc contre flanc
      // et une seconde voiture DEVANT, quand on est collé à la première
      const c2 = colle ? g.animalManager.invoquer('voiture', g.player.pos.x + 5.5, g.player.pos.z, false, { flotte: 'berline-citadine' }) : null;
      if (c2) c2.yaw = Math.PI / 2;
      await dodo(400);
      const pireDebut = b ? +prof(moi(), rect(b.pos.x, b.pos.z, b.yaw, 2.2, 1.13)).toFixed(2) : null;
      const o = { releves: 0, dedans: 0, pire: 0 };
      const t1 = performance.now();
      g.player.keys.add('KeyW');
      while (performance.now() - t1 < 10000) {
        await dodo(120);
        for (const a of [colle ? c2 : b]) {
          if (!a) continue;
          const p = prof(moi(), rect(a.pos.x, a.pos.z, a.yaw, 2.2, (a.def.gabarit || 2.26) / 2));
          o.releves++;
          if (p > 0.25) { o.dedans++; o.pire = Math.max(o.pire, +p.toFixed(2)); }
        }
      }
      g.player.keys.delete('KeyW');
      o.avance = +(g.player.pos.x - x).toFixed(1); o.a = b ? [+(b.pos.x - x).toFixed(1), +(b.pos.z - z).toFixed(1)] : null; o.b = c2 ? [+(c2.pos.x - x).toFixed(1), +(c2.pos.z - z).toFixed(1)] : null; o.pireDebut = pireDebut; o.v = +(g.player.vitesseVoiture || 0).toFixed(1); o.contact = g.player.contact && g.player.contact.famille;
      return o;
    };
    res.garee = await gare(false);
    res.colle = await gare(true);
    await descendre();
    return res;
  }, seul);
}
module.exports = { mesurer };
if (require.main === module) {
  (async () => {
    const banc = new Banc(); await banc.ouvrir();
    try {
      const tab = await banc.jouerSeul('Marlon', { rr: 4 });
      await dormir(3000);
      console.log(JSON.stringify(await mesurer(tab, process.env.SEUL || null)));
    } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
  })();
}
