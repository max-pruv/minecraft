// LES EFFETS DE SAISON EN VRAIES FORMES (v531).
//
// Max, capture d'iPhone au volant sur une autoroute : « je veux enlever les
// trucs type Minecraft en carré. Si ce sont des feuilles qui volent parce que
// c'est l'automne, je veux voir des vraies feuilles, haute définition. »
// C'étaient les feuilles d'automne : un `Points` de cent soixante CARRÉS
// (aucune texture), posé de −1 à +9 blocs au-dessus du sol SOUS L'ENFANT. Vu
// d'une caméra de poursuite à trois blocs du sol, tout ce qui est plus haut
// qu'elle se projette au-dessus de l'horizon : la moitié du nuage était dans
// le ciel, et la bande de la v484 ne pouvait rien y faire.
//
// Quatre règles, et elles valent pour toute ambiance à venir :
//
//   1. UNE VRAIE FORME, DESSINÉE ICI. Chaque effet a sa silhouette alpha,
//      tracée dans un canvas au chargement (pas de réseau, aucun dessin
//      emprunté — invariant 4) : feuille à nervure et pétiole, pétale
//      échancré, flocon à six branches, luciole ronde et douce.
//   2. UN SEUL APPEL DE DESSIN (v196, v348). Un `InstancedMesh` de quads, la
//      teinte par instance (`setColorAt`, présente dès la naissance parce que
//      `instancingColor` est dans la clé de programme, v496).
//   3. CHAQUE PARTICULE VIT SUR LE MONDE, PAS SUR L'ENFANT (v484). Elle naît
//      au-dessus de SA colonne, à hauteur d'arbre bas (moins de 3,5 blocs pour
//      une feuille), tombe en planant, SE POSE sur ce qui est sous elle — le
//      sol, un toit, la chaussée d'une tranchée, la surface de l'eau — y reste
//      quelques secondes, puis disparaît. On ne lit le sol que sur un morceau
//      DÉJÀ engendré : jamais `getBlock` qui fabrique (v472).
//   4. AUCUN PROGRAMME NE NAÎT EN JEU (v246, v491). `chauffer` compile le
//      maillage exact pendant l'accueil ; aucune lampe.

import * as THREE from 'three';

// --- le calendrier ------------------------------------------------------------

const SAISONS = {
  printemps: { nom: 'printemps', forme: 'petale', nb: 140, taille: [0.16, 0.26], haut: [0.8, 3.4], chute: [0.45, 0.8],
    teintes: [0xf4b6cf, 0xf7c9da, 0xfbe3ec, 0xeea2c0, 0xffffff], pose: [3, 6] },
  ete: { nom: 'ete', forme: 'luciole', nb: 60, taille: [0.09, 0.13], haut: [0.3, 2.2], chute: [0, 0],
    teintes: [0xf6f08a, 0xd8f070, 0xfff4a8], pose: [0, 0], lueur: true },
  automne: { nom: 'automne', forme: 'feuille', nb: 160, taille: [0.26, 0.42], haut: [0.8, 3.4], chute: [0.55, 0.95],
    teintes: [0xc8461e, 0xd9772a, 0xe0a52e, 0xb5341c, 0x9c5a24, 0xd8b04a, 0xa84a1c], pose: [5, 9] },
  hiver: { nom: 'hiver', forme: 'flocon', nb: 220, taille: [0.08, 0.14], haut: [1.5, 18], chute: [1.6, 2.4],
    teintes: [0xffffff, 0xf2f6ff], pose: [1.5, 3] },
};

export function saisonDuMois(m) {
  if (m >= 2 && m <= 4) return 'printemps';
  if (m >= 5 && m <= 7) return 'ete';
  if (m >= 8 && m <= 10) return 'automne';
  return 'hiver';
}

