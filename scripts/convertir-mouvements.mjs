// Mouvements de capture réelle pour les personnages (chantier « personnages
// vivants »). Source : CMU Graphics Lab Motion Capture Database,
// http://mocap.cs.cmu.edu — voir vendor/humains/LICENSE.md pour la licence.
//
// Ce script lit les fichiers ASF/AMC originaux (non versionnés), calcule pour
// chaque os la rotation dans le MONDE à chaque image, l'exprime comme un écart
// à la pose de repos (le « T » de l'ASF, où toutes les rotations globales
// valent l'identité) dans un repère où le personnage regarde +Z, et écrit un
// fichier binaire compact. Le reciblage sur un squelette Rocketbox se fait au
// chargement (src/mouvements.js), parce que les neuf squelettes n'ont pas la
// même pose de repos (jusqu'à onze degrés d'écart mesurés entre les mains).
//
// Reproduire :
//   mkdir -p /tmp/cmu && cd /tmp/cmu
//   for s in 16 82 111; do curl -O http://mocap.cs.cmu.edu/subjects/$s/$s.asf; done
//   for m in 16_15 16_33 16_35 82_08 111_28; do
//     curl -O http://mocap.cs.cmu.edu/subjects/${m%_*}/$m.amc; done
//   cd scripts && node convertir-mouvements.mjs /tmp/cmu ../vendor/humains/mouvements-v1.bin
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";

const src = path.resolve(process.argv[2] || "/tmp/cmu");
const sortie = path.resolve(process.argv[3] || "../vendor/humains/mouvements-v1.bin");

// Un mètre vaut (1 / 0.45) × 2,54 / 100 unités d'ASF CMU (« length 0.45 »,
// le pouce mis à l'échelle) : la conversion classique de la base.
const METRE = (1 / 0.45) * 0.0254;

// Les os du squelette Rocketbox (sans le préfixe Bip0x_) et l'os CMU qui
// porte le même segment anatomique. L'ordre est hiérarchique : un parent
// passe toujours avant ses enfants (le reciblage en dépend).
export const OS = [
  ["Pelvis", "root"],
  ["Spine", "lowerback"],
  ["Spine1", "upperback"],
  ["Spine2", "thorax"],
  ["Neck", "upperneck"],
  ["Head", "head"],
  ["L_Thigh", "lfemur"],
  ["L_Calf", "ltibia"],
  ["L_Foot", "lfoot"],
  ["R_Thigh", "rfemur"],
  ["R_Calf", "rtibia"],
  ["R_Foot", "rfoot"],
  ["L_Clavicle", "lclavicle"],
  ["L_UpperArm", "lhumerus"],
  ["L_Forearm", "lradius"],
  ["L_Hand", "lhand"],
  ["R_Clavicle", "rclavicle"],
  ["R_UpperArm", "rhumerus"],
  ["R_Forearm", "rradius"],
  ["R_Hand", "rhand"],
];

// Les prises retenues. `debut`/`duree` en secondes dans la prise d'origine ;
// `cycle` cherche une boucle de marche/course (une foulée complète) au lieu
// d'un fondu de bouclage.
const PRISES = process.env.PRISES ? JSON.parse(process.env.PRISES) : [
  { nom: "marche", fichier: "16_15", sujet: "16", fps: 30, cycle: [0.85, 1.4] },
  { nom: "marcheLente", fichier: "16_33", sujet: "16", fps: 30, cycle: [1.0, 1.7] },
  { nom: "course", fichier: "16_35", sujet: "16", fps: 30, cycle: [0.5, 0.9] },
  // au repos : la fenêtre la plus immobile de la prise (`immobile`)
  // (mesuré : 137_28 « normal wait » a les poings sur les hanches, 140_06
  // « idle » les jambes écartées à 35° — écartées)
  { nom: "attente", fichier: "82_08", sujet: "82", fps: 30, immobile: true, duree: 5.5 },
  { nom: "attente2", fichier: "111_28", sujet: "111", fps: 30, immobile: true, duree: 9 },
  // ÉCARTÉES APRÈS CAPTURE (le jeu les rendait fausses, vu en vitrine) :
  // 40_10 « regarder autour » (tronc rejeté en arrière, bras écartés),
  // 79_36 « téléphone » et 18_08 « parler » (bras levés, corps penchés) ;
  // 18_12 « assis » attend un système de sièges. Le code de ces trois
  // traitements (`telephone`, `assis`) reste pour une prise meilleure.
];

