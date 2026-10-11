// TOUTES LES VOIES OCCUPÉES (v415) — le passage du témoin de `carteMonde.js`,
// jouable seul sur deux arbres (la règle de la v400 : le témoin appelle la
// sonde telle quelle, une copie finirait par diverger).
// Usage seul : node tests/sonde-voies-occupees.cjs
const mesurerVoies = (tab) => tab.evaluate(async () => {
      const g = window.__game, V = window.__vehicules, dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      const [ro, pa] = await Promise.all([import('./src/routes.js'), import('./src/paris.js')]);
      const avant = g.player.pos.clone(), volait = g.player.flying;
      const out = { a1: { droite: 0, gauche: 0, cheval: 0, files: 0 }, paris: { exterieure: 0, interieure: 0, files: 0 }, grille: null };
      // L'A1, en pleine section : la seconde voie se pose quand l'enfant approche
      const s = ro.segmentsDeRoute().find((x) => x.route.nom === 'A1');
      const m = ro.pointA(s, s.longueur * 0.4);
      g.player.flying = true; g.player.pos.set(m.x, 80, m.z); g.player.vel.set(0, 0, 0);
      await dodo(1500);
      const et = V.etat() || [];
      et.forEach((c, ci) => {
        if (c.route !== 'A1') return;
        out.a1.files++;
        for (let d = 0; d < c.longueur; d += 2) {
          const q = V.point(ci, d - c.distance);
          const r = q && ro.routeEn(Math.floor(q.x), Math.floor(q.z));
          if (!r || r.piece !== 'chaussee' || ro.largeurA(r.seg, r.s).demiChaussee < 6.9) continue;
          const l = Math.abs(r.d);
          if (l > 5.1 && l < 6.4) out.a1.droite++; else if (l > 1.6 && l < 2.9) out.a1.gauche++; else if (l > 3.4 && l < 4.6) out.a1.cheval++;
        }
      });
      // une jumelle se pose à l'heure de sa file (v305) : la même fonction de l'horloge
      const jum = et.find((c) => c.jumeau && c.route === 'A1');
      const file = jum && et.find((c) => c.route === 'A1' && c.jumelle);
      if (jum && file && g.vehicules.distanceA) {
        let pire = 0;
        // la jumelle passe partout où passe sa file, `retardHoraire` secondes
        // plus tard — à l'horloge, donc sur toutes les tablettes
        for (const h of [10, 123.4, 977.7]) {
          const dB = g.vehicules.distanceA(jum.cle, h), dA = g.vehicules.distanceA(file.cle, h - jum.retardHoraire);
          if (dB === null || dA === null) { pire = Infinity; break; }
          const e = Math.abs(dA - dB) % jum.longueur;
          pire = Math.max(pire, Math.min(e, jum.longueur - e));
        }
        out.grille = { ecartMax: Math.round(pire * 1000) / 1000, retard: Math.round(jum.retardHoraire * 100) / 100 };
      }
      // Paris : les percées de premier rang, à la section de la règle (`sectionDeVoie`)
      const P = pa.PARIS;
      g.player.pos.set(P.x, 80, P.z);
      await dodo(8000);
      const bds = pa.VOIES_PARIS.filter((v) => v.type === 'boulevard').map((v) => ({ l: v.l, pts: v.pts.map(([u, w]) => [P.x + u, P.z + w]) }));
      const lat = (x, z) => {
        let best = Infinity;
        for (const v of bds) for (let i = 0; i + 1 < v.pts.length; i++) {
          const [ax, az] = v.pts[i], [bx, bz] = v.pts[i + 1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
          const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
          if (d < v.l - 1 && d < best) best = d;
        }
        return best;
      };
      (V.etat() || []).forEach((c, ci) => {
        if (!c.routier || c.route || c.nom !== 'voiture') return;
        const q0 = V.point(ci, 0);
        if (!q0 || Math.hypot(q0.x - P.x, q0.z - P.z) > 400) return;
        out.paris.files++;
        for (let d = 0; d < c.longueur; d += 2) {
          const q = V.point(ci, d - c.distance), l = lat(q.x, q.z);
          if (l > 3.9 && l < 5.9) out.paris.exterieure++; else if (l > 0.6 && l < 2.4) out.paris.interieure++;
        }
      });
      g.player.pos.copy(avant); g.player.flying = volait;
      return out;
    });
module.exports = { mesurerVoies };
if (require.main === module) {
  const { Banc, souffler } = require('./banc.js');
  (async () => {
    const banc = new Banc({ portJeu: 8433, portPairs: 9433 });
    await banc.ouvrir();
    try {
      await souffler();
      const tab = await banc.jouerSeul('SondeVoies');
      console.log(JSON.stringify(await mesurerVoies(tab)));
    } finally { await banc.fermer(); process.exit(0); }
  })();
}
