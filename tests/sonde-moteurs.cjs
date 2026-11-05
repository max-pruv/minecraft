// UN MOTEUR PAR MODÈLE, ET UNE FLAMME SEULEMENT AVEC LA RÉCHAUFFE (v587).
//
// Max : « il y a des avions normaux qui ne crachent pas de feu », et « il y a
// des voitures qui font des bruits beaucoup plus sportifs… idem pour les
// avions ». Le passage que lit `monte.js` (une copie de sonde finit par
// diverger du témoin, v400) ; lancée seule, elle imprime.
//
// LE TRAJET DE L'ENFANT : chaque véhicule est INVOQUÉ avec son modèle (le vœu
// que la rue, un garage ou un ami passent — `flotte`, `variante`), posé sur une
// dalle, et l'on y MONTE par le bouton. Puis la physique est suspendue
// (`player.update`) et l'on pose la vitesse ou la manette : la voiture « roule »
// sur place, l'avion pousse sur place, et ce sont `fun.js` et `sensations.js`
// qui règlent le son à chaque image, comme en jeu. La radio est coupée (elle
// remplirait la bande grave de mélodie).
//
// UN TÉMOIN DE SON LIT LA SORTIE DANS DES BANDES (v268, v543), jamais un
// drapeau : un analyseur accroché à `sortieAudio()`, sans lissage
// (`smoothingTimeConstant` à 0 : sinon le spectre est une mémoire), la
// puissance moyenne de chaque bande sur une seconde et demie de relevés.
//   grave   40–320 Hz   les cylindres, le rugissement d'une postcombustion
//   aigu  1 500–6 000   un sifflement : soufflante, turbo, onduleur
// et le CENTROÏDE de 30 à 1 500 Hz, qui dit si un moteur gronde ou hurle, et
// celui de 800 à 8 000 Hz, qui dit à quelle hauteur siffle une soufflante.
const path = require('path');