function lireAsf(texte) {
  const os = { root: { nom: "root", dir: new THREE.Vector3(), long: 0, C: new THREE.Matrix4(), dof: [] } };
  const enfants = {};
  const lignes = texte.split(/\r?\n/);
  let i = 0, section = "";
  while (i < lignes.length) {
    const l = lignes[i].trim();
    if (l.startsWith(":")) { section = l.split(/\s+/)[0]; i++; continue; }
    if (section === ":bonedata" && l === "begin") {
      const b = { dof: [] };
      i++;
      while (lignes[i].trim() !== "end") {
        const t = lignes[i].trim().split(/\s+/);
        if (t[0] === "name") b.nom = t[1];
        else if (t[0] === "direction") b.dir = new THREE.Vector3(+t[1], +t[2], +t[3]);
        else if (t[0] === "length") b.long = +t[1];
        else if (t[0] === "axis") {
          const e = new THREE.Euler(
            THREE.MathUtils.degToRad(+t[1]), THREE.MathUtils.degToRad(+t[2]), THREE.MathUtils.degToRad(+t[3]),
            t[4].split("").reverse().join(""));
          b.C = new THREE.Matrix4().makeRotationFromEuler(e);
        } else if (t[0] === "dof") b.dof = t.slice(1);
        i++;
      }
      os[b.nom] = b;
    } else if (section === ":hierarchy" && l && l !== "begin" && l !== "end") {
      const t = l.split(/\s+/);
      enfants[t[0]] = t.slice(1);
      for (const e of t.slice(1)) if (os[e]) os[e].parent = t[0];
    }
    i++;
  }
  return { os, enfants };
}

function lireAmc(texte) {
  const images = [];
  let cour = null;
  for (const brut of texte.split(/\r?\n/)) {
    const l = brut.trim();
    if (!l || l.startsWith("#") || l.startsWith(":")) continue;
    if (/^\d+$/.test(l)) { cour = {}; images.push(cour); continue; }
    const t = l.split(/\s+/);
    cour[t[0]] = t.slice(1).map(Number);
  }
  return images;
}

const ordre = (asf) => {
  const liste = [], vu = new Set();
  const visiter = (n) => { if (vu.has(n)) return; vu.add(n); liste.push(n); for (const e of asf.enfants[n] || []) visiter(e); };
  visiter("root");
  return liste;
};

// Rotations GLOBALES de chaque os à une image, et position de la racine.
// L = C · M · C⁻¹, G = G_parent · L : la recette de l'ASF/AMC.
function poser(asf, liste, img) {
  const G = {}, pos = {};
  for (const nom of liste) {
    const b = asf.os[nom];
    const v = img[nom] || [];
    let M;
    if (nom === "root") {
      M = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
        THREE.MathUtils.degToRad(v[3] || 0), THREE.MathUtils.degToRad(v[4] || 0), THREE.MathUtils.degToRad(v[5] || 0), "ZYX"));
      G.root = M;
      pos.root = new THREE.Vector3(v[0] || 0, v[1] || 0, v[2] || 0).multiplyScalar(METRE);
      continue;
    }
    const a = { rx: 0, ry: 0, rz: 0 };
    b.dof.forEach((d, k) => { if (d in a) a[d] = THREE.MathUtils.degToRad(v[k] || 0); });
    M = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(a.rx, a.ry, a.rz, "ZYX"));
    const L = b.C.clone().multiply(M).multiply(b.C.clone().invert());
    G[nom] = G[b.parent].clone().multiply(L);
    pos[nom] = pos[b.parent].clone().add(b.dir.clone().applyMatrix4(G[nom]).multiplyScalar(b.long * METRE));
  }
  return { G, pos };
}

const quat = (m) => new THREE.Quaternion().setFromRotationMatrix(m);

