// SONDE (v488) : on monte dans une rame PAR SA PORTE, et l'on en descend —
// le passage de monte.js, seul, sur une page qui joue la séquence
// (`embarq: 1`), pour le mesurer des deux côtés en deux minutes. Copie
// conforme : `passage` est exportée et monte.js l'appelle telle quelle.
//
// ON PROVOQUE LA SITUATION (v233) : attendre qu'un vrai métro marque l'arrêt
// devant l'enfant est un tirage. Le passage pose sa propre ligne, droite, sur
// une prairie plate, avec un arrêt tous les vingt blocs et douze secondes de
// pause : la rame est à quai presque tout le temps, et l'on choisit l'instant.
const { Banc } = require('./banc.js');
const verifier = (nom, ok, d = '') => console.log(`${ok ? '✅' : '❌'} ${nom} — ${d}`);

async function passage() {
  const THREE = await import('three');
  const g = window.__game, V = g.vehicules;
  const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
  const images = async (n) => { const f0 = g.renderer.info.render.frame, t0 = performance.now(); while (g.renderer.info.render.frame - f0 < n && performance.now() - t0 < 20000) await dodo(50); };
  const cles = () => new Set((g.renderer.info.programs || []).map((p) => p.cacheKey));
  const bouton = () => document.getElementById('board-btn').click();
  const bord = () => !!(g.fun.bordDe && g.fun.bordDe());
  const res = {};
  if (!V || !V.metro) return { err: 'pas de vehicules.metro' };
  const x0 = Math.floor(g.player.pos.x) + 0.5, z0 = Math.floor(g.player.pos.z) + 0.5;
  const h = g.world.terrainHeight(Math.floor(x0), Math.floor(z0));
  // la ligne : un aller sur le sol (l'origine d'une rame est sur la voie),
  // dix points, un arrêt à chacun
  const zl = z0 + 6, pts = [];
  for (let k = 0; k <= 9; k++) { const x = x0 - 90 + k * 20; pts.push({ x, y: g.world.sommetColonne(Math.floor(x), Math.floor(zl)) + 1, z: zl }); }
  const n0 = (V.etat() || []).length;
  V.metro(pts, { nom: 'métro d\'essai', emoji: '🚇', rames: 1, nb: 2, vitesse: 7, arretsIndex: pts.map((_, k) => k), pause: 12 });
  const ci = (V.etat() || []).length - 1;
  if (ci < n0) return { err: 'ligne non créée' };
  const e = () => V.etat()[ci];
  // une voiture de la rame, à quai, avec du temps devant elle
  const aQuai = async () => {
    const t0 = performance.now();
    while (performance.now() - t0 < 90000) {
      const c = e();
      if (c.attente >= 8 && c.visibles > 0) {
        const m = V.voitureNommee(`${c.cle}#0`);
        if (m && m.visible && m.userData.porte) return m;
      }
      await dodo(150);
    }
    return null;
  };
  // l'enfant sur le quai (le sol), à trois blocs du flanc gauche de la voiture
  const poser = async (m) => {
    m.updateMatrixWorld(true);
    // à la cote de la VOIE (l'origine de la rame), pas au sommet de la
    // colonne : un arbre ou une marche du relief y mettrait l'enfant hors de
    // la portée en hauteur d'embarquement (|Δy| ≤ 2,5)
    const w = m.localToWorld(new THREE.Vector3(-3, 0, -0.5));
    g.player.pos.set(w.x, m.position.y, w.z);
    g.player.vel.set(0, 0, 0); g.player.flying = false;
    await images(2);
    g.player.pos.set(w.x, m.position.y, w.z); g.player.vel.set(0, 0, 0);
  };
  // ce que l'appui va trouver : un rouge doit dire s'il a vu la rame (v272)
  const vise = () => { const q = window.__vehicules.placeProche(9), c = e();
    return { place: q ? `${q.nom} ${q.id} à ${q.d.toFixed(1)}` : null, dy: q ? +(q.y - g.player.pos.y).toFixed(1) : null, attente: c.attente }; };
  const decalage = (m) => { const p = m.userData.porte, mb = m.userData.membres[p.ouvrant]; return +Math.abs(mb.position[p.axe] - p[p.axe]).toFixed(3); };
  const releve = async (m, ms, fin) => {
    const out = [], t0 = performance.now();
    while (performance.now() - t0 < ms) {
      const s = g.player.embarquement;
      const av = g.avatarLocal;
      out.push({ ph: s ? s.phase : null, bord: bord(), porte: decalage(m), avatar: !!(av && av.parent === m),
        y: +(g.player.pos.y - (g.world.sommetColonne(Math.floor(g.player.pos.x), Math.floor(g.player.pos.z)) + 1)).toFixed(2) });
      if (fin(out)) break;
      await dodo(100);
    }
    return out;
  };
  const avant = cles(), blocs = g.world.edits.size;

  // 1. MONTER : la marche, la porte qui coulisse, l'entrée ; `bord` ne bascule qu'une fois dedans
  let m = await aQuai();
  if (!m) return { err: 'la rame n\'est jamais à quai', etat: e() };
  await poser(m);
  const viseMonter = vise();
  bouton();
  let r = await releve(m, 30000, (o) => o.length > 3 && !o[o.length - 1].ph && o[o.length - 1].bord);
  res.monter = { phases: [...new Set(r.map((x) => x.ph).filter(Boolean))], n: r.length,
    bordPendant: r.filter((x) => x.bord && ['approche', 'ouverture', 'entree'].includes(x.ph)).length,
    porteMax: Math.max(...r.map((x) => x.porte)), avatarPendant: r.some((x) => x.avatar),
    fin: r[r.length - 1], vise: viseMonter };

  // 2. DESCENDRE : l'état bascule au premier appui, la porte s'ouvre, l'enfant
  // se pose sur le quai, la porte se referme
  m = await aQuai();
  if (!m) return { ...res, err: 'pas de quai pour descendre' };
  // à bord, on est là où la rame est (updateBord) : on attend qu'elle soit à quai
  bouton();
  r = await releve(m, 30000, (o) => o.length > 3 && !o[o.length - 1].ph);
  const fin = r[r.length - 1], p = g.player.pos;
  res.descendre = { phases: [...new Set(r.map((x) => x.ph).filter(Boolean))], n: r.length,
    bordPendant: r.filter((x) => x.bord).length, porteMax: Math.max(...r.map((x) => x.porte)), fin,
    libre: g.world.boiteLibre(p.x, p.y, p.z, 0.3, 1.8), refus: g.fun.refusSortie ? g.fun.refusSortie() : null,
    flanc: +Math.abs(m.worldToLocal(p.clone()).x).toFixed(2) };

  // 3. UN SECOND APPUI EN PLEINE MARCHE : à bord tout de suite, porte fermée
  m = await aQuai();
  if (m) {
    await poser(m);
    bouton(); await images(2);
    const ph = g.player.embarquement ? g.player.embarquement.phase : null;
    bouton(); await images(2);
    res.second = { avant: ph, apres: g.player.embarquement ? g.player.embarquement.phase : null, bord: bord(), porte: decalage(m),
      avatar: !!(g.avatarLocal && g.avatarLocal.parent === m) };
    if (bord()) { bouton(); await images(4); if (g.player.embarquement) g.fun.terminerEmbarquement(); }
  }

  // 4. UNE RAME QUI ROULE : l'ancien geste, d'un coup (la porte ne file pas sous l'enfant)
  {
    const t0 = performance.now();
    while (performance.now() - t0 < 60000 && !(e().attente === 0 && e().visibles > 0)) await dodo(50);
    const mv = V.voitureNommee(`${e().cle}#0`);
    if (mv && e().attente === 0) {
      mv.updateMatrixWorld(true);
      const w = mv.localToWorld(new THREE.Vector3(-2.5, 0, 0));
      g.player.pos.set(w.x, mv.position.y, w.z); g.player.vel.set(0, 0, 0);
      const v0 = vise();
      bouton(); await images(1);
      res.roule = { bord: bord(), ph: g.player.embarquement ? g.player.embarquement.phase : null, vise: v0 };
      if (bord()) { bouton(); await images(2); }
    }
  }
  res.clesNeuves = [...cles()].filter((k) => !avant.has(k)).length;
  res.blocs = g.world.edits.size - blocs;
  return res;
}

