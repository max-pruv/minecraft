// LES AMIS BOUGENT EN TEMPS RÉEL (amis-fluides).
//
// Max : « Tu le vois bouger de manière saccadée, toutes les secondes il a
// avancé… c'est pas très real time. » L'ami était dessiné en courant après la
// DERNIÈRE position reçue : au volant, un relevé vaut des blocs, et par le
// nuage les relevés arrivent par paquets toutes les demi-secondes — l'ami
// bondissait puis s'arrêtait (mesuré par `sonde-amis-fluides.cjs`).
//
// Le remède est celui de tous les jeux en ligne : chaque relevé porte l'heure
// de SON envoi (`ts`, l'horloge de la tablette qui l'envoie), et l'on rejoue
// l'ami avec un léger retard, en INTERPOLANT entre deux relevés. Les deux
// horloges n'ont pas la même origine : on n'a pas besoin qu'elles s'accordent,
// seulement de l'écart entre elles, qu'on estime comme le plus petit délai vu
// (un relevé n'arrive jamais AVANT d'être parti). Le retard suit ce que le
// chemin impose — un lien direct quelques dixièmes, le nuage plus — et se
// règle tout seul. Quand le relevé suivant manque, on prolonge le mouvement
// au plus `EXTRAPOLE_MAX` ms, puis l'ami attend.
//
// Tout compte en temps RÉEL (`performance.now()`), jamais en `dt` (v226) : la
// position d'un ami est une fonction de l'horloge, pas de la cadence d'ici.
// Pur, sans import : lu sous node par un témoin de `reseau.js`.

export const RETARD_MIN = 160;      // ms : le pas d'envoi (120) plus de quoi absorber un hoquet
export const RETARD_MAX = 1500;     // ms : au-delà, l'ami serait dessiné trop loin dans le passé
export const MARGE = 60;            // ms de plus que le pire délai vu récemment
export const FENETRE = 4000;        // ms de relevés sur lesquels on juge le délai
export const EXTRAPOLE_MAX = 500;   // ms de prolongement quand le suivant manque : une page qui cale en perd autant
export const SAUT = 60;             // blocs : au-delà d'un relevé à l'autre, c'est une téléportation
const DESCENTE = 0.12;              // le retard ne baisse que de 12 % du temps écoulé : l'ami accélère à peine
const MONTEE = 0.5;                 // et ne monte que de la moitié : au pire, l'ami ralentit de moitié

export function creerSuivi() {
  return { rel: [], lats: [], decal: null, retard: null, dernierTs: -Infinity, recus: 0 };
}

function reinitialiser(s) {
  s.rel.length = 0; s.lats.length = 0; s.decal = null; s.retard = null; s.dernierTs = -Infinity;
}