function traiter(p) {
  const asf = lireAsf(fs.readFileSync(path.join(src, `${p.sujet}.asf`), "utf8"));
  const amc = lireAmc(fs.readFileSync(path.join(src, `${p.fichier}.amc`), "utf8"));
  const liste = ordre(asf);
  const fpsSrc = p.src || 120;
  const poses = amc.map((img) => poser(asf, liste, img));
  // Cap de la prise : la gauche − la droite des hanches, croisée avec le haut.
  const haut = new THREE.Vector3(0, 1, 0);
  const capDe = (k) => {
    const { pos } = poses[k];
    const g = pos.lhipjoint, d = pos.rhipjoint;
    const f = new THREE.Vector3().subVectors(g, d).cross(haut);
    return Math.atan2(f.x, f.z);
  };
  const jambe = (asf.os.lfemur.long + asf.os.ltibia.long) * METRE;

  // Choix du segment.
  let f0, f1;
  if (p.cycle) {
    // Une foulée : deux images du milieu de la prise dont les poses se
    // ressemblent le plus (somme des angles des os des jambes et des bras),
    // espacées d'une durée plausible de cycle.
    const cles = ["lfemur", "rfemur", "ltibia", "rtibia", "lhumerus", "rhumerus", "lfoot", "rfoot"];
    const local = (k) => cles.map((c) => quat(poses[k].G.root.clone().invert().multiply(poses[k].G[c])));
    const n = poses.length;
    let meilleur = Infinity;
    for (let a = Math.floor(n * 0.3); a < Math.floor(n * 0.55); a += 2) {
      const qa = local(a);
      for (let b = a + Math.round(p.cycle[0] * fpsSrc); b <= Math.min(n - 1, a + Math.round(p.cycle[1] * fpsSrc)); b++) {
        const qb = local(b);
        let d = 0;
        for (let k = 0; k < qa.length; k++) d += qa[k].angleTo(qb[k]);
        if (d < meilleur) { meilleur = d; f0 = a; f1 = b; }
      }
    }
  } else {
    let debut = p.debut ?? 0;
    if (p.telephone) {
      // le moment où la main droite (ou gauche) est la plus proche de la
      // tête, et l'on reste autour : la conversation au téléphone
      let best = Infinity, k0 = 0;
      for (let k = 0; k < poses.length; k++) {
        const { pos } = poses[k];
        const d = Math.min(pos.rhand.distanceTo(pos.head), pos.lhand.distanceTo(pos.head));
        if (d < best) { best = d; k0 = k; }
      }
      debut = Math.max(0, k0 / fpsSrc - p.duree * 0.4);
    }
    if (p.assis) {
      // le passage le plus bas de la racine, la personne assise
      let best = Infinity, k0 = 0;
      const w = Math.round(p.duree * fpsSrc);
      for (let k = 0; k + w < poses.length; k += 10) {
        let s = 0;
        for (let j = k; j < k + w; j += 10) s += poses[j].pos.root.y;
        if (s < best) { best = s; k0 = k; }
      }
      debut = k0 / fpsSrc;
    }
    if (p.immobile) {
      // la fenêtre où la racine parcourt le moins de chemin : la personne
      // attend sur place (une prise « attendre le bus » commence en marchant)
      const w = Math.round(p.duree * fpsSrc);
      let best = Infinity, k0 = 0;
      for (let k = 0; k + w < poses.length; k += 15) {
        let s = 0;
        for (let j = k + 15; j <= k + w; j += 15) s += Math.hypot(poses[j].pos.root.x - poses[j - 15].pos.root.x, poses[j].pos.root.z - poses[j - 15].pos.root.z);
        if (s < best) { best = s; k0 = k; }
      }
      debut = k0 / fpsSrc;
    }
    f0 = Math.round(debut * fpsSrc);
    f1 = Math.min(poses.length - 1, f0 + Math.round(p.duree * fpsSrc));
  }
  const duree = (f1 - f0) / fpsSrc;
  // Cap moyen du segment, ramené à +Z.
  let sx = 0, sz = 0;
  for (let k = f0; k <= f1; k++) { const c = capDe(k); sx += Math.sin(c); sz += Math.cos(c); }
  const cap = Math.atan2(sx, sz);
  const H = new THREE.Quaternion().setFromAxisAngle(haut, -cap), Hi = H.clone().invert();
  // Au repos, la personne ne doit pas tourner sur elle-même : le jeu décide
  // où elle regarde. On retire le cap LENT de la prise (moyenne glissante
  // sur quatre cinquièmes de seconde) et l'on garde ses balancements. Une foulée garde un
  // cap fixe : elle va droit.
  const capLisse = (t) => {
    if (p.cycle) return cap;
    let x = 0, z = 0;
    const r = Math.round(fpsSrc * 0.4);
    for (let k = Math.max(0, Math.floor(t) - r); k <= Math.min(poses.length - 1, Math.floor(t) + r); k += 4) {
      const c = capDe(k); x += Math.sin(c); z += Math.cos(c);
    }
    return Math.atan2(x, z);
  };
  const Hk = new THREE.Quaternion(), Hki = new THREE.Quaternion();
  // Vitesse d'avance (m/s) pour régler la cadence au jeu.
  const dep = new THREE.Vector3().subVectors(poses[f1].pos.root, poses[f0].pos.root);
  dep.y = 0;
  const vitesse = p.cycle ? dep.length() / duree : 0;

  const n = Math.max(2, Math.round(duree * p.fps));
  const q = new Float32Array(n * OS.length * 4);
  const bob = new Float32Array(n);
  let yMoy = 0;
  for (let k = f0; k <= f1; k++) yMoy += poses[k].pos.root.y;
  yMoy /= f1 - f0 + 1;
  const tmp = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const t = f0 + (i / n) * (f1 - f0);
    const a = Math.floor(t), u = t - a, b = Math.min(poses.length - 1, a + 1);
    Hk.setFromAxisAngle(haut, -capLisse(t));
    Hki.copy(Hk).invert();
    OS.forEach(([, c], j) => {
      qa.setFromRotationMatrix(poses[a].G[c]);
      qb.setFromRotationMatrix(poses[b].G[c]);
      tmp.slerpQuaternions(qa, qb, u);
      // D = H · G · H⁻¹ : l'écart au repos, dans le repère « regarde +Z »
      tmp.premultiply(Hk).multiply(Hki);
      if (tmp.w < 0) tmp.set(-tmp.x, -tmp.y, -tmp.z, -tmp.w);
      q.set([tmp.x, tmp.y, tmp.z, tmp.w], (i * OS.length + j) * 4);
    });
    bob[i] = (poses[a].pos.root.y * (1 - u) + poses[b].pos.root.y * u - yMoy) / jambe;
  }
  // Bouclage : une foulée se referme d'elle-même (sa dernière image ressemble
  // à la première) ; une attente se referme par un fondu sur ses derniers
  // trois quarts de seconde. On mélange vers l'image 0, jamais l'inverse.
  const fondu = p.cycle ? Math.round(n * 0.12) : Math.round(0.75 * p.fps);
  for (let i = n - fondu; i < n; i++) {
    const w = (i - (n - fondu) + 1) / (fondu + 1);
    const s = w * w * (3 - 2 * w);
    for (let j = 0; j < OS.length; j++) {
      const o = (i * OS.length + j) * 4, o0 = j * 4;
      qa.fromArray(q, o); qb.fromArray(q, o0);
      if (qa.dot(qb) < 0) qb.set(-qb.x, -qb.y, -qb.z, -qb.w);
      qa.slerp(qb, s * (p.cycle ? 0.5 : 1));
      q.set([qa.x, qa.y, qa.z, qa.w], o);
    }
    bob[i] = bob[i] * (1 - s) + bob[0] * s;
  }
  // Direction de repos de chaque segment (repère « regarde +Z »).
  const dirs = OS.map(([, c]) => (c === "root" ? new THREE.Vector3(0, 1, 0) : asf.os[c].dir.clone().applyQuaternion(H).normalize()));
  if (process.env.DIAG) {
    // l'inclinaison moyenne de la tête et du thorax vers l'avant (+) ou
    // l'arrière (−), en degrés, dans le repère « regarde +Z »
    const incl = (c) => { let s = 0, m = 0; for (let k = f0; k <= f1; k += 4) { const d = asf.os[c].dir.clone().applyMatrix4(poses[k].G[c]).applyQuaternion(H); s += Math.atan2(d.z, d.y); m++; } return (s / m * 180 / Math.PI).toFixed(0); };
    const hauteur = (poses[f0].pos.head.y - Math.min(poses[f0].pos.lfoot.y, poses[f0].pos.rfoot.y)).toFixed(2);
    let yx = 0, yy = 0, ys = [];
    for (let k = f0; k <= f1; k += 4) { const d = new THREE.Vector3(0, 0, 1).applyMatrix4(poses[k].G.head).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(haut, -capLisse(k))); ys.push(Math.atan2(d.x, d.z) * 180 / Math.PI); }
    const amp = (Math.max(...ys) - Math.min(...ys)).toFixed(0);
    const chemin = poses[f1].pos.root.clone().sub(poses[f0].pos.root).setY(0).length().toFixed(2);
    const ecart = (c) => { let s = 0, m = 0; for (let k = f0; k <= f1; k += 4) { const d = asf.os[c].dir.clone().applyMatrix4(poses[k].G[c]); s += Math.acos(Math.max(-1, Math.min(1, -d.y))); m++; } return (s / m * 180 / Math.PI).toFixed(0); };
    console.log(`   bras ${ecart("lhumerus")}°/${ecart("rhumerus")}°, cuisses ${ecart("lfemur")}°/${ecart("rfemur")}°`);
    console.log(`   tête ${incl("head")}°, regard balayé ${amp}°, racine ${chemin} m`);
    console.log(`   tête ${incl("head")}°, cou ${incl("upperneck")}°, thorax ${incl("thorax")}°, hauteur tête-pied ${hauteur} m`);
  }
  console.log(`${p.nom.padEnd(12)} ${p.fichier.padEnd(7)} ${n} images à ${p.fps} i/s, ${duree.toFixed(2)} s` +
    (p.cycle ? `, foulée de ${(f0 / fpsSrc).toFixed(2)} à ${(f1 / fpsSrc).toFixed(2)} s, ${vitesse.toFixed(2)} m/s` : `, de ${(f0 / fpsSrc).toFixed(1)} s`) +
    `, jambe ${jambe.toFixed(2)} m`);
  return { nom: p.nom, source: `CMU ${p.fichier}`, fps: p.fps, n, boucle: true, vitesse: +vitesse.toFixed(3), q, bob, dirs };
}