// `?saison=` force la saison, pour les témoins et pour Max (sinon un témoin
// d'automne ne tournerait qu'en automne).
export function saisonCourante(recherche = '', mois = new Date().getMonth()) {
  let forcee = null;
  try { forcee = new URLSearchParams(recherche).get('saison'); } catch { /* rien */ }
  return SAISONS[forcee] ? forcee : saisonDuMois(mois);
}

// --- les silhouettes ---------------------------------------------------------

function canvasDe(trace, taille = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  const g = c.getContext('2d');
  trace(g, taille);
  return c;
}

// Une feuille de chêne-érable à nous : limbe à cinq lobes arrondis, pointe,
// nervure centrale et deux secondaires plus sombres, pétiole. Blanche : la
// teinte vient de l'instance.
function feuille(g, t) {
  const s = t / 64;
  g.save(); g.scale(s, s);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(32, 4);
  g.bezierCurveTo(38, 10, 44, 10, 48, 16);
  g.bezierCurveTo(46, 20, 54, 22, 56, 28);
  g.bezierCurveTo(50, 32, 54, 38, 50, 44);
  g.bezierCurveTo(44, 44, 40, 50, 33, 52);
  g.lineTo(31, 52);
  g.bezierCurveTo(24, 50, 20, 44, 14, 44);
  g.bezierCurveTo(10, 38, 14, 32, 8, 28);
  g.bezierCurveTo(10, 22, 18, 20, 16, 16);
  g.bezierCurveTo(20, 10, 26, 10, 32, 4);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(120,96,80,0.75)';
  g.lineCap = 'round';
  g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(32, 61); g.lineTo(32, 8); g.stroke();       // pétiole + nervure
  g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(32, 36); g.lineTo(18, 24); g.stroke();
  g.beginPath(); g.moveTo(32, 36); g.lineTo(46, 24); g.stroke();
  g.beginPath(); g.moveTo(32, 44); g.lineTo(20, 40); g.stroke();
  g.beginPath(); g.moveTo(32, 44); g.lineTo(44, 40); g.stroke();
  g.restore();
}

// Un pétale de cerisier : une goutte arrondie, échancrée au bout.
function petale(g, t) {
  const s = t / 64;
  g.save(); g.scale(s, s);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(32, 60);
  g.bezierCurveTo(10, 46, 8, 18, 22, 8);
  g.quadraticCurveTo(28, 6, 32, 14);
  g.quadraticCurveTo(36, 6, 42, 8);
  g.bezierCurveTo(56, 18, 54, 46, 32, 60);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(200,120,150,0.5)';
  g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(32, 56); g.lineTo(32, 22); g.stroke();
  g.restore();
}

// Un flocon à six branches, chaque branche avec ses deux barbes.
function flocon(g, t) {
  const s = t / 64;
  g.save(); g.scale(s, s); g.translate(32, 32);
  g.strokeStyle = '#ffffff';
  g.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    g.save(); g.rotate(k * Math.PI / 3);
    g.lineWidth = 4.5;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -27); g.stroke();
    g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(0, -14); g.lineTo(-8, -21); g.moveTo(0, -14); g.lineTo(8, -21); g.stroke();
    g.restore();
  }
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
  g.restore();
}

// Une luciole : un cœur vif dans un halo qui s'éteint en douceur.
function luciole(g, t) {
  const r = g.createRadialGradient(t / 2, t / 2, 0, t / 2, t / 2, t / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, t, t);
}

const TRACES = { feuille, petale, flocon, luciole };

// --- l'effet -----------------------------------------------------------------

const RAYON_MIN = 5, RAYON_MAX = 28, RAYON_OUBLI = 36;
const HAUT_MAX_VOL = 25;      // plus haut que cela au-dessus du sol, on ne dessine rien
const ESSAIS_PAR_IMAGE = 24;  // naissances tentées au plus par image

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(),
  _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const _plat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const _yaw = new THREE.Quaternion(), _axeY = new THREE.Vector3(0, 1, 0);
const hasard = (a, b) => a + Math.random() * (b - a);

