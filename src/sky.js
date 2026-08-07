// Le soleil, la lune et les étoiles. Le cycle jour/nuit existait déjà mais ne
// se traduisait que par la couleur du ciel : on ne voyait aucun astre. Les
// ajouter change complètement l'ambiance sans rien coûter — trois objets
// suivent la caméra, et le brouillard les épargne.

import * as THREE from 'three';

const RAYON = 420;        // distance des astres : loin devant, mais bien avant le plan lointain (900)
const NB_ETOILES = 420;

// Disque lumineux dessiné une fois : un dégradé radial peint dans un canevas,
// nettement moins coûteux qu'un shader et parfaitement suffisant à cette taille.
function disque(couleurCentre, couleurBord, taille = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(taille / 2, taille / 2, 0, taille / 2, taille / 2, taille / 2);
  g.addColorStop(0, couleurCentre);
  g.addColorStop(0.45, couleurCentre);
  g.addColorStop(0.62, couleurBord);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, taille, taille);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createSky({ scene, camera, sunLight }) {
  const groupe = new THREE.Group();
  groupe.frustumCulled = false;
  scene.add(groupe);

  const astre = (texture, taille) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(taille, taille),
      new THREE.MeshBasicMaterial({
        map: texture, transparent: true, depthWrite: false, fog: false,
        blending: THREE.AdditiveBlending,
      })
    );
    m.frustumCulled = false;
    groupe.add(m);
    return m;
  };

  const soleil = astre(disque('rgba(255,247,214,1)', 'rgba(255,176,74,0.55)'), 62);
  const lune = astre(disque('rgba(226,233,255,1)', 'rgba(150,175,235,0.4)'), 42);
  // halo large autour du soleil : c'est lui qui donne les couchers spectaculaires
  const halo = astre(disque('rgba(255,150,60,0.34)', 'rgba(255,90,40,0.12)'), 300);

  // Les étoiles vivent sur une demi-sphère au-dessus du joueur. Elles sont
  // fixes par rapport au monde, donc elles ne « glissent » pas quand on marche.
  const etoilesGeo = new THREE.BufferGeometry();
  {
    const pts = new Float32Array(NB_ETOILES * 3);
    for (let i = 0; i < NB_ETOILES; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.92 + 0.05); // évite le zénith pile et l'horizon
      pts[i * 3] = RAYON * Math.sin(phi) * Math.cos(theta);
      pts[i * 3 + 1] = RAYON * Math.cos(phi) * 0.85 + 40;
      pts[i * 3 + 2] = RAYON * Math.sin(phi) * Math.sin(theta);
    }
    etoilesGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  }
  const etoilesMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 2.4, sizeAttenuation: false,
    transparent: true, opacity: 0, depthWrite: false, fog: false,
  });
  const etoiles = new THREE.Points(etoilesGeo, etoilesMat);
  etoiles.frustumCulled = false;
  groupe.add(etoiles);

  const dirSoleil = new THREE.Vector3();

  // angle : 0 → 2π sur une journée, sin(angle) > 0 quand il fait jour
  // daylight : 0 la nuit, 1 à midi (déjà calculé par le cycle existant)
  function update(angle, daylight, camPos) {
    groupe.position.copy(camPos); // le ciel accompagne le joueur, il est à l'infini

    // le soleil monte à l'est et se couche à l'ouest, en passant légèrement
    // de côté plutôt que pile au zénith : l'ombre portée est plus jolie
    const hauteur = Math.sin(angle);
    const cote = Math.cos(angle);
    dirSoleil.set(cote, hauteur, -0.35).normalize();

    soleil.position.copy(dirSoleil).multiplyScalar(RAYON);
    halo.position.copy(soleil.position).multiplyScalar(0.985);
    lune.position.copy(dirSoleil).multiplyScalar(-RAYON);
    for (const m of [soleil, halo, lune]) m.lookAt(groupe.position);

    // Chacun s'efface sous l'horizon plutôt que de disparaître d'un coup.
    soleil.material.opacity = THREE.MathUtils.clamp(hauteur * 5 + 0.35, 0, 1);
    lune.material.opacity = THREE.MathUtils.clamp(-hauteur * 5 + 0.35, 0, 1) * 0.9;
    soleil.visible = soleil.material.opacity > 0.01;
    lune.visible = lune.material.opacity > 0.01;

    // Le halo ne s'allume qu'au ras de l'horizon : c'est ce qui fait le lever
    // et le coucher, et il reste invisible en plein midi. Même largeur que la
    // teinte orange du ciel, sinon on obtient une auréole blanche sur du bleu.
    const rasant = Math.exp(-((hauteur / 0.22) ** 2));
    halo.material.opacity = rasant * 0.9;
    halo.visible = halo.material.opacity > 0.01 && hauteur > -0.3;

    // Le disque lui-même se réchauffe en descendant : blanc à midi, orangé au ras
    soleil.material.color.setRGB(1, 1 - rasant * 0.32, 1 - rasant * 0.62);

    etoilesMat.opacity = THREE.MathUtils.clamp(1 - daylight * 2.4, 0, 0.95);
    etoiles.visible = etoilesMat.opacity > 0.01;

    // la lumière directionnelle suit vraiment le soleil : les faces éclairées
    // changent au fil de la journée au lieu de rester figées
    if (sunLight) {
      sunLight.position.copy(hauteur > 0 ? dirSoleil : dirSoleil.clone().negate());
    }
  }

  return { update, soleil, lune, etoiles, halo };
}

// L'eau ondule par déplacement des sommets dans le shader : le coût est nul
// côté processeur, et le lac du château cesse d'être une plaque figée.
export function animerEau(material) {
  material.userData.temps = { value: 0 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.temps = material.userData.temps;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float temps;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        // seule la surface bouge : les faces latérales immergées restent en place
        if (normal.y > 0.5) {
          float onde = sin(position.x * 0.9 + temps * 1.7) * 0.5
                     + sin(position.z * 1.3 + temps * 2.3) * 0.5;
          transformed.y += onde * 0.055;
        }`);
  };
  material.needsUpdate = true;
}
