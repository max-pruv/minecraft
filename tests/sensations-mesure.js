// LA MESURE DES SENSATIONS AU VOLANT (v401), partagée par le témoin de
// `monte.js` et la sonde `sonde-sensations.cjs` : une seule fonction, évaluée
// DANS la page, pour que la sonde et le témoin mesurent la même chose (deux
// copies d'une mesure finissent par diverger, v320).
//
// ON SE PLACE SOI-MÊME (v279, v284) : une plate-forme de pierre posée dans le
// ciel, loin de tout (rien au-dessus, rien autour), les bêtes retirées, une
// voiture invoquée, montée PAR LE BOUTON comme l'enfant. Puis cinq épreuves :
//   1. pleins gaz en ligne droite — le champ s'ouvre, la caméra recule ;
//   2. virage tenu à gauche — la caisse penche (matrice monde), les roues
//      avant braquent (matrice monde) ;
//   3. une dérive posée à la main (le champ du contrat) — les pneus crissent
//      (énergie autour de trois kilohertz, lue sur la SORTIE du jeu) ;
//   4. un choc posé à la main — la caméra tremble, un pic sonore ;
//   5. un mur collé au pare-chocs arrière — aucun bloc entre la voiture et la
//      caméra.
// Chaque épreuve attend son RÉSULTAT, bornée, et rend ses chiffres : un rouge
// doit pouvoir se démonter (v270).
async function mesurerSensations() {
  const g = window.__game;
  const { BLOCK } = await import('./src/blocks.js');
  const THREE = await import('three');
  const tenir = (n) => new Promise((fin) => {
    let cumul = 0, prec = performance.now();
    const pas = (t) => { cumul += (t - prec) / 1000; prec = t; if (cumul >= n) fin(); else requestAnimationFrame(pas); };
    requestAnimationFrame(pas);
  });
  const image = () => new Promise((f) => requestAnimationFrame(() => f()));
  const P = g.player, cam = P.camera;
  const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());

  // la plate-forme : une piste de 130 × 9 et une aire de 40 × 40 au bout
  const x0 = 30600, z0 = 30600, y0 = 120;
  const poser = (x, z) => { if (g.world.getBlock(x, y0, z) !== BLOCK.STONE) g.world.setBlock(x, y0, z, BLOCK.STONE); };
  for (let x = x0 - 6; x <= x0 + 130; x++) for (let z = z0 - 4; z <= z0 + 4; z++) poser(x, z);
  const ax = x0 + 150, az = z0;
  for (let x = ax - 20; x <= ax + 20; x++) for (let z = az - 20; z <= az + 20; z++) poser(x, z);

  P.keys.clear();
  for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
  P.pilote = null; P.avionEnVol = false; P.avionEtat = undefined; P.vitesseAvion = undefined;
  P.flying = false; P.gaz = null; P.pitch = 0;
  delete P.choc; delete P.derive;
  P.yaw = -Math.PI / 2;
  P.pos.set(x0, y0 + 1.01, z0 + 0.5); P.vel.set(0, 0, 0);
  for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
  g.animalManager.animals.length = 0;
  await tenir(0.6);
  const voiture = g.animalManager.invoquer('voiture', x0 + 3, z0);
  if (!voiture) return { err: 'aucune voiture posée' };
  await tenir(0.5);
  for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
  if (!auVolant()) return { err: 'on n\'est pas au volant' };
  const a = g.fun.montureConduite();
  const def = a.def.poursuite;
  // les roues arrivent avec le modèle de la flotte, chargé à part
  const t0 = performance.now();
  while (!(a.mesh.userData.roues && a.mesh.userData.roues.length >= 4) && performance.now() - t0 < 20000) await tenir(0.3);
  const roues = a.mesh.userData.roues ? a.mesh.userData.roues.length : 0;
  P.yaw = -Math.PI / 2; P.pos.set(x0, y0 + 1.01, z0 + 0.5);
  await tenir(1.0);
  const recul = () => Math.hypot(cam.position.x - P.pos.x, cam.position.z - P.pos.z);
  const repos = { fov: +cam.fov.toFixed(2), recul: +recul().toFixed(2) };

  // 1. PLEINS GAZ, EN LIGNE DROITE ---------------------------------------
  P.gaz = 1;
  let fovMax = cam.fov, reculMax = recul(), vMax = 0;
  const t1 = performance.now();
  while (performance.now() - t1 < 25000 && P.pos.x < x0 + 115) {
    await image();
    const v = Math.abs(P.vitesseVoiture || 0);
    vMax = Math.max(vMax, v);
    if (v > 4) { fovMax = Math.max(fovMax, cam.fov); reculMax = Math.max(reculMax, recul()); }
    if (fovMax > repos.fov + 6 && reculMax > def.recul + 1) break;
  }
  const ligne = { fovMax: +fovMax.toFixed(2), reculMax: +reculMax.toFixed(2), vMax: +vMax.toFixed(1),
    parcouru: +(P.pos.x - x0).toFixed(1), secondes: +((performance.now() - t1) / 1000).toFixed(1) };

  // 2. UN VIRAGE TENU À GAUCHE, sur l'aire ---------------------------------
  P.gaz = 0; P.keys.clear();
  P.pos.set(ax, y0 + 1.01, az + 8); P.vel.set(0, 0, 0); P.vitesseVoiture = 0;
  await tenir(0.6);
  P.gaz = 0.5; P.keys.add('KeyA');
  const penche = [], braque = [];
  const up = new THREE.Vector3(), q = new THREE.Quaternion(), axe = new THREE.Vector3();
  const t2 = performance.now();
  let yawAvant = P.yaw, tourne = 0;
  while (performance.now() - t2 < 20000 && penche.length < 40) {
    await image();
    let dy = P.yaw - yawAvant; yawAvant = P.yaw;
    while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    tourne += dy;
    if (Math.abs(P.vitesseVoiture || 0) < 3 || tourne < 0.4) continue;
    a.mesh.updateMatrixWorld(true);
    // la caisse : le haut de la voiture, dans le monde, contre sa GAUCHE
    a.mesh.getWorldQuaternion(q);
    up.set(0, 1, 0).applyQuaternion(q);
    const gx = -Math.cos(P.yaw), gz = Math.sin(P.yaw);
    penche.push(up.x * gx + up.z * gz);
    // la roue avant : l'axe de son essieu contre l'axe de la voiture, angle
    // signé autour de la verticale (positif = l'avant de la roue vers la gauche)
    const avant = (a.mesh.userData.roues || []).find((r) => /^Wheel_F/i.test(r.name || ''));
    if (avant && avant.parent) {
      avant.parent.getWorldQuaternion(q);
      axe.set(1, 0, 0).applyQuaternion(q); axe.y = 0; axe.normalize();
      const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);           // la droite de la voiture
      let ang = Math.atan2(rz * axe.x - rx * axe.z, rx * axe.x + rz * axe.z);
      if (ang > Math.PI / 2) ang -= Math.PI; if (ang <= -Math.PI / 2) ang += Math.PI;
      braque.push(ang);
    }
  }
  P.keys.clear(); P.gaz = 0;
  const med = (t) => { if (!t.length) return null; const s = [...t].sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(4); };
  const virage = { releves: penche.length, tourne: +tourne.toFixed(2),
    penche: med(penche), braque: med(braque), roues };

  // à l'arrêt pour la suite
  const t3 = performance.now();
  while (Math.abs(P.vitesseVoiture || 0) > 0.2 && performance.now() - t3 < 10000) await tenir(0.2);
  P.pos.set(ax, y0 + 1.01, az); P.vel.set(0, 0, 0); P.vitesseVoiture = 0; P.yaw = 0;
  await tenir(1.0);

  // le son : un analyseur sur la SORTIE du jeu (v268)
  const ctx = window.__sons && window.__sons.contexte();
  const sortie = window.__sons && window.__sons.sortie();
  let son = null;
  if (ctx && sortie) {
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    sortie.connect(an);
    const temps = new Float32Array(an.fftSize), freq = new Float32Array(an.frequencyBinCount);
    const hz = ctx.sampleRate / an.fftSize;
    const fenetre = async (secondes, f) => { const r = []; for (let t = 0; t < secondes; t += 0.05) { r.push(f()); await tenir(0.05); } return r; };
    const rms = () => { an.getFloatTimeDomainData(temps); let s = 0; for (const v of temps) s += v * v; return Math.sqrt(s / temps.length); };
    const bande = () => {
      an.getFloatFrequencyData(freq);
      let s = 0, n = 0;
      for (let i = Math.floor(2500 / hz); i <= Math.ceil(3400 / hz); i++) { s += Math.pow(10, freq[i] / 10); n++; }
      return s / n;
    };
    const moy = (t) => t.reduce((x, y) => x + y, 0) / t.length;
    // 3. LA DÉRIVE
    const bandeAvant = moy(await fenetre(1.2, bande));
    // LA DÉRIVE SE TIENT LE TEMPS DE LA FENÊTRE (v401) : depuis la v358 la
    // physique (conduite.js) RÉÉCRIT `derive` à chaque image — posée une
    // fois, elle retombait à zéro à l'image suivante, et le témoin écoutait
    // une voiture qui ne dérapait plus (rapport 1,07 au portail). Une
    // propriété qui rend 0,5 et ignore ce qu'on lui écrit ; la voiture est à
    // l'arrêt, la physique n'en tire aucun mouvement.
    Object.defineProperty(P, 'derive', { configurable: true, enumerable: true, get: () => 0.5, set: () => {} });
    await tenir(0.4);
    const bandeDerive = moy(await fenetre(1.2, bande));
    delete P.derive;
    P.derive = 0;
    await tenir(0.6);
    // 4. LE CHOC — le son. UNE LECTURE DE 0,74 s, PAS DES INSTANTANÉS : un
    // analyseur de 2 048 échantillons ne voit que 46 ms, et sur un banc à dix
    // images par seconde deux lectures sur trois tombaient à côté du coup —
    // mesuré : 0,27 un passage, 0,026 le suivant, sur le même code. On garde
    // le plus grand échantillon d'une fenêtre qui couvre tout l'événement.
    const long = ctx.createAnalyser();
    long.fftSize = 32768;
    sortie.connect(long);
    const ech = new Float32Array(long.fftSize);
    const pic = () => { long.getFloatTimeDomainData(ech); let m = 0; for (const v of ech) m = Math.max(m, Math.abs(v)); return m; };
    await tenir(0.8);
    const piqueAvant = Math.max(pic(), (await tenir(0.8), pic()));
    son = { bandeAvant, bandeDerive, piqueAvant };
    son.rapportCrisse = +(bandeDerive / Math.max(1e-12, bandeAvant)).toFixed(2);
    // ON LIT À CHAQUE IMAGE PENDANT 1,5 s, ET L'ON GARDE LE PLUS GRAND (v429) :
    // une seule lecture 0,45 s après le coup ratait le coup quand une image
    // traînait — la fenêtre ne couvre que 0,74 s — et rendait 0,06 contre
    // 0,07 au calme deux passages sur cinq, secousse pourtant vue.
    const picMax = async (s) => {
      let m = 0; const t0 = performance.now();
      while (performance.now() - t0 < s * 1000) { m = Math.max(m, pic()); await image(); }
      return m;
    };
    P.choc = { force: 0.8, t: performance.now() };
    son.piqueChoc = +(await picMax(1.5)).toFixed(4);
    son.piqueAvant = +son.piqueAvant.toFixed(4);
    // ET L'ATTERRISSAGE S'ENTEND (v429) : `player.atterrissage` est un
    // événement daté que la physique pose au retour au sol (v408). On attend
    // que le choc se taise — la fenêtre de l'analyseur couvre 0,74 s — puis
    // on pose l'événement comme la physique le ferait.
    await tenir(1.6);
    son.piqueAvantSol = +Math.max(pic(), (await tenir(0.8), pic())).toFixed(4);
    P.atterrissage = { force: 1, t: performance.now(), air: 0.6, hauteur: 2 };
    son.piqueSol = +(await picMax(1.5)).toFixed(4);
    try { sortie.disconnect(long); } catch { /* déjà */ }
    son.bandeAvant = +bandeAvant.toExponential(2); son.bandeDerive = +bandeDerive.toExponential(2);
    try { sortie.disconnect(an); } catch { /* déjà */ }
  }
  // 4. LE CHOC — la caméra
  // UNE FENÊTRE SE COMPTE EN IMAGES, PAS EN SECONDES (v401) : à deux images
  // par seconde, 0,8 s n'en contenait que DEUX — l'écart au centre valait la
  // moitié d'un pas, et le verdict (0,184 contre 3 × 0,062) était un tirage.
  // La secousse s'éteint en temps de JEU, donc huit images la voient toujours ;
  // et le calme se mesure voiture ARRÊTÉE, sinon il mesure la poursuite.
  P.keys.clear(); P.gaz = 0; P.vel.set(0, 0, 0); P.vitesseVoiture = 0;
  await tenir(0.8);
  const ecartCam = async (images) => {
    const pts = [];
    for (let i = 0; i < images; i++) { await image(); pts.push(cam.position.clone()); }
    const m = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
    return { n: pts.length, max: +Math.max(...pts.map((p) => p.distanceTo(m))).toFixed(3) };
  };
  // ET LE CALME S'ATTEND (v401) : la caméra revient de son recul de vitesse
  // (7,4 → 6,4 blocs) en douceur, et 0,8 s ne suffisait pas sous la charge
  // du portail — calme 0,081 pour 0,018 seul, et la secousse (0,235) tombait
  // sous trois fois ce reste. On attend un FAIT DU MONDE — la caméra posée,
  // quatre images à moins de 0,03 bloc — jamais le verdict, borné à huit
  // secondes, et la durée entre dans le message.
  const t0Calme = performance.now();
  while (performance.now() - t0Calme < 8000) {
    const e = await ecartCam(4);
    if (e.max < 0.03) break;
  }
  const calme = await ecartCam(8);
  calme.attente = Math.round(performance.now() - t0Calme);
  P.choc = { force: 0.8, t: performance.now() + 1 };
  const secoue = await ecartCam(8);
  delete P.choc;

  // 5. LE MUR COLLÉ AU PARE-CHOCS ARRIÈRE ------------------------------------
  // cap 0 : l'avant vers −z, l'arrière vers +z ; un mur plein de la cellule
  // k à k + 1, soit de 2,2 à 3,2 blocs derrière le centre — derrière le
  // pare-chocs, avant le premier point que l'ancienne recherche regardait.
  const zx = Math.floor(ax) + 0.5, k = Math.floor(az) + 6;
  P.yaw = 0; P.pos.set(zx, y0 + 1.01, k - 2.2); P.vel.set(0, 0, 0); P.vitesseVoiture = 0;
  for (let x = Math.floor(zx) - 5; x <= Math.floor(zx) + 5; x++) for (let y = y0 + 1; y <= y0 + 9; y++) g.world.setBlock(x, y, k, BLOCK.STONE);
  await tenir(1.2);
  const libre = (A, B) => {
    const n = Math.ceil(A.distanceTo(B) / 0.05);
    for (let i = 0; i <= n; i++) {
      const p = A.clone().lerp(B, i / n);
      if (g.world.isSolid(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))) return false;
    }
    return true;
  };
  const toit = new THREE.Vector3(P.pos.x, P.pos.y + 1.4, P.pos.z);
  const mur = { libre: libre(toit, cam.position.clone()), recul: +recul().toFixed(2),
    camZ: +cam.position.z.toFixed(2), murZ: k, hauteur: +(cam.position.y - P.pos.y).toFixed(2) };
  for (let x = Math.floor(zx) - 5; x <= Math.floor(zx) + 5; x++) for (let y = y0 + 1; y <= y0 + 9; y++) g.world.setBlock(x, y, k, 0);

  // 6. LA PENTE (v429) ---------------------------------------------------------
  // La physique publie `player.tangage` (v408, nez en haut positif) et le
  // réécrit à chaque image : on le FIGE (v358 : un témoin qui pose un champ
  // que la physique réécrit doit le figer), voiture arrêtée sur le plat, et
  // l'on lit dans la MATRICE MONDE la hauteur du nez contre celle de la
  // queue — deux blocs devant et derrière le centre, le nez en −z.
  P.yaw = 0; P.pos.set(ax, y0 + 1.01, az); P.vel.set(0, 0, 0); P.vitesseVoiture = 0;
  const nezMoinsQueue = () => {
    a.mesh.updateMatrixWorld(true);
    const n = new THREE.Vector3(0, 0, -2).applyMatrix4(a.mesh.matrixWorld);
    const q = new THREE.Vector3(0, 0, 2).applyMatrix4(a.mesh.matrixWorld);
    return +(n.y - q.y).toFixed(3);
  };
  const figer = (v) => Object.defineProperty(P, 'tangage', { configurable: true, get: () => v, set: () => {} });
  figer(0); await tenir(1.0);
  const plat = nezMoinsQueue();
  figer(0.3); await tenir(1.0);
  const cote = nezMoinsQueue();
  delete P.tangage; P.tangage = 0;
  const pente = { plat, cote };

  for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(0.4); }
  await tenir(0.8);
  const aPied = { fov: +cam.fov.toFixed(2), penche: +a.mesh.rotation.z.toFixed(4) };
  return { modele: a.mesh.userData.flotte, def, repos, ligne, virage, son, calme, secoue, mur, pente, aPied };
}

if (typeof module !== 'undefined') module.exports = { mesurerSensations };
