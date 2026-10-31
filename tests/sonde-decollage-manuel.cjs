// LE DÉCOLLAGE À LA MAIN ET L'ALTIMÈTRE — le passage que lit `monte.js` (une
// copie de sonde finit par diverger du témoin, v400). Lancée seule, elle
// imprime ce qu'elle a mesuré.
//
// Max : « j'aimerais qu'on voie l'altitude quand on pilote un avion. Et aussi,
// j'aimerais être capable de faire un décollage manuel en allant simplement
// suffisamment vite […] et bien entendu en mettant le joystick vers le haut. »
//
// Sur une dalle de pierre à l'écart (le couloir de la v237), aux commandes de
// l'avion de ligne, SANS jamais toucher ✈️ : manette à fond et joystick vers
// le haut DÈS LE DÉPART. On relève, image par image, la hauteur et l'état :
//   - tant que la vitesse est sous la rotation de la fiche, l'appareil doit
//     rester AU SOL (joystick vers le haut trop tôt : rien ne décolle) ;
//   - passé la rotation, il doit voler, au-dessus de huit blocs.
// Et l'altimètre se lit dans son TEXTE (#alt-val), au sol puis en l'air,
// jamais dans une variable.
//
// Sur l'ancien code, la manette au sol ne demandait que l'allure de roulage
// (six blocs par seconde) : l'appareil roule et ne décolle jamais, et il n'y
// a pas d'altimètre.
const passage = (page) => page.evaluate(async () => {
  const g = window.__game, P = g.player;
  const { BLOCK } = await import('./src/blocks.js');
  const tenir = (n) => new Promise((f) => { let c = 0, p = performance.now(); const s = (t) => { c += Math.min(0.05, (t - p) / 1000); p = t; if (c >= n) f(); else requestAnimationFrame(s); }; requestAnimationFrame(s); });
  const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
  // SE PLACER, C'EST D'ABORD FAIRE LE VIDE (v284) : on descend, on retire les
  // bêtes, PUIS on invoque.
  for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
  for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
  g.animalManager.animals.length = 0;
  P.keys.clear(); P.touchMove.f = 0; P.touchMove.s = 0; P.gaz = null;
  P.pilote = null; P.avionEnVol = false; P.avionEtat = undefined; P.flying = false;
  const x0 = 30000, z0 = 31200, L = 320, W = 20;
  let y0 = 0;
  for (let d = -6; d <= L; d += 4) for (let w = -W; w <= W; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w), 30);
  y0 += 2;
  const dalle = [];
  for (let d = -6; d <= L; d++) for (let w = -W; w <= W; w++) {
    g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE); dalle.push([x0 + d, y0, z0 + w]);
    for (let h = 1; h <= 8; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) { g.world.setBlock(x0 + d, y0 + h, z0 + w, 0); dalle.push([x0 + d, y0 + h, z0 + w]); }
  }
  const sauve = P.pos.clone(), yaw0 = P.yaw;
  const ranger = async () => {
    P.touchMove.f = 0; P.touchMove.s = 0; P.gaz = null;
    P.pos.set(x0 + 20, y0 + 1.01, z0 + 0.5); P.vel.set(0, 0, 0);
    P.avionEtat = 'sol'; P.avionEnVol = false; P.vitesseAvion = 0;
    await tenir(0.3);
    for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
    for (const [x, y, z] of dalle) g.world.setBlock(x, y, z, 0);
    P.pos.copy(sauve); P.yaw = yaw0; P.vel.set(0, 0, 0); P.flying = false; P.avionEtat = undefined;
  };
  P.yaw = -Math.PI / 2; P.pitch = 0;          // le nez vers +x, le long de la dalle
  P.pos.set(x0, y0 + 1.01, z0 + 0.5); P.vel.set(0, 0, 0);
  await tenir(0.8);
  g.animalManager.invoquer('avionligne', x0 + 3, z0);
  await tenir(0.6);
  for (let e = 0; e < 8 && !P.pilote; e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
  if (!P.pilote) { await ranger(); return { err: 'pas aux commandes' }; }
  const fiche = P.pilote, rotation = fiche.rotation || fiche.decrochage * 1.4;
  P.pos.set(x0, y0 + 1.01, z0 + 0.5); P.vel.set(0, 0, 0); P.yaw = -Math.PI / 2;
  await tenir(0.6);
  // Sur une page de bureau, l'interface tactile est masquée : on la montre le
  // temps de lire, comme le témoin des boutons à bord (v507).
  const tu = document.getElementById('touch-ui'), tuAvant = tu ? tu.style.display : '';
  if (tu && getComputedStyle(tu).display === 'none') tu.style.display = 'block';
  const lireAlt = () => { const e = document.getElementById('alt-val'); if (!e) return null; const s = getComputedStyle(e); return { texte: e.textContent, visible: s.display !== 'none' && e.getBoundingClientRect().height > 0 }; };
  const altSol = lireAlt();
  // ✈️ n'est jamais touché : manette à fond, joystick vers le HAUT d'emblée.
  P.gaz = 1; P.touchMove.f = 1; P.touchMove.s = 0;
  let t = 0, avantRotation = { releves: 0, hautMax: 0, etats: new Set() }, envol = null, vMax = 0, enVol = null;
  while (t < 20) {
    await tenir(0.1); t += 0.1;
    const v = P.vitesseAvion || 0, y = P.pos.y - (y0 + 1);
    vMax = Math.max(vMax, v);
    if (v < rotation - 0.5 && !envol) {
      avantRotation.releves++; avantRotation.hautMax = Math.max(avantRotation.hautMax, y); avantRotation.etats.add(P.avionEtat);
    }
    if (!envol && P.avionEtat === 'vol') envol = { t: +t.toFixed(1), v: +v.toFixed(1), y: +y.toFixed(2), train: +(P.trainSorti ?? 1).toFixed(2) };
    if (envol && y > 12) { enVol = { t: +t.toFixed(1), y: +y.toFixed(1), etat: P.avionEtat, train: +(P.trainSorti ?? 1).toFixed(2) }; break; }
  }
  // l'altimètre en l'air : on se tient, joystick lâché, puis on lit le texte
  P.touchMove.f = 0;
  await tenir(0.4);
  const hautReelle = P.hauteurAuSol ? P.hauteurAuSol() : P.pos.y - (y0 + 1);
  const altVol = lireAlt();
  const etatFin = P.avionEtat;
  if (tu) tu.style.display = tuAvant;
  await ranger();
  return {
    rotation, vMax: +vMax.toFixed(1), duree: +t.toFixed(1),
    avantRotation: { releves: avantRotation.releves, hautMax: +avantRotation.hautMax.toFixed(2), etats: [...avantRotation.etats] },
    envol, enVol, etatFin, altSol, altVol, hautReelle: +hautReelle.toFixed(1),
  };
});

