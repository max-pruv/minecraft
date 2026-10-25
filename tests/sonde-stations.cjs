// L'ENFANT DESCEND-IL DANS LE MÉTRO ? (v529). Max : « on ne peut même pas
// marcher dedans, le personnage ne passe pas en hauteur. »
//
// La sonde de la v473 marchait sur une GRILLE : une marche d'un bloc au plus,
// deux blocs d'air au-dessus des pieds. Elle disait « 16 sur 16 » et ne voyait
// pas Washington : deux quais sur vingt y étaient atteignables (escalier posé
// au-dessus de la fosse des voies, couloir coupé par le gabarit d'une rame,
// bouche qui sortait de la zone creusée). Le vrai joueur (player.js) n'a pas de
// marche automatique : pour monter une marche il SAUTE (8,6 b/s, pesanteur 26 :
// 1,42 bloc) et il mesure 1,8. Sous trois blocs d'air, sa tête cogne au sommet
// du saut — il passe encore, de 0,2 bloc ; sous deux, il ne passe plus. La
// marge qu'on veut est donc QUATRE blocs, et la sonde compte les cases où on
// ne l'a pas (« sous 4 »), à l'aller comme au retour.
//
// Ce qu'elle mesure, station par station, sous node, sur le vrai monde :
//   1. un chemin à la grille, de la rue au quai (la règle de la v473) ;
//   2. le long de ce chemin : la hauteur libre au-dessus des pieds (la plus
//      petite), les marches dont l'élan cogne le plafond, la largeur libre ;
//   3. le VRAI joueur qui suit ce chemin, joystick en avant, saut quand la
//      marche d'après est plus haute — arrive-t-il sur le quai, et sinon où
//      bute-t-il, et sous combien de plafond ;
//   4. le quai : la hauteur libre sur toute sa longueur, au bord et au mur ;
//   5. le gabarit des rames : un bloc plein sur leur passage est un train muré.
//
// Exporte `mesurer(racine)` pour plafond.js ; lancée seule, imprime la table :
//   node tests/sonde-stations.cjs [racine du dépôt]
const path = require('path');
const { pathToFileURL } = require('url');