const mesurerMoteurs = (page) => page.evaluate(async () => {
  const g = window.__game;
  if (!window.__sons) return { err: 'pas de module de son' };
  const S = await import('./src/sons.js');
  const av = await import('./src/avions.js');
  const { BLOCK } = await import('./src/blocks.js');
  if (av.chargerAvionsDeposes) await av.chargerAvionsDeposes();
  const tenir = (n) => new Promise((fin) => {
    let c = 0, p = performance.now();
    const pas = (t) => { c += Math.min(0.05, Math.max(0, (t - p) / 1000)); p = t; if (c >= n) fin(); else requestAnimationFrame(pas); };
    requestAnimationFrame(pas);
  });
  const ctx = S.contexteAudio(), sortie = S.sortieAudio();
  if (!ctx || !sortie) return { err: 'pas de contexte audio' };
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
  const an = ctx.createAnalyser();
  an.fftSize = 4096; an.smoothingTimeConstant = 0;
  sortie.connect(an);
  const spec = new Float32Array(an.frequencyBinCount), hz = ctx.sampleRate / an.fftSize;
  const ecouter = async (secondes) => {
    const acc = new Float64Array(spec.length);
    let n = 0;
    for (let t = 0; t < secondes; t += 0.1) {
      an.getFloatFrequencyData(spec);
      for (let i = 0; i < spec.length; i++) acc[i] += Math.pow(10, spec[i] / 10);
      n++;
      await new Promise((r) => setTimeout(r, 100));
    }
    const bande = (a, b) => { let s = 0; for (let i = Math.ceil(a / hz); i <= Math.floor(b / hz); i++) s += acc[i] / n; return s; };
    const centre = (a, b) => {
      let num = 0, den = 0;
      for (let i = Math.ceil(a / hz); i <= Math.floor(b / hz); i++) { num += i * hz * acc[i]; den += acc[i]; }
      return Math.round(den > 0 ? num / den : 0);
    };
    const db = (x) => +(10 * Math.log10(x + 1e-20)).toFixed(1);
    return { grave: db(bande(40, 320)), aigu: db(bande(1500, 6000)), centroide: centre(30, 1500), centroideHaut: centre(800, 8000) };
  };
  // une dalle de pierre à l'écart, comme les témoins de vol
  const x0 = 30000, z0 = 32200;
  let y0 = 0;
  for (let d = -8; d <= 30; d += 2) for (let w = -6; w <= 6; w += 2) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
  y0 = Math.max(y0 + 2, 33);
  const dalle = [];
  for (let d = -8; d <= 30; d++) for (let w = -6; w <= 6; w++) {
    g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE); dalle.push([x0 + d, y0, z0 + w]);
    for (let h = 1; h <= 6; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) { g.world.setBlock(x0 + d, y0 + h, z0 + w, 0); dalle.push([x0 + d, y0 + h, z0 + w]); }
  }
  const P = g.player;
  const sauve = P.pos.clone(), yaw0 = P.yaw;
  const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
  const bouton = () => document.getElementById('ride-btn').click();
  const update0 = P.update;
  const descendre = async () => {
    P.update = update0;
    for (let e = 0; e < 6 && auVolant(); e++) { bouton(); await tenir(0.5); }
    for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
    g.animalManager.animals.length = 0;
    P.pilote = null; P.avionEnVol = false; P.avionEtat = undefined; P.vitesseAvion = undefined; P.gaz = null;
    P.vitesseVoiture = 0; P.flying = false;
  };
  // monter dans `espece` tirée avec le vœu `voeu`, puis régler (et écouter)
  const essai = async (espece, voeu, regler) => {
    await descendre();
    P.keys.clear();
    P.yaw = -Math.PI / 2; P.pitch = 0;
    P.pos.set(x0, y0 + 1.01, z0 + 0.5); P.vel.set(0, 0, 0);
    await tenir(0.4);
    const a = g.animalManager.invoquer(espece, x0 + 3, z0, false, voeu);
    if (!a) return { err: 'rien posé ' + espece };
    a.mesh.position.copy(a.pos);
    await tenir(0.5);
    for (let e = 0; e < 8 && !auVolant(); e++) { bouton(); await tenir(0.5); }
    if (!auVolant()) return { err: 'pas monté ' + espece };
    S.radioCoupe();
    P.update = () => {};          // la physique s'arrête : on règle à la main
    const out = await regler(a);
    out.son = S.etatSon().caractere;
    out.modele = a.mesh.userData.flotte || a.mesh.userData.variante || null;
    return out;
  };
  const res = {};
  // LES VOITURES : la même allure pour toutes (55 % de la pointe de sa classe)
  for (const [nom, flotte] of [['electrique', 'lucid-gravity.glb'], ['v8', 'chevrolet-camaro-ss-1967.glb'],
    ['v12', 'aston-martin-victor.glb'], ['citadine', 'generique-citadine.glb']]) {
    res[nom] = await essai('voiture', { flotte }, async () => {
      P.vitesseVoiture = 0.55 * (P.vitesseVoitureMax || 20);
      await tenir(1.2);
      return ecouter(1.5);
    });
  }
  // LES PASSAGES DE RAPPORT : une sportive qui accélère de l'arrêt à la pointe
  res.passages = await essai('voiture', { flotte: 'aston-martin-victor.glb' }, async () => {
    const vmax = P.vitesseVoitureMax || 20;
    for (let i = 0; i <= 40; i++) { P.vitesseVoiture = vmax * i / 40; await tenir(0.08); }
    return { passages: S.etatSon().passages };
  });
  // LES AVIONS : pleins gaz au sol, physique suspendue — et la flamme
  const lireFlammes = (a) => (a.mesh.userData.tuyeres || []).map((f) => ({ visible: f.visible, long: +f.scale.z.toFixed(2) }));
  for (const [nom, espece, variante] of [['ligne', 'avionligne', 'a320'], ['affaires', 'avionligne', 'jet'],
    ['chasseur', 'chasseur', 'f35'], ['concorde', 'concorde', null]]) {
    res[nom] = await essai(espece, variante ? { variante } : null, async (a) => {
      P.gaz = 0.5; await tenir(0.6);
      const mi = lireFlammes(a);
      P.gaz = 1; await tenir(1.2);
      const pleins = lireFlammes(a);
      const ecoute = await ecouter(1.5);
      return { ...ecoute, flammes: { tuyeres: (a.mesh.userData.tuyeres || []).length, mi, pleins } };
    });
  }
  // les flammes, modèle par modèle, sans page à monter (les fabriques)
  const m = await import('./src/montures.js');
  res.fabriques = {};
  for (const [nom, k, v] of [['a320', 'avionligne', 'a320'], ['a321', 'avionligne', 'a321'], ['jet', 'avionligne', 'jet'],
    ['f35', 'chasseur', 'f35'], ['concorde', 'concorde', null]]) {
    const mesh = m.MODELES_MONTURE[k](v ? { variante: v } : undefined);
    res.fabriques[nom] = (mesh.userData.tuyeres || []).length;
  }
  await descendre();
  try { sortie.disconnect(an); } catch { /* déjà */ }
  for (const [x, y, z] of dalle) g.world.setBlock(x, y, z, 0);
  P.pos.copy(sauve); P.yaw = yaw0; P.vel.set(0, 0, 0);
  return res;
});