// LE JUGEMENT, partagé avec monte.js. Le nombre de l'altimètre se lit dans son
// texte (« ↑ 35 m ») ; en l'air il doit dire la hauteur, à cinq mètres près
// (l'arrondi) et un relevé de plus (l'appareil bouge entre deux lectures).
const nombreAlt = (a) => { const m = a && /(-?\d+)\s*m/.exec(a.texte || ''); return m ? +m[1] : null; };
const juger = (r) => ({
  resteAuSol: !r.err && r.avantRotation.releves >= 5 && r.avantRotation.hautMax < 0.5
    && r.avantRotation.etats.every((e) => e === 'sol'),
  decolle: !r.err && !!r.envol && !!r.enVol && r.enVol.y > 8 && r.envol.v >= r.rotation - 1
    && (r.etatFin === 'vol'),
  altimetre: !r.err && !!r.altSol && r.altSol.visible && nombreAlt(r.altSol) === 0
    && !!r.altVol && r.altVol.visible && nombreAlt(r.altVol) != null && nombreAlt(r.altVol) >= 8
    && Math.abs(nombreAlt(r.altVol) - r.hautReelle) <= 6,
  nombreAlt,
});
module.exports = { passage, juger, nombreAlt };

if (require.main === module) {
  const { Banc, souffler } = require('./banc.js');
  (async () => {
    const banc = new Banc({ portJeu: 8396, portPairs: 9396 });
    await banc.ouvrir();
    try {
      await souffler();
      const page = await banc.jouerSeul('SondeDecollageManuel', { rr: 3 });
      const r = await passage(page);
      console.log(JSON.stringify(r));
      const j = juger(r);
      console.log(JSON.stringify({ resteAuSol: j.resteAuSol, decolle: j.decolle, altimetre: j.altimetre }));
    } catch (e) { console.log('ÉCHEC', e.message); }
    finally { await banc.fermer(); process.exit(0); }
  })();
}
