// SONDE (v400) : on DESCEND d'un avion par son escalier — le passage de
// monte.js, seul, sur une page qui joue la séquence, pour le mesurer des deux
// côtés en deux minutes. Copie conforme du passage (la fonction `passage` est
// exportée et monte.js l'appelle telle quelle).
const { Banc } = require('./banc.js');
const verifier = (nom, ok, d = '') => console.log(`${ok ? '✅' : '❌'} ${nom} — ${d}`);

// Le passage, joué DANS la page. Monte aux commandes d'un coup (le second
// appui de la v389), puis descend par le bouton et relève toutes les cent
// millisecondes : la phase, `montureConduite()` (faux dès le premier relevé :
// l'état bascule au premier appui), les pieds au-dessus du sol, l'angle de la
// porte, l'escalier, l'avatar. Puis un second appui en pleine descente, le
// Concorde (sans porte : d'un coup), et un avion dont le pied de l'escalier
// tombe dans l'eau (on se pose ailleurs, jamais dans l'eau ni dans un mur).
async function passage() {
  const THREE = await import('three');
  const g = window.__game, am = g.animalManager;
  const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
  const images = async (n) => { const f0 = g.renderer.info.render.frame, t0 = performance.now(); while (g.renderer.info.render.frame - f0 < n && performance.now() - t0 < 20000) await dodo(50); };
  const bouton = () => document.getElementById('ride-btn').click();
  const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
  const enSeq = () => !!g.player.embarquement;
  const finir = async () => { for (let i = 0; i < 6 && (auVolant() || enSeq()); i++) { if (enSeq()) g.fun.terminerEmbarquement(); else bouton(); await images(2); } };
  const vider = () => { for (const a of [...am.animals]) { am.scene.remove(a.mesh); am.animals.splice(am.animals.indexOf(a), 1); } };
  const cles = () => new Set((g.renderer.info.programs || []).map((p) => p.cacheKey));
  const x0 = g.player.pos.x, z0 = g.player.pos.z;
  const placer = (a, x, z) => {
    a.yaw = 0; a.pos.x = x; a.pos.z = z;
    a.pos.y = g.world.sommetColonne(Math.floor(x), Math.floor(z)) + 1.1;
    a.mesh.rotation.y = Math.PI; a.mesh.position.copy(a.pos); a.mesh.updateMatrixWorld(true);
  };
  // aux commandes, d'un coup : on monte (la séquence) et l'on termine (second appui)
  const auxCommandes = async (key, x, z) => {
    await finir(); vider();
    g.player.pilote = null; g.player.avionEtat = undefined; g.player.avionEnVol = undefined; g.player.flying = false;
    const a = am.invoquer(key, x, z, false);
    if (!a) return null;
    placer(a, x, z);
    const ici = a.mesh.localToWorld(new THREE.Vector3(-3.5, 0, -5));
    g.player.pos.set(ici.x, g.world.sommetColonne(Math.floor(ici.x), Math.floor(ici.z)) + 1, ici.z); g.player.vel.set(0, 0, 0);
    g.player.yaw = Math.atan2(-(a.pos.x - ici.x), -(a.pos.z - ici.z));
    await images(6);
    placer(a, x, z);
    bouton(); await images(2);
    if (enSeq()) { g.fun.terminerEmbarquement(); await images(2); }
    g.player.avionEtat = 'sol'; g.player.avionEnVol = false; g.player.vitesseAvion = 0;
    await images(6);
    return a;
  };
  const sol = (p) => {
    const w = g.world, bx = Math.floor(p.x), bz = Math.floor(p.z);
    const pieds = w.getBlock(bx, Math.floor(p.y), bz), dessous = w.getBlock(bx, Math.floor(p.y - 0.5), bz);
    const EAU = 7;
    return { eau: pieds === EAU || dessous === EAU, libre: w.boiteLibre(p.x, p.y, p.z, 0.3, 1.8),
      haut: +(p.y - (w.sommetColonne(bx, bz) + 1)).toFixed(2) };
  };
  const releve = async (a, ms) => {
    const out = [], t0 = performance.now();
    const porte = a.mesh.userData.porte;
    const m = porte && a.mesh.userData.membres[porte.ouvrant];
    while (performance.now() - t0 < ms) {
      const e = g.player.embarquement;
      const loc = a.mesh.worldToLocal(g.player.pos.clone());
      out.push({ ph: e ? e.phase : null, v: auVolant(), dy: +(g.player.pos.y - a.pos.y).toFixed(2),
        lx: +loc.x.toFixed(2), ang: m ? +Math.abs(m.rotation[porte.axe]).toFixed(2) : 0, acces: a.mesh.children.length });
      if (!e && out.length > 3) break;
      await dodo(100);
    }
    return out;
  };
  const res = {};
  const avant = cles(), blocs = g.world.edits.size;
  for (const [key, dx] of [['avionligne', -30], ['chasseur', -60]]) {
    const a = await auxCommandes(key, x0 + dx, z0 - 6);
    if (!a || !auVolant()) { res[key] = { err: 'pas aux commandes' }; continue; }
    const enfants0 = a.mesh.children.length;
    const avantCles = cles();
    const av0 = { ay: +a.pos.y.toFixed(2), py: +g.player.pos.y.toFixed(2), sommet: g.world.sommetColonne(Math.floor(a.pos.x), Math.floor(a.pos.z)) + 1, etat: g.player.avionEtat, vol: g.player.avionEnVol };
    bouton();
    const v1 = auVolant();
    const r = await releve(a, 40000);
    const phases = [...new Set(r.map((x) => x.ph).filter(Boolean))];
    const fin = r[r.length - 1];
    res[key] = { av0, phases, n: r.length, volantApres: v1 || r.some((x) => x.v),
      // le plus haut des pieds pendant la sortie (le seuil), puis à la fin
      dySortie: Math.max(-99, ...r.filter((x) => x.ph === 'sortie').map((x) => x.dy)),
      seuil: +a.mesh.userData.porte.y.toFixed(2), angMax: Math.max(...r.map((x) => x.ang)),
      accesPendant: r.some((x) => x.acces > enfants0), fin: { ...fin, enfants0 }, sol: sol(g.player.pos),
      dernier: g.fun.embarquementDernier ? g.fun.embarquementDernier() : null,
      clesNeuves: [...cles()].filter((k) => !avantCles.has(k)).length };
  }
  // un second appui en pleine descente pose au pied tout de suite, porte fermée, escalier rangé
  {
    const a = await auxCommandes('avionligne', x0 - 30, z0 - 6);
    const enfants0 = a ? a.mesh.children.length : -1;
    bouton(); await images(2);
    const ph = g.player.embarquement ? g.player.embarquement.phase : null;
    bouton(); await images(2);
    const porte = a.mesh.userData.porte, m = porte && a.mesh.userData.membres[porte.ouvrant];
    res.second = { avant: ph, apres: g.player.embarquement ? g.player.embarquement.phase : null, auVolant: auVolant(),
      ang: m ? Math.abs(m.rotation[porte.axe]) : 0, enfants: a.mesh.children.length, enfants0,
      lx: +a.mesh.worldToLocal(g.player.pos.clone()).x.toFixed(2), sol: sol(g.player.pos) };
  }
  // le Concorde n'a pas de porte : il descend d'un coup
  {
    const a = await auxCommandes('concorde', x0 - 30, z0 - 6);
    bouton(); await images(2);
    res.concorde = { porte: a && a.mesh.userData.porte, auVolant: auVolant(), ph: g.player.embarquement ? g.player.embarquement.phase : null };
  }
  // le pied de l'escalier dans l'eau : on cherche une colonne d'eau, et l'on
  // pose l'avion pour que le pied y tombe. L'enfant se pose ailleurs.
  {
    let eau = null;
    for (let r = 4; r < 400 && !eau; r += 4) {
      for (let k = 0; k < 24 && !eau; k++) {
        const x = Math.floor(x0 + r * Math.cos(k * Math.PI / 12)), z = Math.floor(z0 + r * Math.sin(k * Math.PI / 12));
        const h = g.world.sommetColonne(x, z);
        if (g.world.getBlock(x, h + 1, z) === 7 && g.world.getBlock(x - 6, g.world.sommetColonne(x - 6, z) + 1, z) !== 7) eau = { x: x + 0.5, z: z + 0.5 };
      }
    }
    if (!eau) res.eau = { err: 'pas d\'eau trouvée' };
    else {
      const a0 = await auxCommandes('avionligne', eau.x, eau.z);
      // où tombe le pied, posé ainsi ? on décale l'avion pour l'y mettre
      const pied = a0.mesh.localToWorld(new THREE.Vector3(a0.mesh.userData.porte.x - 0.85 - 1.7 * a0.mesh.userData.porte.y, 0, a0.mesh.userData.porte.z));
      const a = await auxCommandes('avionligne', eau.x + (a0.pos.x - pied.x), eau.z + (a0.pos.z - pied.z));
      const p2 = a.mesh.localToWorld(new THREE.Vector3(a.mesh.userData.porte.x - 0.85 - 1.7 * a.mesh.userData.porte.y, 0, a.mesh.userData.porte.z));
      bouton();
      const r = await releve(a, 20000);
      res.eau = { piedSurEau: g.world.getBlock(Math.floor(p2.x), g.world.sommetColonne(Math.floor(p2.x), Math.floor(p2.z)) + 1, Math.floor(p2.z)) === 7,
        phases: [...new Set(r.map((x) => x.ph).filter(Boolean))], sol: sol(g.player.pos),
        dernier: g.fun.embarquementDernier ? g.fun.embarquementDernier() : null };
    }
  }
  await finir(); vider();
  g.player.pilote = null; g.player.avionEtat = undefined; g.player.avionEnVol = undefined; g.player.flying = false;
  res.clesNeuves = [...cles()].filter((k) => !avant.has(k)).length;
  res.blocs = g.world.edits.size - blocs;
  return res;
}