// LES VERDICTS, lus par `monte.js` et par la sonde seule. Les barres sont des
// écarts entre MODÈLES, jamais des niveaux absolus : un banc sans haut-parleur
// rend des niveaux arbitraires, mais deux recettes identiques rendent le même
// spectre (l'ancien code : un seul moteur de voiture, un seul de réacteur).
const juger = (r) => {
  const ok = (o) => o && !o.err;
  const v = {};
  // une électrique : 12 dB de moins dans le grave qu'un V8, et un sifflement
  // plus fort que son grave, là où le V8 a l'inverse
  v.electrique = ok(r.electrique) && ok(r.v8) && r.electrique.grave < r.v8.grave - 12
    && (r.electrique.aigu - r.electrique.grave) > (r.v8.aigu - r.v8.grave) + 12;
  // un V12 hurle, un V8 gronde : le centroïde du V12 au moins 1,5 fois plus haut
  v.v12 = ok(r.v12) && ok(r.v8) && r.v12.centroide > 1.5 * r.v8.centroide;
  v.passages = ok(r.passages) && r.passages.passages >= 2;
  // un chasseur rugit dans le grave à pleins gaz, un avion de ligne siffle :
  // l'écart grave − aigu du chasseur dépasse celui de l'avion de ligne de 8 dB
  v.chasseur = ok(r.chasseur) && ok(r.ligne) && (r.chasseur.grave - r.chasseur.aigu) > (r.ligne.grave - r.ligne.aigu) + 8;
  // un jet d'affaires est plus léger et plus aigu qu'un A320
  v.affaires = ok(r.affaires) && ok(r.ligne) && r.affaires.centroideHaut > 1.3 * r.ligne.centroideHaut;
  // LES FLAMMES : aucune sur un avion de ligne ni un jet, une par tuyère sur un
  // appareil à réchauffe — éteinte à mi-gaz, allumée pleins gaz
  const f = r.fabriques || {};
  v.fabriques = f.a320 === 0 && f.a321 === 0 && f.jet === 0 && f.f35 >= 1 && f.concorde === 4;
  const fl = (o) => o && o.flammes;
  v.flammes = ok(r.ligne) && fl(r.ligne).tuyeres === 0 && ok(r.affaires) && fl(r.affaires).tuyeres === 0
    && ok(r.chasseur) && fl(r.chasseur).tuyeres >= 1 && fl(r.chasseur).mi.every((x) => !x.visible)
    && fl(r.chasseur).pleins.every((x) => x.visible && x.long > 0.5)
    && ok(r.concorde) && fl(r.concorde).pleins.length === 4 && fl(r.concorde).pleins.every((x) => x.visible);
  return v;
};

module.exports = { mesurerMoteurs, juger };

if (require.main === module) {
  const { Banc, souffler } = require(path.join(process.argv[2] || __dirname, 'banc.js'));
  (async () => {
    const banc = new Banc({ portJeu: 8351, portPairs: 9351 });
    await banc.ouvrir();
    await souffler();
    const p = await banc.jouerSeul('Moteur' + Date.now() % 1000, { pret: true });
    const r = await mesurerMoteurs(p);
    console.log(JSON.stringify(r, null, 1));
    console.log(JSON.stringify(juger(r)));
    await banc.fermer();
    process.exit(0);
  })().catch((e) => { console.error(e); process.exit(1); });
}