function juger(r, verifier) {
  const m = r.monter, d = r.descendre;
  verifier('on monte dans une rame à quai par sa porte : on marche, elle coulisse, on entre — à bord seulement une fois dedans',
    !r.err && m && ['approche', 'ouverture', 'entree'].every((p) => m.phases.includes(p)) && m.bordPendant === 0
      && m.porteMax > 0.6 && m.avatarPendant && m.fin.bord && !m.fin.ph && m.fin.porte < 0.02 && !m.fin.avatar,
    JSON.stringify(r.err ? r : m));
  verifier('et l\'on en descend par la porte, posé debout sur le quai, porte refermée',
    !r.err && d && d.bordPendant === 0 && ['ouverture', 'sortie'].every((p) => d.phases.includes(p)) && d.porteMax > 0.6
      && !d.fin.ph && d.fin.porte < 0.02 && !d.fin.avatar && Math.abs(d.fin.y) < 0.3 && d.libre && d.flanc > 0.9,
    JSON.stringify(d || r));
  verifier('un second appui en pleine marche met à bord tout de suite, porte fermée ; une rame qui roule se prend d\'un coup',
    r.second && r.second.avant === 'approche' && !r.second.apres && r.second.bord && r.second.porte < 0.02 && !r.second.avatar
      && r.roule && r.roule.bord && !r.roule.ph,
    JSON.stringify({ second: r.second, roule: r.roule }));
  verifier('monter dans une rame ne compile aucun programme et n\'écrit aucun bloc',
    r.clesNeuves === 0 && r.blocs === 0, JSON.stringify({ cles: r.clesNeuves, blocs: r.blocs }));
}

module.exports = { passage, juger };

if (require.main === module) {
  (async () => {
    const banc = new Banc();
    await banc.ouvrir();
    try {
      const emb = await banc.jouerSeul('SondePorteRame', { embarq: process.env.EMBARQ === '0' ? 0 : 1 });
      await emb.evaluate(async () => {
        const g = window.__game;
        const x = -600.5, z = -520.5;
        g.player.pos.set(x, g.world.terrainHeight(x, z) + 1, z); g.player.vel.set(0, 0, 0);
        await new Promise((r) => setTimeout(r, 4000));
      });
      const t0 = Date.now();
      const r = await emb.evaluate(passage);
      juger(r, verifier);
      console.log('durée', ((Date.now() - t0) / 1000).toFixed(0), 's · erreurs', JSON.stringify(emb.erreurs));
    } catch (e) { console.log('ERREUR', e.message); }
    await banc.fermer();
    process.exit(0);
  })();
}
