// LES PHARES DE NUIT, MODÈLE PAR MODÈLE (v569). Max : « la vraie 911 a une
// barre lumineuse, et le jeu vient créer des phares ronds par-dessus ». Une
// voiture garée sur une dalle, de nuit, phares allumés (`allumerPhares`),
// vue de trois quarts avant puis de face, à hauteur d'enfant. On joue la sonde
// sur l'ancien `src/phares.js` puis sur le neuf (le fichier se sert depuis le
// disque) et l'on compare les images deux à deux.
//
//   cd tests && node sonde-captures-phares.cjs [dossier] [--bras=neuf] [--modeles=porsche-911-gt3-rs.glb,…] [--vue=iphone]
//
// Isolée (aucune suite ne l'importe).
const { Banc, dormir } = require('./banc.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

const args = process.argv.slice(2);
const dossier = args.find((a) => !a.startsWith('--')) || path.join(os.tmpdir(), 'phares');
fs.mkdirSync(dossier, { recursive: true });
const sansProf = args.includes('--sans-profondeur');
const eteint = args.includes('--eteint');
const bras = (args.find((a) => a.startsWith('--bras=')) || '--bras=neuf').slice(7);
const vue = (args.find((a) => a.startsWith('--vue=')) || '--vue=iphone').slice(6);
const VUES = { iphone: { width: 430, height: 932 }, ipad: { width: 820, height: 1180 } };
const MODELES = (args.find((a) => a.startsWith('--modeles=')) || '--modeles=porsche-911-gt3-rs.glb,tesla-cybertruck.glb,tesla-model-y.glb,chevrolet-camaro-ss-1967.glb,renault-fuego.glb,lucid-gravity.glb,ny-crown-victoria,police-car.glb').slice(10).split(',');

(async () => {
  const banc = new Banc({ portJeu: 8452, portPairs: 9452 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Phares' + bras + vue, { tactile: true, viewport: VUES[vue], rr: 4, params: '&hd=3', pret: true });
    await tab.evaluate(async () => {
      const g = window.__game, { BLOCK } = await import('./src/blocks.js');
      const x0 = 42000, z0 = 42000; let y0 = 0;
      for (let d = -16; d <= 16; d += 4) for (let w = -16; w <= 16; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 2;
      for (let d = -16; d <= 16; d++) for (let w = -16; w <= 16; w++) {
        g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
        for (let h = 1; h < 6; h++) g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
      }
      g.player.flying = true; g.player.pos.set(x0 + 8, y0 + 1.05, z0 + 8); g.player.vel.set(0, 0, 0);
      window.__dalle = { x0, z0, y0 };
      window.__setDayTime(0.75);
    });
    await dormir(4000);
    for (const fichier of MODELES) {
      const r = await tab.evaluate(async (fichier) => {
        const g = window.__game, THREE = await import('three'), P = await import('./src/phares.js');
        const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
        const { x0, z0, y0 } = window.__dalle;
        for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
        g.animalManager.animals.length = 0;
        const a = g.animalManager.invoquer('voiture', x0, z0, false, { flotte: fichier });
        const t0 = performance.now();
        while (performance.now() - t0 < 25000 && !(a && a.mesh.userData.roues)) await tenir(0.3);
        a.yaw = 0.6; a.mesh.position.copy(a.pos); a.mesh.rotation.y = a.yaw + Math.PI; a.mesh.updateMatrixWorld(true);
        const ph = P.allumerPhares(a.mesh, 1);
        window.__voiture = a;
        return { flotte: a.mesh.userData.flotte, lueurs: ph ? ph.userData.lueurs.length : 0, rang: ph ? ph.userData.rang : null,
          visibles: ph ? ph.userData.lueurs.map((l) => l.visible && ph.visible) : null, sources: ph ? ph.userData.lueurs.map((l) => (l.userData.sources || []).length) : null,
          tri: ph ? ph.userData.lueurs.map((l) => l.geometry.attributes.position.count / 3) : null };
      }, fichier);
      for (const [nom, av, cote, h, pitch] of [['troisquarts', 6.2, 3.6, 1.4, -0.16], ['face', 6.0, 0, 1.0, -0.06]]) {
        const pose = await tab.evaluate(async ([av, cote, h, pitch, sp, et]) => {
          const g = window.__game, THREE = await import('three'), P = await import('./src/phares.js');
          const a = window.__voiture, { y0 } = window.__dalle;
          // le nez : −z du repère de la voiture (sa boîte, phares exclus)
          a.mesh.updateMatrixWorld(true);
          const f = new THREE.Vector3(0, 0, -1).transformDirection(a.mesh.matrixWorld).setY(0).normalize();
          const c = a.mesh.getWorldPosition(new THREE.Vector3());
          const lat = new THREE.Vector3(-f.z, 0, f.x);
          const oeil = c.clone().addScaledVector(f, av).addScaledVector(lat, cote);
          g.player.flying = true;
          g.player.pos.set(oeil.x, y0 + h, oeil.z); g.player.vel.set(0, 0, 0);
          g.player.yaw = Math.atan2(-(c.x - oeil.x), -(c.z - oeil.z));
          g.player.pitch = pitch;
          const ph = P.allumerPhares(a.mesh, 1);
          if (sp && ph) for (const l of ph.userData.lueurs) { l.material.depthTest = false; l.material.color.set(0xff00ff); }
          if (et) P.eteindrePhares(a.mesh);
          return { car: [c.x, c.y, c.z].map(Math.round), joueur: [g.player.pos.x, g.player.pos.y].map(Math.round), dans: g.animalManager.animals.includes(a), parent: !!a.mesh.parent };
        }, [av, cote, h, pitch, sansProf, eteint]);
        await dormir(2500);
        const f = path.join(dossier, `${vue}-${fichier.replace(/\.glb$/, '')}-${nom}-${bras}.png`);
        await tab.screenshot({ path: f, timeout: 120000 });
        console.log('📸', path.basename(f), JSON.stringify(r), JSON.stringify(pose));
      }
    }
  } catch (e) { console.log('❌', String(e.message).split('\n')[0]); }
  finally { await banc.fermer().catch(() => {}); process.exit(0); }
})();