function juger(r, verifier) {
  const ok = (k, ouv) => r[k] && !r[k].err && ['ouverture', 'sortie', 'descente', 'fermeture'].every((p) => r[k].phases.includes(p))
    && !r[k].volantApres && r[k].dySortie > r[k].seuil - 0.3 && r[k].angMax > ouv
    && r[k].accesPendant && r[k].fin.acces === r[k].fin.enfants0 && r[k].fin.ang < 0.02 && r[k].fin.lx < -1
    && !r[k].sol.eau && r[k].sol.libre;
  verifier('on descend d\'un avion par son escalier, et du chasseur par son échelle — plus aux commandes dès le premier appui',
    ok('avionligne', 1.2) && ok('chasseur', 0.6), JSON.stringify({ avionligne: r.avionligne, chasseur: r.chasseur }));
  verifier('un second appui en pleine descente pose au pied des marches, porte fermée, escalier rangé ; le Concorde (sans porte) descend d\'un coup',
    r.second && r.second.avant === 'ouverture' && !r.second.apres && !r.second.auVolant && r.second.ang < 0.02 && r.second.enfants === r.second.enfants0
      && r.second.lx < -1 && !r.second.sol.eau && r.concorde && !r.concorde.auVolant && !r.concorde.ph,
    JSON.stringify({ second: r.second, concorde: r.concorde }));
  verifier('le pied de l\'escalier dans l\'eau : l\'enfant se pose ailleurs, jamais dans l\'eau ni dans un mur',
    r.eau && !r.eau.err && r.eau.piedSurEau && !r.eau.sol.eau && r.eau.sol.libre && r.eau.dernier && r.eau.dernier.sens === 'descendre'
      && r.eau.dernier.refus && /eau/.test(r.eau.dernier.refus.escalier || ''),
    JSON.stringify(r.eau));
  verifier('descendre d\'un avion ne compile aucun programme et n\'écrit aucun bloc',
    r.clesNeuves === 0 && r.blocs === 0, JSON.stringify({ cles: r.clesNeuves, blocs: r.blocs }));
}
module.exports = { passage, juger };

if (require.main === module) {
  (async () => {
    const banc = new Banc();
    await banc.ouvrir();
    try {
      const emb = await banc.jouerSeul('SondeDescAvion', { embarq: 1 });
      await emb.evaluate(async () => {
        const g = window.__game;
        const x = -600.5, z = -520.5;
        g.player.pos.set(x, g.world.terrainHeight(x, z) + 1, z); g.player.vel.set(0, 0, 0);
        await new Promise((r) => setTimeout(r, 4000));
      });
      const r = await emb.evaluate(passage);
      juger(r, verifier);
      console.log('erreurs', JSON.stringify(emb.erreurs));
    } catch (e) { console.log('ERREUR', e.message); }
    await banc.fermer();
    process.exit(0);
  })();
}