async function mesurer(racine, { joueur = true, seul = null, garderPts = false } = {}) {
  const { register } = require('node:module');
  const trois = pathToFileURL(path.resolve(racine, 'vendor/three.module.min.js')).href;
  register('data:text/javascript,' + encodeURIComponent(
    `export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
  const u = (f) => pathToFileURL(path.resolve(racine, 'src', f)).href;
  const { Player } = await import(u('player.js'));
  const W = await import(u('world.js'));
  const V = await import(u('ville.js'));
  const D = await import(u('washington.js'));
  const B = await import(u('blocks.js'));
  const w = new W.World();
  const cam = { position: { copy() {} }, rotation: { set() {} } };
  const bloc = (x, y, z) => w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
  const plein = (x, y, z) => B.isSolid(bloc(x, y, z));
  const ok = (x, y, z) => plein(x, y - 1, z) && !plein(x, y, z) && !plein(x, y + 1, z);
  // l'air libre au-dessus des pieds, borné à huit
  const libre = (x, y, z) => { let n = 0; while (n < 8 && !plein(x, y + n, z)) n++; return n; };

  const chemin = (x0, z0, cible, rayon, propre = () => true) => {
    const h0 = w.terrainHeight(Math.floor(x0), Math.floor(z0));
    let pied = null;
    for (let y = h0 + 2; y >= h0 - 6; y--) if (ok(x0, y, z0)) { pied = y; break; }
    if (pied === null) return { depart: false };
    const depart = [Math.floor(x0), pied, Math.floor(z0)];
    const de = new Map();
    const k0 = depart.join(',');
    de.set(k0, null);
    const file = [depart];
    let fin = null;
    for (let i = 0; i < file.length && i < 80000; i++) {
      const [x, y, z] = file[i];
      if (cible(x, y, z)) { fin = file[i]; break; }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (Math.abs(nx - depart[0]) > rayon || Math.abs(nz - depart[2]) > rayon) continue;
        for (const dy of [0, 1, -1]) {
          const ny = y + dy;
          if (dy === 1 && plein(x, y + 2, z)) continue;
          if (dy === -1 && plein(nx, y + 1, nz)) continue;
          if (!ok(nx, ny, nz)) continue;
          // sous la rue, on ne descend que dans SA bouche et SA station : une
          // bouche murée qu'on contourne par l'escalier d'à côté n'est pas une
          // bouche (Hôtel de Ville, sous le monument, l'était — v473)
          if (ny < h0 - 1 && !propre(nx, nz)) continue;
          const k = `${nx},${ny},${nz}`;
          if (!de.has(k)) { de.set(k, `${x},${y},${z}`); file.push([nx, ny, nz]); }
          break;
        }
      }
    }
    if (!fin) return { depart: true, arrive: false, cases: de.size };
    const pts = [];
    for (let k = fin.join(','); k; k = de.get(k)) pts.push(k.split(',').map(Number));
    pts.reverse();
    // ce que l'enfant rencontre sur ce chemin
    let hautMin = 9, sautsBas = 0, sautsRetour = 0, largMin = 9, ouBas = null, sous4 = 0; const r = {};
    for (let i = 0; i < pts.length; i++) {
      const [x, y, z] = pts[i];
      const hl = libre(x, y, z);
      if (hl < hautMin) { hautMin = hl; ouBas = [x, y, z]; }
      if (hl < 4) { sous4++; if (process.env.DIAG) console.log('  bas', hl, x, y, z, 'sol', w.terrainHeight(x, z), 'dessus', bloc(x, y + hl, z)); }
      if (i + 1 < pts.length && pts[i + 1][1] > y && hl < 4) sautsBas++;
      // et au retour, du quai à la rue : chaque marche se monte en sautant
      if (i > 0 && pts[i - 1][1] > y && hl < 4) sautsRetour++;
      if (i > 0 && i + 1 < pts.length) {
        // la largeur : la plus longue file de cases où l'on tient debout, à
        // travers ce point, selon x ou selon z (un passage d'une case dans les
        // deux sens est un goulet)
        let l = 0;
        for (const [px, pz] of [[1, 0], [0, 1]]) {
          let n = 1;
          for (const s of [1, -1]) for (let d = 1; d <= 4; d++) {
            if (!ok(x + px * s * d, y, z + pz * s * d)) break;
            n++;
          }
          l = Math.max(l, n);
        }
        if (l < largMin) { largMin = l; r.ouEtroit = [x, y, z]; }
      }
    }
    return { depart: true, arrive: true, pts, hautMin, sous4, sautsBas, sautsRetour, largMin, ouBas, ouEtroit: r.ouEtroit };
  };

  // le vrai joueur suit le chemin : joystick en avant, saut devant une marche
  const marcher = (pts) => {
    const p = new Player(cam, w);
    const [x0, y0, z0] = pts[0];
    p.pos.set(x0 + 0.5, y0 + 1e-3, z0 + 0.5); p.onGround = true;
    let i = 1, t = 0, depuis = 0;
    while (t < 240 && i < pts.length) {
      const [nx, ny, nz] = pts[i];
      const dx = nx + 0.5 - p.pos.x, dz = nz + 0.5 - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3 && p.pos.y > ny - 0.3) { i++; depuis = 0; continue; }
      p.yaw = Math.atan2(-dx, -dz);
      p.touchMove.f = Math.min(1, d * 2 + 0.2);
      if (ny > Math.floor(p.pos.y + 0.01) && p.onGround && d < 1.4) p.keys.add('Space'); else p.keys.delete('Space');
      p.update(1 / 30); t += 1 / 30; depuis += 1 / 30;
      if (depuis > 6) break;
    }
    const fx = Math.floor(p.pos.x), fy = Math.floor(p.pos.y + 0.01), fz = Math.floor(p.pos.z);
    return {
      arrive: i >= pts.length, secondes: +t.toFixed(1), etape: i, sur: pts.length,
      bute: i >= pts.length ? null : { x: fx, y: fy, z: fz, vers: pts[i], plafond: libre(fx, fy, fz) },
    };
  };

  const out = [];
  // --- Paris, la ligne 1
  const yr = V.LIGNE1.voie;
  for (const b of V.BOUCHES_LIGNE1) {
    if (!b) continue;
    if (seul && !seul.test(b.nom)) continue;
    const q = b.q;
    const surQuai = (x, y, z) => {
      if (y !== yr + 2) return false;
      const ex = x + 0.5 - q.x, ez = z + 0.5 - q.z;
      const le = ex * q.dx + ez * q.dz, tr = Math.abs(-ex * q.dz + ez * q.dx);
      return Math.abs(le) <= V.LIGNE1.demiStation - 1 && tr >= V.LIGNE1.quai + 0.5 && tr <= V.LIGNE1.demiVoute - 1.5;
    };
    const propre = (x, z) => {
      const ex = x + 0.5 - q.x, ez = z + 0.5 - q.z;
      const le = ex * q.dx + ez * q.dz, tr = -ex * q.dz + ez * q.dx;
      if (Math.abs(le) <= V.LIGNE1.demiStation + 1 && Math.abs(tr) <= V.LIGNE1.demiVoute + 1) return true;
      for (let m = -8; m <= V.LONG_ESC + 3; m++) {
        const [px, pz] = V.pointEsc(q, b, m, 0);
        if (Math.abs(px - x - 0.5) <= 4.5 && Math.abs(pz - z - 0.5) <= 4.5) return true;
      }
      // le couloir, du quai au pied de l'escalier
      const lat = tr * b.cote, leQ = le - b.a;
      return Math.abs(leQ - (b.cq || 0)) <= 2 && lat >= 0 && lat <= b.o + 3;
    };
    const c = chemin(b.tx, b.tz, surQuai, 60, propre);
    // le quai : la hauteur libre, de bout en bout, au bord et contre le mur
    let quaiMin = 9;
    for (let le = -V.LIGNE1.demiStation + 1; le <= V.LIGNE1.demiStation - 1; le++) {
      for (const tr of [V.LIGNE1.quai + 1.1]) for (const s of [1, -1]) {
        const x = q.x + q.dx * le - q.dz * tr * s, z = q.z + q.dz * le + q.dx * tr * s;
        quaiMin = Math.min(quaiMin, libre(x, yr + 2, z));
        if (process.env.DIAG && libre(x, yr + 2, z) < 3) console.log('quai bas', b.nom, le, tr * s, Math.floor(x), Math.floor(z), bloc(x, yr + 2, z), bloc(x, yr + 1, z));
      }
    }
    if (process.env.CHEMIN && c.pts) for (const [x, y, z] of c.pts) {
      const ex = x + 0.5 - q.x, ez = z + 0.5 - q.z;
      console.log('   ', x, y, z, 'le', (ex * q.dx + ez * q.dz).toFixed(1), 'tr', (-ex * q.dz + ez * q.dx).toFixed(1), 'libre', libre(x, y, z));
    }
    const r = { ville: 'Paris', nom: b.nom, quaiMin, ...c, pts: garderPts ? c.pts : undefined };
    if (joueur && c.arrive) { r.joueur = marcher(c.pts); r.retour = marcher(c.pts.slice().reverse()); }
    out.push(r);
  }
  // --- Washington, ses quatre lignes et leurs vingt quais
  for (const b of D.BOUCHES_METRO) {
    if (seul && !seul.test(b.nom)) continue;
    const X = D.WASHINGTON.x, Z = D.WASHINGTON.z;
    const q = D.QUAIS_METRO.find((s) => s.nom === b.nom);
    const surQuai = (x, y, z) => {
      if (y !== q.y + 2) return false;
      const eu = x + 0.5 - X - q.u, ev = z + 0.5 - Z - q.v;
      const le = eu * q.du + ev * q.dv, tr = Math.abs(eu * -q.dv + ev * q.du);
      return Math.abs(le) <= 10 && tr <= 1.6;
    };
    const lg = b.longueur - 0.5;
    const propre = (x, z) => {
      const eu = x + 0.5 - X - q.u, ev = z + 0.5 - Z - q.v;
      const le = eu * q.du + ev * q.dv, tr = eu * -q.dv + ev * q.du;
      if (Math.abs(le) <= 20 && Math.abs(tr) <= 16) return true;   // la station, sa mezzanine
      const lb = eu * b.nu + ev * b.nv, tb = eu * -b.nv + ev * b.nu;
      return lb >= -2 && lb <= b.longueur + 4 && Math.abs(tb) <= 4;
    };
    const c = chemin(X + b.u + b.nu * lg, Z + b.v + b.nv * lg, surQuai, 70, propre);
    let quaiMin = 9;
    const k0 = q.k0 === undefined ? 7 : q.k0, fin = q.fin || 1;
    for (let le = -11; le <= 11; le++) for (const tr of [1.5, -1.5]) {
      if (le * fin >= k0 - 1 && le * fin <= k0 + 6) continue;   // l'escalier du quai     // au bord, de part et d'autre des pylônes
      const x = X + q.u + q.du * le - q.dv * tr, z = Z + q.v + q.dv * le + q.du * tr;
      quaiMin = Math.min(quaiMin, libre(x, q.y + 2, z));
    }
    const r = { ville: 'Washington', nom: b.nom, quaiMin, ...c, pts: garderPts ? c.pts : undefined };
    if (joueur && c.arrive) { r.joueur = marcher(c.pts); r.retour = marcher(c.pts.slice().reverse()); }
    out.push(r);
  }

  // --- le gabarit des rames, partout : un bloc plein dans le passage
  let gabarit = 0, lus = 0;
  const passage = (pts, yOf) => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b2 = pts[(i + 1) % pts.length];
      const n = Math.max(1, Math.ceil(Math.hypot(b2.x - a.x, b2.z - a.z) * 2));
      for (let k = 0; k < n; k++) {
        const x = a.x + ((b2.x - a.x) * k) / n, z = a.z + ((b2.z - a.z) * k) / n;
        const y0 = yOf(a, b2, k / n);
        lus++;
        for (let y = y0 + 1; y <= y0 + 2; y++) if (plein(x, y, z)) gabarit++;
      }
    }
  };
  passage(V.traceLigne1Paris(), () => yr);
  for (const l of D.LIGNES) passage(D.traceLigneMetro(l.nom), (a, b2, t) => Math.round(a.y - 0.4 + (b2.y - a.y) * t));
  // --- le nom de chaque station : où `stations.js` l'écrit (des règles pures
  // de ville.js et washington.js), relu contre le monde engendré. Le plan ne
  // doit entrer dans aucun bloc, et il doit être adossé à ce qui le porte —
  // le piédroit, le mur d'en face, le pylône (dont il déborde : on ne lit
  // alors que son milieu).
  const noms = { absents: [], dans: 0, flottants: 0, plaques: 0, stations: 0 };
  const listes = [V.plaquesParis ? V.plaquesParis() : null, D.plaquesDC ? D.plaquesDC() : null];
  const attendus = [...V.QUAIS_LIGNE1.map((q) => q.nom), ...D.QUAIS_METRO.map((q) => q.nom)];
  const parNom = new Map();
  for (const l of listes) if (l) for (const st of l) parNom.set(st.ville + '|' + st.nom, st);
  for (const q of V.QUAIS_LIGNE1) if (!(parNom.get('Paris|' + q.nom) || { plaques: [] }).plaques.length) noms.absents.push(q.nom);
  for (const q of D.QUAIS_METRO) if (!(parNom.get('Washington|' + q.nom) || { plaques: [] }).plaques.length) noms.absents.push(q.nom);
  noms.stations = attendus.length - noms.absents.length;
  for (const st of parNom.values()) {
    for (const p of st.plaques) {
      noms.plaques++;
      const ax = -p.nz, az = p.nx;
      const pylone = p.sur === 'pylone';
      let dans = 0, adosse = 0, n = 0;
      for (let i = -4; i <= 4; i++) for (let j = -2; j <= 2; j++) {
        const a = (p.larg / 2) * (i / 4.2), x = p.x + ax * a, y = p.y + (p.haut / 2) * (j / 2.2), z = p.z + az * a;
        if (plein(x + p.nx * 0.01, y, z + p.nz * 0.01)) dans++;
        if (pylone && Math.abs(i) > 1) continue;
        n++;
        for (let e = 0.05; e <= 1.2; e += 0.05) if (plein(x - p.nx * e, y, z - p.nz * e)) { adosse++; break; }
      }
      if (dans) noms.dans++;
      if (adosse < 0.75 * n) { noms.flottants++; (noms.quiFlotte ||= []).push(`${st.nom} ${adosse}/${n}`); }   // un mur en biais fait des marches : le bout du plan peut s'en écarter
    }
  }
  return { stations: out, gabarit, lus, noms };
}

module.exports = { mesurer };

if (require.main === module) {
  (async () => {
    const racine = path.resolve(process.argv[2] || path.resolve(__dirname, '..'));
    const seul = process.env.SEUL ? new RegExp(process.env.SEUL) : null;
    const r = await mesurer(racine, { seul });
    for (const s of r.stations) {
      const j = s.joueur;
      console.log([s.ville.padEnd(10), s.nom.padEnd(30),
        s.arrive ? 'chemin' : 'PAS DE CHEMIN',
        `plafond ${s.hautMin ?? '-'} (${s.sous4 ?? '-'} cases sous 4)`, `élans cognés ${s.sautsBas ?? '-'}/${s.sautsRetour ?? '-'}`, `largeur ${s.largMin ?? '-'}`,
        `quai ${s.quaiMin}`,
        process.env.DIAG ? `bas ${s.ouBas} étroit ${s.ouEtroit}` : '',
        j ? (j.arrive ? `descend ${j.secondes}s` : `descente BUTE ${JSON.stringify(j.bute)} ${j.etape}/${j.sur}`) : '',
        s.retour ? (s.retour.arrive ? `remonte ${s.retour.secondes}s` : `remontée BUTE ${JSON.stringify(s.retour.bute)} ${s.retour.etape}/${s.retour.sur}`) : '',
      ].join(' · '));
    }
    const n = r.stations.length, ar = r.stations.filter((s) => s.joueur && s.joueur.arrive).length;
    const re = r.stations.filter((s) => s.retour && s.retour.arrive).length;
    console.log(`\n${ar}/${n} quais atteints par le vrai joueur, ${re}/${n} rues retrouvées en remontant · gabarit des rames : ${r.gabarit} pleins sur ${r.lus}`);
    console.log('noms :', JSON.stringify(r.noms));
  })();
}
