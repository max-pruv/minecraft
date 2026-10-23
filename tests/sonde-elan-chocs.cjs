// L'ÉLAN APRÈS UN CHOC (v532). Max : « Quand on fonce dans une voiture avec une
// autre voiture, la voiture s'arrête immédiatement alors qu'elle aurait été
// propulsée sur quelques mètres. Idem sur d'autres types d'objets. »
//
// Le VRAI joueur (player.js, three prêté par un crochet de module), sous node,
// sur une dalle plate, une hypercar lancée à 15, 30 et 50 blocs/s contre :
//   · un mur de face, un mur pris à 30° ;
//   · une voiture garée (une monture : `voitureContre` la rend avec `pousser`
//     quand le jeu sait la pousser) ;
//   · une voiture de la rue arrêtée, et une qui traverse à 10 blocs/s (on ne
//     la pousse jamais : horloge partagée, v305) ;
//   · un réverbère (la famille « mobilier »).
// Les crochets `obstacleVehicule` et `voitureContre` imitent ceux de main.js :
// une boîte qui entre (pas si l'on est déjà dedans), sa boîte et son allure.
// On tient le joystick en avant jusqu'au premier choc, puis deux bras : on le
// LÂCHE (ce que montre la sonde : ce que fait le choc lui-même) ou on le
// TIENT (ce que fait un enfant de sept ans). Ce qu'on relève, image par
// image après le contact : les images jusqu'à l'arrêt, le chemin parcouru, la
// vitesse juste après, le nombre de chocs publiés et leur force, et — pour la
// voiture garée — le chemin de la voiture poussée.
// Exporte `mesurer(racine)` pour plafond.js ; lancé seul, imprime la table :
//   node tests/sonde-elan-chocs.cjs [racine du dépôt]
const path = require('path');
const { pathToFileURL } = require('url');
async function mesurer(racine) {
  const { register } = require('node:module');
  const trois = pathToFileURL(path.resolve(racine, 'vendor/three.module.min.js')).href;
  register('data:text/javascript,' + encodeURIComponent(
    `export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
  const u = (f) => pathToFileURL(path.resolve(racine, 'src', f)).href;
  const { Player } = await import(u('player.js'));
  const { BLOCK } = await import(u('blocks.js'));
  const C = await import(u('conduite.js'));
  const cam = { position: { copy() {} }, rotation: { set() {} } };
  const DT = 1 / 60;
  const MUR = 40;
  // les boîtes se recouvrent-elles ? (séparation d'axes, conduite.js)
  const touche = (A, B) => !!C.normaleEntreBoites(A, B);
  const boite = (x, z, cap, a = 2.2, b = 1.13) => C.boiteVoiture(x, z, cap, a, b);

  function essai(cas, v, lache) {
    const sol = (y) => y < 30;
    let mur = () => false;
    let obstacle = null;           // { boite(t), v(t), poussable, mobilier }
    let t = 0;
    const cap0 = Math.PI / 2;      // le nez vers +x
    if (cas === 'mur' || cas === 'murPieton') mur = (x) => x >= MUR;
    if (cas === 'mur30') {
      // un mur oblique : le demi-plan au-delà de la droite qui fait 30° avec
      // la route (on y arrive en biais) ; posé en cubes, comme le monde
      const a = 30 * Math.PI / 180, nx = -Math.sin(a), nz = Math.cos(a);   // normale vers la voiture
      mur = (x, z) => (x + 0.5 - MUR) * -nx + (z + 0.5) * -nz >= 0;
    }
    const xg = MUR + 6;            // la voiture garée / de la rue / le réverbère
    if (cas === 'garee') obstacle = { x: xg, z: 0, cap: cap0, v: 0, poussable: true, vx: 0, vz: 0, chemin: 0 };
    if (cas === 'rue') obstacle = { x: xg, z: 0, cap: cap0, v: 0, poussable: false };
    if (cas === 'traverse') {
      // elle roule vers +z à 10 blocs/s et passe sur notre route quand on y arrive
      const tc = Math.max(0, (xg - 1.13 - 2.2 - (MUR - 12)) / v);
      obstacle = { x: xg, z: -10 * tc, cap: 0, v: 10, poussable: false, roule: true };
    }
    if (cas === 'enFace') {
      // elle arrive de face à 10 blocs/s sur notre voie, et s'arrête quand on
      // la percute (`heurter`, vehicules.js, v372)
      obstacle = { x: xg + 10, z: 0, cap: -cap0, v: 10, poussable: false, roule: true, axe: -1, stoppe: true };
    }
    if (cas === 'mobilier') obstacle = { x: xg, z: 0, mobilier: true };
    const monde = {
      getBlock: (x, y, z) => (sol(y) ? BLOCK.STONE : y > 45 ? BLOCK.AIR : mur(x, z) ? BLOCK.STONE : BLOCK.AIR),
    };
    const p = new Player(cam, monde);
    p.gabarit = 2.26; p.boost = C.CLASSES.hypercar.vmax / C.MARCHE;
    p.pos.set(MUR - 12, 30, 0); p.onGround = true;
    p.yaw = -cap0;                 // player.yaw : le nez en (−sin yaw, −cos yaw)
    p.vitesseVoiture = v; p.touchMove.f = 1; p.choc = null; p.chocs = 0;
    const laBoite = () => obstacle.mobilier ? boite(obstacle.x, obstacle.z, 0, 0.3, 0.3) : boite(obstacle.x, obstacle.z, obstacle.cap);
    // un piéton derrière la voiture quand elle rebondit (trois blocs derrière
    // son coffre au contact) : le rebond s'arrête devant lui, il n'est
    // jamais touché (v259)
    let pieton = null, pietonTouche = false;
    if (cas === 'murPieton') {
      // il arrive sur le trottoir derrière elle au moment du choc
      p.obstacleVehicule = (x, z, cap, x0 = x, z0 = z) => (pieton && touche(boite(x, z, cap), pieton) && !touche(boite(x0, z0, cap), pieton) ? 'pieton' : false);
    }
    if (obstacle) {
      p.obstacleVehicule = (x, z, cap, x0 = x, z0 = z) => {
        const B = laBoite();
        if (touche(boite(x, z, cap), B) && !touche(boite(x0, z0, cap), B)) return obstacle.mobilier ? 'mobilier' : 'voiture';
        return false;
      };
      p.voitureContre = (x, z, cap) => {
        if (obstacle.mobilier) return null;
        const B = laBoite();
        if (!touche(boite(x, z, cap), B)) return null;
        const r = { ...B, v: obstacle.v };
        if (obstacle.poussable) r.libre = true, r.vx = obstacle.vx, r.vz = obstacle.vz, r.pousser = (vx, vz) => { obstacle.vx = vx; obstacle.vz = vz; };
        return r;
      };
    }
    const forces = [];
    let contact = null, chemin = 0, images = null, vApres = null, last = { x: p.pos.x, z: p.pos.z };
    let chocsVus = 0, avance = 0; const kChocs = [];
    for (let k = 0; k < 60 * 6; k++) {
      t += DT;
      if (obstacle && obstacle.roule) {
        // elle ne s'enfonce pas d'elle-même dans notre voiture : c'est notre
        // pas qui la touche (la rue avance avant le joueur, comme au jeu)
        const nx = obstacle.x + (obstacle.axe ? obstacle.axe * obstacle.v * DT : 0), nz = obstacle.z + (obstacle.axe ? 0 : obstacle.v * DT);
        if (!touche(boite(nx, nz, obstacle.cap), boite(p.pos.x, p.pos.z, p.yaw + Math.PI))) { obstacle.x = nx; obstacle.z = nz; }
      }
      if (obstacle && obstacle.poussable && (obstacle.vx || obstacle.vz)) {
        const sp = Math.hypot(obstacle.vx, obstacle.vz);
        const n = Math.max(0, sp - (C.FROTTEMENT_POUSSEE || 18) * DT);
        obstacle.x += obstacle.vx * DT; obstacle.z += obstacle.vz * DT; obstacle.chemin += sp * DT;
        obstacle.vx *= n / sp; obstacle.vz *= n / sp;
      }
      const vAvantImage = Math.hypot(p.vel.x, p.vel.z);
      p.update(DT);
      if (pieton && touche(boite(p.pos.x, p.pos.z, p.yaw + Math.PI), pieton)) pietonTouche = true;
      if ((p.chocs || 0) > chocsVus) { chocsVus = p.chocs; forces.push(p.choc.force); kChocs.push(k); }
      if (!contact && (p.chocs > 0 || (p.contact && p.contact.famille))) {
        contact = { x: p.pos.x, z: p.pos.z, k, v: vAvantImage };
        if (cas === 'murPieton') pieton = boite(p.pos.x - 2.2 - 0.3 - 1.5, p.pos.z, 0, 0.3, 0.3);
        if (lache) p.touchMove.f = 0;
        if (obstacle && obstacle.stoppe) { obstacle.roule = false; obstacle.v = 0; }
      }
      const d = Math.hypot(p.pos.x - last.x, p.pos.z - last.z);
      last = { x: p.pos.x, z: p.pos.z };
      if (contact) {
        if (k === contact.k + 1) vApres = +(d / DT).toFixed(1);
        chemin += d;
        avance = Math.max(avance, Math.hypot(p.pos.x - contact.x, p.pos.z - contact.z));
        if (images == null && k > contact.k + 1 && d / DT < 0.3) images = k - contact.k;
        if (!lache && k > contact.k + 120) break;   // tenu : deux secondes suffisent à lire
        if (lache && images != null && k > contact.k + images + 10) break;
      }
    }
    return {
      contact: !!contact, dx: contact ? +(p.pos.x - contact.x).toFixed(2) : null, vImpact: contact ? +contact.v.toFixed(2) : null, images, chemin: +chemin.toFixed(2), loin: +avance.toFixed(2), vApres,
      chocs: forces.length, forces, ecart: kChocs.length > 1 ? +((kChocs[1] - kChocs[0]) * DT).toFixed(2) : null,
      poussee: obstacle && obstacle.poussable ? +obstacle.chemin.toFixed(2) : undefined,
      pietonTouche: pieton ? pietonTouche : undefined,
    };
  }
  const out = {};
  for (const cas of ['mur', 'mur30', 'garee', 'rue', 'traverse', 'enFace', 'mobilier', 'murPieton'])
    for (const v of [15, 30, 50]) out[`${cas}@${v}`] = { lache: essai(cas, v, true), tenu: essai(cas, v, false) };
  return out;
}
module.exports = { mesurer };
if (require.main === module) {
  mesurer(path.resolve(process.argv[2] || path.join(__dirname, '..'))).then((t) => {
    for (const [k, r] of Object.entries(t)) {
      const f = (x) => `${x.vImpact} b/s → ${x.images ?? '∞'} img · ${x.chemin} b · v ${x.vApres} · ${x.chocs} choc(s) ${x.forces.join('/')}${x.ecart != null ? ` (+${x.ecart} s)` : ''}` + (x.poussee !== undefined ? ` · poussée ${x.poussee} b` : '') + (x.pietonTouche !== undefined ? ` · piéton ${x.pietonTouche ? 'TOUCHÉ' : 'sauf'}` : '');
      console.log(k.padEnd(13), 'lâché', f(r.lache).padEnd(58), '| tenu', f(r.tenu));
    }
  });
}
