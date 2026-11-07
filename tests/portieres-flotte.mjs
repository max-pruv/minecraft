// LES PORTIÈRES DE TOUTE LA FLOTTE, SOUS NODE (vNEXT). Max : « la porte de la
// voiture doit s'ouvrir réellement ; aujourd'hui on voit la personne qui
// rentre et qui disparaît là-dedans ». Pour chaque modèle de `FLOTTE` (GLB et
// voitures fabriquées) : a-t-il une portière ? s'ouvre-t-elle vers
// l'extérieur (ou vers le haut, en ciseau) ? et derrière l'ouverture, un
// rayon tiré de dehors rencontre-t-il l'habitacle — ou traverse-t-il la
// voiture sans rien toucher, le vide où l'enfant « disparaît » ?
// Appelé par `degats.js`, qui a déjà branché « three ».
import * as THREE from 'three';
import { sansNavigateur } from './sonde-feux-flotte.mjs';

export async function mesurerPortieres({ modeles } = {}) {
  sansNavigateur();
  const V = await import('../src/vehicules.js');
  const P = await import('../src/portieres.js');
  const M = await import('../src/modeles.js');
  const out = [];
  for (const f of V.FLOTTE) {
    if (modeles && !modeles.includes(f.fichier)) continue;
    const proto = await V.chargerVoitureFlotte(f);
    if (!proto) { out.push({ f: f.fichier, absent: true }); continue; }
    const g = new THREE.Group(), mo = proto.clone(true); g.add(mo);
    g.userData.flotte = f.fichier; g.userData.modele = mo; g.userData.proto = proto; g.updateMatrixWorld(true);
    // le même modèle SANS sa garniture : ce que l'enfant voyait par
    // l'ouverture si on avait seulement découpé la tôle
    const vide = new THREE.Group(), mv = proto.clone(true); vide.add(mv);
    vide.userData.flotte = f.fichier; vide.userData.modele = mv; vide.userData.proto = proto; vide.updateMatrixWorld(true);
    const refusFiche = f.portiere === false;
    const eq = refusFiche ? null : P.equiperPortieres(g, false, { ciseau: f.portiere === 'ciseau' });
    if (!eq) { out.push({ f: f.fichier, porte: false, raison: refusFiche ? 'fiche' : (P.refus.get(f.fichier) || {}).raison }); continue; }
    const plan = eq.plan;
    const p = eq['-1'];
    g.updateMatrixWorld(true);
    const boite = (o) => new THREE.Box3().setFromObject(o);
    const fermee = boite(p);
    P.ouvrir(p, 1); g.updateMatrixWorld(true);
    const ouverte = boite(p);
    // le trou : 24 rayons de dehors, au travers de l'ouverture, vers l'axe ; un
    // rayon compte s'il s'arrête DANS l'habitacle (siège, console, planche,
    // panneau), pas sur la tôle de l'autre flanc
    const cibles = []; g.traverse((o) => { if (!o.isMesh) return; for (let q = o; q && q !== g; q = q.parent) if (q === p) return; cibles.push(o); });
    // L'HABITACLE QU'ON VOIT PAR L'OUVERTURE : un siège sous les hanches du
    // conducteur, une planche devant ses genoux (à hauteur de l'assise
    // trouvée : un SUV est assis plus haut qu'une sportive)
    const rc = new THREE.Raycaster(); rc.layers.enableAll();
    const habitacle = (v, porte) => {
      const ms = []; v.traverse((o) => { if (!o.isMesh || o.material.transparent) return; for (let q = o; q && q !== v; q = q.parent) if (q === porte || /^Wheel_/i.test(q.name || '')) return; ms.push(o); });
      const tir = (o, d, loin) => { rc.set(new THREE.Vector3(...o), new THREE.Vector3(...d)); rc.far = loin; const h = rc.intersectObjects(ms, false)[0]; return h ? h.point : null; };
      const s = tir([-0.33, 0.95, 0.22], [0, -1, 0], 0.7);
      const siege = !!s && s.y > 0.3;
      // devant ses genoux, de l'assise à quarante centimètres au-dessus (le
      // rayon peut passer dans la jante du volant : on en tire neuf)
      let planche = false;
      for (let k = 0; k <= 8 && !planche; k++) {
        const pl = tir([-0.33, (siege ? s.y : 0.5) + 0.05 * k, 0.22], [0, 0, -1], 0.22 - plan.z0 + 0.6);
        planche = !!pl && pl.z > plan.z0 - 0.6;
      }
      return siege && planche;
    };
    const meuble = habitacle(g, p);
    const eqV = P.equiperPortieres(vide, false, { ciseau: f.portiere === 'ciseau', garniture: false });
    const meubleSans = eqV ? habitacle(vide, eqV['-1']) : null;
    // la garniture fabriquée : le matériau des corps sculptés, rien de neuf
    const matieres = new Set(); g.traverse((o) => { if (o.isMesh && o.userData.garniture) matieres.add(o.material); });
    out.push({ f: f.fichier, porte: true, ciseau: f.portiere === 'ciseau', vraie: !!plan.vraie,
      versDehors: +(fermee.min.x - ouverte.min.x).toFixed(2), monte: +(ouverte.max.y - fermee.max.y).toFixed(2),
      meuble, meubleSans, garniture: !!eq.garniture, matieresGarniture: [...matieres].map((m) => m === M.matiereVivante() ? 'vivante' : (m && m.type)) });
  }
  return out;
}