// Un relevé reçu à l'instant `maintenant` (horloge d'ici). `m.ts` est l'heure
// d'envoi sur l'horloge de l'autre ; une tablette restée sur l'ancienne
// version n'en envoie pas, et l'on prend alors l'heure d'arrivée — le
// receveur cède, et c'est l'ancien comportement à un retard près.
export function recevoir(s, m, maintenant) {
  const ts = Number.isFinite(m.ts) ? m.ts : maintenant;
  if (ts <= s.dernierTs) {
    if (ts < s.dernierTs - 2000) { reinitialiser(s); }   // l'autre a rechargé sa page : nouvelle horloge
    else {
      // UN RELEVÉ EN RETARD SE RANGE À SA PLACE. Par le nuage, deux écritures
      // parties ensemble se publient dans le désordre : le relevé d'avant
      // arrive après celui d'après. Il comble un trou, on le garde.
      const r = s.rel;
      if (!r.length || ts <= r[0].ts || r.some((x) => x.ts === ts)) return false;
      let i = r.length - 1;
      while (i > 0 && r[i - 1].ts > ts) i--;
      r.splice(i, 0, { ts, x: m.x, y: m.y, z: m.z, yaw: m.yaw || 0, vx: m.vx, vz: m.vz });
      s.recus++;
      return true;
    }
  }
  const der = s.rel[s.rel.length - 1];
  if (der && Math.hypot(m.x - der.x, m.z - der.z) > SAUT && Math.hypot(m.x - der.x, m.z - der.z) / Math.max(0.05, (ts - der.ts) / 1000) > 300) {
    reinitialiser(s);                             // une téléportation se pose, elle ne glisse pas
  }
  const lat = maintenant - ts;
  // ce qu'il faut attendre pour avoir CE relevé quand on dessine encore le
  // précédent : son délai, plus l'écart qui les sépare — par le nuage, les
  // relevés arrivent une demi-seconde à la fois, et c'est cet écart qui compte
  const prec = s.rel[s.rel.length - 1];
  const ecart = prec && ts - prec.ts < FENETRE ? ts - prec.ts : 0;
  s.lats.push([maintenant, lat, ecart]);
  while (s.lats.length && s.lats[0][0] < maintenant - FENETRE) s.lats.shift();
  // l'écart entre les deux horloges : le plus petit délai jamais vu. Jamais
  // remonté (un écart qui remonte ferait reculer l'ami) ; deux horloges de
  // tablette dérivent de quelques millisecondes par heure, sans conséquence.
  s.decal = s.decal == null ? lat : Math.min(s.decal, lat);
  // le 9e décile, pas le pire : une page qui a calé une seconde reçoit tous
  // ses relevés d'un coup, et régler le retard sur elle mettrait l'ami une
  // seconde dans le passé pour toujours ; le relevé rare qui manque se
  // prolonge (`EXTRAPOLE_MAX`)
  const tri = s.lats.map((l) => l[1] + l[2]).sort((a, b) => a - b);
  const pire = tri[Math.min(tri.length - 1, Math.floor(tri.length * 0.9))] - s.decal;
  const voulu = Math.min(RETARD_MAX, Math.max(RETARD_MIN, pire + MARGE));
  if (s.retard == null) s.retard = voulu;
  s.voulu = voulu;
  s.rel.push({ ts, x: m.x, y: m.y, z: m.z, yaw: m.yaw || 0, vx: m.vx, vz: m.vz });
  while (s.rel.length > 2 && s.rel[1].ts < ts - FENETRE) s.rel.shift();
  s.dernierTs = ts;
  s.recus++;
  return true;
}

function angle(a, b, f) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * f;
}

// Où dessiner l'ami à l'instant `maintenant`. `null` tant qu'aucun relevé.
export function positionA(s, maintenant, dtReel = 0) {
  const r = s.rel;
  if (!r.length) return null;
  // le retard redescend doucement vers ce que le chemin demande (un lien qui
  // s'améliore) : le temps de l'ami avance alors un peu plus vite que le nôtre
  // et il MONTE vite mais sans sauter (un chemin qui se dégrade) : un retard
  // qui saute ferait reculer l'ami ; à mi-vitesse, il ralentit un instant
  if (s.voulu != null && s.retard > s.voulu) s.retard = Math.max(s.voulu, s.retard - dtReel * 1000 * DESCENTE);
  else if (s.voulu != null && s.retard < s.voulu) s.retard = Math.min(s.voulu, s.retard + dtReel * 1000 * MONTEE);
  const t = maintenant - s.decal - s.retard;
  if (t <= r[0].ts || r.length === 1) {
    const a = r[t <= r[0].ts ? 0 : r.length - 1];
    if (r.length === 1 && t > a.ts && Number.isFinite(a.vx)) {
      const e = Math.min(EXTRAPOLE_MAX, t - a.ts) / 1000;
      return { x: a.x + a.vx * e, y: a.y, z: a.z + (a.vz || 0) * e, yaw: a.yaw, extrapole: true };
    }
    return { x: a.x, y: a.y, z: a.z, yaw: a.yaw };
  }
  const der = r[r.length - 1];
  if (t >= der.ts) {
    // le suivant manque : on prolonge, borné, à la vitesse annoncée ou
    // mesurée sur les deux derniers relevés
    const av = r[r.length - 2];
    const dts = Math.max(1, der.ts - av.ts) / 1000;
    const vx = Number.isFinite(der.vx) ? der.vx : (der.x - av.x) / dts;
    const vz = Number.isFinite(der.vz) ? der.vz : (der.z - av.z) / dts;
    const vy = (der.y - av.y) / dts;
    const e = Math.min(EXTRAPOLE_MAX, t - der.ts) / 1000;
    return { x: der.x + vx * e, y: der.y + vy * e, z: der.z + vz * e, yaw: der.yaw, extrapole: true };
  }
  let i = r.length - 2;
  while (i > 0 && r[i].ts > t) i--;
  const a = r[i], b = r[i + 1];
  const f = (t - a.ts) / Math.max(1, b.ts - a.ts);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, yaw: angle(a.yaw, b.yaw, f) };
}
