// GROS PLANS DES CORPS : ORIGINAUX CONTRE KTX2 (chantier 5).
// Usage : node tests/sonde-captures-ktx2-corps.cjs <dossier>
//
// Quatre corps posés côte à côte, au point d'apparition ; une caméra à part
// filme le visage, la main et le torse de chacun, à la taille de l'iPhone puis
// de l'iPad, de jour (0,42) puis de nuit (0,75), dans les deux bras (`?ktx2=0`
// et KTX2). Mêmes corps, mêmes poses, même heure : seule la texture change.
// Isolée : aucune suite ne l'importe.
const { Banc, dormir } = require('./banc.js');
const fs = require('fs');
const dossier = process.argv[2] || 'captures-ktx2-corps';
fs.mkdirSync(dossier, { recursive: true });
const ECRANS = { iphone: { width: 430, height: 932 }, ipad: { width: 820, height: 1180 } };
const HEURES = { jour: 0.42, nuit: 0.75 };

async function bras(banc, nom, params, ecran) {
  const p = await banc.jouerSeul(nom + ecran, { rr: 4, pret: true, tactile: true, viewport: ECRANS[ecran], params: '&ombres=1' + params });
  await p.evaluate(async () => {
    const H = await import('./src/humains.js');
    const THREE = await import('three');
    await H.chargerHumains();
    const g = window.__game, P = g.player;
    P.flying = true; P.vel.set(0, 0, 0);
    const base = P.pos.clone();
    const noms = ['homme-costume', 'femme-tailleur', 'homme-veste', 'fille'];
    window.__corpsCaptures = noms.map((n, i) => {
      const enfant = n === 'fille';
      const c = H.construireCorpsRealiste({ modeleHumain: enfant ? undefined : n, tenue: enfant ? 'enfant' : 'passant', genre: enfant ? 'femme' : 'homme', coupe: enfant ? 'long' : 'court' });
      c.position.set(base.x + (i - 1.5) * 1.6, base.y - 1.6, base.z - 6);
      g.scene.add(c);
      return { nom: n, c };
    });
    window.__THREE = THREE;
  });
  const sorties = [];
  for (const [heure, t] of Object.entries(HEURES)) {
    await p.evaluate((t) => window.__setDayTime && window.__setDayTime(t), t);
    await dormir(4000);
    const vues = await p.evaluate(() => {
      const g = window.__game, THREE = window.__THREE;
      const r = g.renderer, taille = r.getSize(new THREE.Vector2());
      const cam = new THREE.PerspectiveCamera(30, taille.x / taille.y, 0.02, 200);
      cam.layers.enableAll();
      const os = (c, motif) => { let b = null; c.traverse((o) => { if (!b && o.isBone && motif.test(o.name)) b = o; }); return b; };
      const out = [];
      for (const { nom, c } of window.__corpsCaptures) {
        c.updateMatrixWorld(true);
        const devant = new THREE.Vector3(0, 0, -1).applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion()));
        for (const [plan, motif, recul, haut] of [['visage', /Head$/, 0.55, 0.06], ['main', /R_Hand$/, 0.42, 0], ['torse', /Spine2$/, 1.15, 0]]) {
          const b = os(c, motif); if (!b) continue;
          const cible = b.getWorldPosition(new THREE.Vector3()); cible.y += haut;
          const lat = plan === 'main' ? new THREE.Vector3(-devant.z, 0, devant.x).multiplyScalar(-0.25) : new THREE.Vector3();
          cam.position.copy(cible).addScaledVector(devant, recul).add(lat);
          cam.lookAt(cible);
          r.render(g.scene, cam);
          out.push({ nom: `${nom}-${plan}`, url: r.domElement.toDataURL('image/png') });
        }
      }
      return out;
    });
    for (const v of vues) {
      const f = `${dossier}/${nom}-${v.nom}-${heure}.png`.replace(`${dossier}/`, `${dossier}/`);
      fs.writeFileSync(f, Buffer.from(v.url.split(',')[1], 'base64'));
      sorties.push(f);
    }
  }
  await p.close();
  return sorties;
}

(async () => {
  const banc = new Banc({ portJeu: 8441, portPairs: 9441 });
  await banc.ouvrir();
  try {
    for (const ecran of Object.keys(ECRANS)) {
      for (const [nom, params] of [['orig-' + ecran, '&ktx2=0'], ['ktx2-' + ecran, '']]) {
        const s = await bras(banc, nom, params, ecran);
        console.log(nom, s.length, 'vues');
      }
    }
  } catch (e) { console.log('ERR', e.message); } finally { await banc.fermer(); process.exit(0); }
})();