// Format : en-tête JSON (longueur sur 4 octets), puis pour chaque prise les
// quaternions en int16 (×32767) et le rebond vertical en int16 (×1/10 000 de
// jambe). Un seul fichier, immuable (cache statique) : une retouche prend un
// nom neuf.
const prises = PRISES.map(traiter);
const entete = {
  version: 1,
  source: "CMU Graphics Lab Motion Capture Database, http://mocap.cs.cmu.edu",
  os: OS.map(([t]) => t),
  prises: prises.map((p) => ({ nom: p.nom, source: p.source, fps: p.fps, n: p.n, boucle: p.boucle, vitesse: p.vitesse,
    dirs: p.dirs.flatMap((d) => [+d.x.toFixed(4), +d.y.toFixed(4), +d.z.toFixed(4)]) })),
};
const morceaux = [];
for (const p of prises) {
  const qi = new Int16Array(p.q.length);
  for (let i = 0; i < p.q.length; i++) qi[i] = Math.round(Math.max(-1, Math.min(1, p.q[i])) * 32767);
  const bi = new Int16Array(p.bob.length);
  for (let i = 0; i < p.bob.length; i++) bi[i] = Math.round(Math.max(-3, Math.min(3, p.bob[i])) * 10000);
  morceaux.push(Buffer.from(qi.buffer), Buffer.from(bi.buffer));
}
let json = Buffer.from(JSON.stringify(entete));
// alignement sur 2 octets pour les Int16Array du lecteur
if ((4 + json.length) % 2) json = Buffer.concat([json, Buffer.from(" ")]);
const longueur = Buffer.alloc(4);
longueur.writeUInt32LE(json.length);
const tout = Buffer.concat([longueur, json, ...morceaux]);
fs.writeFileSync(sortie, tout);
console.log(`→ ${sortie} : ${(tout.length / 1024).toFixed(1)} Ko`);