export function creerEffetSaison(cle = saisonCourante(typeof location !== 'undefined' ? location.search : '')) {
  const S = SAISONS[cle];
  const tex = new THREE.CanvasTexture(canvasDe(TRACES[S.forme]));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  const mat = S.lueur
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false })
    : new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(1, 1);
  const N = S.nb;
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.name = 'saison-' + S.forme;
  mesh.frustumCulled = false;      // les instances bougent : pas de sphère à tenir
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < N; i++) {
    mesh.setColorAt(i, _c.setHex(S.teintes[i % S.teintes.length]));
    mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
  }
  mesh.instanceColor.needsUpdate = true;

  // état par particule
  const colX = new Int32Array(N), colZ = new Int32Array(N);
  const x = new Float32Array(N), y = new Float32Array(N), z = new Float32Array(N), g = new Float32Array(N);
  const etat = new Uint8Array(N);          // 0 à naître, 1 chute, 2 posée, 3 s'efface
  const t = new Float32Array(N), vie = new Float32Array(N), taille = new Float32Array(N);
  const vchute = new Float32Array(N), ph = new Float32Array(N), ra = new Float32Array(N),
    rb = new Float32Array(N), rc = new Float32Array(N), cap = new Float32Array(N);
  let temps = 0, vivantes = 0, posees = 0, aNaitre = N;

  function naitre(i, px, pz, sol) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(hasard(RAYON_MIN * RAYON_MIN, RAYON_MAX * RAYON_MAX));
    const nx = px + Math.cos(a) * r, nz = pz + Math.sin(a) * r;
    const sg = sol(nx, nz);
    if (sg == null) return false;
    x[i] = nx; z[i] = nz; g[i] = sg; colX[i] = Math.floor(nx); colZ[i] = Math.floor(nz);
    y[i] = sg + hasard(S.haut[0], S.haut[1]);
    etat[i] = 1; t[i] = 0;
    vie[i] = hasard(S.pose[0], S.pose[1]);
    taille[i] = hasard(S.taille[0], S.taille[1]);
    vchute[i] = hasard(S.chute[0], S.chute[1]);
    ph[i] = Math.random() * 100;
    ra[i] = hasard(-2.4, 2.4); rb[i] = hasard(-1.6, 1.6); rc[i] = hasard(-2, 2);
    cap[i] = Math.random() * Math.PI * 2;
    return true;
  }

  // dt en secondes de jeu ; `sol(x, z)` rend la cote où une particule se pose,
  // ou null si le morceau n'est pas là ; `solJoueur` la cote sous l'enfant.
  function avancer(dt, { px, py, pz, camera, sol, solJoueur, actif = true }) {
    temps += dt;
    if (!actif || solJoueur == null || py > solJoueur + HAUT_MAX_VOL) { mesh.visible = false; return; }
    mesh.visible = true;
    let essais = ESSAIS_PAR_IMAGE;
    vivantes = 0; posees = 0; aNaitre = 0;
    for (let i = 0; i < N; i++) {
      let e = etat[i];
      if (e === 0) {
        if (essais > 0) { essais--; if (naitre(i, px, pz, sol)) e = 1; }
        if (e === 0) { aNaitre++; mesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
      }
      t[i] += dt;
      const dx = x[i] - px, dz = z[i] - pz;
      if (e !== 3 && dx * dx + dz * dz > RAYON_OUBLI * RAYON_OUBLI) { e = 3; t[i] = 0.5; }
      let k = 1;                           // échelle d'apparition / d'effacement
      if (e === 1) {
        if (S.lueur) {
          // la luciole flâne au ras de l'herbe et clignote ; elle ne se pose pas
          const f = temps * 0.7 + ph[i];
          x[i] += Math.sin(f * 1.3) * 0.6 * dt; z[i] += Math.cos(f * 1.1) * 0.6 * dt;
          y[i] = g[i] + S.haut[0] + (S.haut[1] - S.haut[0]) * (0.5 + 0.5 * Math.sin(f * 0.5));
          k = 0.35 + 0.65 * Math.max(0, Math.sin(temps * 2.1 + ph[i] * 3));
          if (t[i] > 14) { e = 3; t[i] = 0; }
        } else {
          // elle plane : une descente lente qui oscille, une dérive de côté
          const f = temps * 1.6 + ph[i];
          y[i] -= vchute[i] * (0.65 + 0.35 * Math.sin(f * 1.7)) * dt;
          x[i] += (Math.sin(f) * 0.9 + 0.25) * dt;
          z[i] += Math.cos(f * 0.8) * 0.6 * dt;
          // elle a dérivé sur une autre colonne : ce qui la porte a changé (un
          // arbre qu'elle quitte, un talus) — sinon elle se poserait en l'air
          const kx = Math.floor(x[i]), kz = Math.floor(z[i]);
          if (kx !== colX[i] || kz !== colZ[i]) {
            colX[i] = kx; colZ[i] = kz;
            const sg = sol(x[i], z[i]);
            if (sg != null) g[i] = sg;
          }
          if (y[i] <= g[i] + 0.03) {
            // arrivée contre plus haut qu'elle (le flanc d'un arbre) : elle s'y arrête
            if (y[i] > g[i] - 0.6) y[i] = g[i] + 0.03;
            e = 2; t[i] = 0;
          }
        }
        if (t[i] < 0.4 && e === 1) k = Math.min(k, t[i] / 0.4);
      } else if (e === 2) {
        if (t[i] > vie[i]) { e = 3; t[i] = 0; }
      }
      if (e === 3) {
        k = Math.max(0, 1 - t[i] / 0.6);
        if (k <= 0) { etat[i] = 0; aNaitre++; mesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
      }
      etat[i] = e;
      vivantes++;
      if (e === 2) posees++;
      // orientation
      if (S.forme === 'flocon' || S.lueur) {
        _q.copy(camera.quaternion);       // un flocon, une luciole font face
      } else if (e === 2) {
        _yaw.setFromAxisAngle(_axeY, cap[i]);
        _q.copy(_yaw).multiply(_plat);    // à plat sur ce qui la porte
      } else {
        const f = temps + ph[i];
        _e.set(f * ra[i], cap[i] + f * rb[i], f * rc[i]);
        _q.setFromEuler(_e);              // elle tourne sur elle-même en tombant
      }
      const sz = taille[i] * k;
      _p.set(x[i], y[i], z[i]);
      _s.set(sz, sz, sz);
      mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // la chauffe pendant l'accueil : ce maillage-là, une scène à part, les
  // lumières du décor (règle de `renderer.compile`, v306).
  function chauffer(renderer, camera, decor) {
    const ici = new THREE.Scene();
    const vis = mesh.visible, parent = mesh.parent;
    mesh.visible = true;
    ici.add(mesh);                        // `add` le retire de son parent…
    renderer.compile(ici, camera, decor);
    ici.remove(mesh);
    if (parent) parent.add(mesh);         // … on l'y remet
    mesh.visible = vis;
  }

  // pour les témoins
  function etatSaison() {
    const hauts = [], ecarts = [];
    for (let i = 0; i < N; i++) if (etat[i] === 1 || etat[i] === 2) { hauts.push(y[i]); ecarts.push(y[i] - g[i]); }
    return { saison: S.nom, forme: S.forme, nb: N, vivantes, posees, aNaitre, visible: mesh.visible,
      ecartMax: ecarts.length ? Math.max(...ecarts) : null, hauts: hauts.slice(0, 12) };
  }

  // pour un témoin : la position d'une particule vivante
  function particule(i) { return { x: x[i], y: y[i], z: z[i], g: g[i], etat: etat[i] }; }

  return { mesh, avancer, chauffer, etat: etatSaison, particule, saison: S };
}
