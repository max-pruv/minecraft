// LA REVUELTO, L'ANCIENNE ET LA NEUVE, CÔTE À CÔTE EN JEU (v541). La règle
// 6 bis : une voiture qui en remplace une que Max a fournie se juge sur ce que
// l'enfant voit, pas sur les rendus de studio du paquet. Trois états — au
// volant dans une rue de Paris, garée vue de trois quarts, et une rue où la
// flotte est réduite à la Revuelto et aux modèles fabriqués —, à la taille de
// l'iPhone et de l'iPad, de jour et de nuit, couche HD et ombres forcées comme
// la revue d'écran (v506). Puis une planche par état : ancienne | neuve.
//
//   cd tests && node sonde-captures-revuelto.cjs [dossier] [--vues=iphone,ipad]
//
// Isolée (aucune suite ne l'importe).
const { Banc, dormir } = require('./banc.js');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const dossier = args.find((a) => !a.startsWith('--')) || path.join(os.tmpdir(), 'revuelto');
fs.mkdirSync(dossier, { recursive: true });
const vuesVoulues = (args.find((a) => a.startsWith('--vues=')) || '--vues=iphone,ipad').slice(7).split(',');
const etatsVoulus = (args.find((a) => a.startsWith('--etats=')) || '').slice(8).split(',').filter(Boolean);
const VUES = { iphone: { width: 430, height: 932 }, ipad: { width: 820, height: 1180 } };
const HEURES = [['jour', 0.42], ['nuit', 0.75]];
const BRAS = ['ancienne', 'neuve'];

// Prépare la page pour un bras : la Revuelto d'avant (sans `asset`) ou la neuve.
const choisir = (tab, bras) => tab.evaluate(async (bras) => {
  const V = await import('./src/vehicules.js');
  const e = V.FLOTTE.find((x) => x.fichier === 'lamborghini-revuelto.glb');
  if (bras === 'ancienne') delete e.asset;
  return e.asset || e.fichier;
}, bras);

const attendreMonde = async (tab, maxMs = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const n = await tab.evaluate(() => { const g = window.__game; return g.statsMaillage ? g.statsMaillage.attente || 0 : 0; }).catch(() => 0);
    if (n === 0 && Date.now() - t0 > 4000) break;
    await dormir(800);
  }
  await dormir(2000);
};

const ETATS = {
  // au volant, dans une rue de Paris
  volant: async (tab) => {
    const r = await tab.evaluate(async () => {
      const g = window.__game;
      const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
      const { adresseParis } = await import('./src/paris.js');
      const [x, z] = adresseParis(-0.8, -0.9);
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      g.player.flying = false; g.player.yaw = Math.PI / 2; g.player.pitch = 0;
      g.player.pos.set(x + 0.5, g.world.terrainHeight(x, z) + 1.01, z + 0.5); g.player.vel.set(0, 0, 0);
      await tenir(3);
      const a = g.animalManager.invoquer('voiture', x - 3, z, false, { flotte: 'lamborghini-revuelto.glb' });
      const t0 = performance.now();
      while (performance.now() - t0 < 20000 && !(a && a.mesh.userData.roues)) await tenir(0.3);
      for (let e = 0; e < 8 && !(g.fun.montureConduite && g.fun.montureConduite()); e++) { document.getElementById('ride-btn').click(); await tenir(0.6); }
      g.player.yaw = Math.PI / 2; g.player.pitch = -0.05;
      return { auVolant: !!(g.fun.montureConduite && g.fun.montureConduite()), flotte: a && a.mesh.userData.flotte };
    });
    await attendreMonde(tab);
    return r;
  },
  // garée, vue de trois quarts avant à hauteur d'enfant, sur une dalle
  troisquarts: async (tab) => {
    return tab.evaluate(async () => {
      const g = window.__game;
      const THREE = await import('three');
      const { BLOCK } = await import('./src/blocks.js');
      const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
      for (let e = 0; e < 6 && g.fun.montureConduite && g.fun.montureConduite(); e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const x0 = 42000, z0 = 42000; let y0 = 0;
      for (let d = -16; d <= 16; d += 4) for (let w = -16; w <= 16; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
      y0 += 2;
      for (let d = -16; d <= 16; d++) for (let w = -16; w <= 16; w++) {
        g.world.setBlock(x0 + d, y0, z0 + w, BLOCK.STONE);
        for (let h = 1; h < 6; h++) g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
      }
      g.player.flying = true; g.player.pos.set(x0 + 8, y0 + 1.05, z0 + 8); g.player.vel.set(0, 0, 0);
      await tenir(3);
      const a = g.animalManager.invoquer('voiture', x0, z0, false, { flotte: 'lamborghini-revuelto.glb' });
      const t0 = performance.now();
      while (performance.now() - t0 < 20000 && !(a && a.mesh.userData.roues)) await tenir(0.3);
      a.yaw = 0.6; a.mesh.rotation.y = a.yaw + Math.PI; a.mesh.updateMatrixWorld(true);
      // le nez : du centre vers le milieu des roues avant
      const c = new THREE.Vector3(), f = new THREE.Vector3(); let n = 0;
      a.mesh.traverse((o) => { if (/^Wheel_F/i.test(o.name || '')) { f.add(o.getWorldPosition(new THREE.Vector3())); n++; } });
      new THREE.Box3().setFromObject(a.mesh).getCenter(c);
      f.divideScalar(Math.max(n, 1)).sub(c).setY(0).normalize();
      const cote = new THREE.Vector3(-f.z, 0, f.x);
      const oeil = c.clone().addScaledVector(f, 5.2).addScaledVector(cote, 3.4);
      g.player.flying = true;
      g.player.pos.set(oeil.x, y0 + 1.05, oeil.z); g.player.vel.set(0, 0, 0);
      g.player.yaw = Math.atan2(-(c.x - oeil.x), -(c.z - oeil.z));
      g.player.pitch = -0.2;
      return { flotte: a.mesh.userData.flotte, n };
    });
  },
  // une rue de Paris où la flotte se réduit à la Revuelto et aux fabriqués
  rue: async (tab) => {
    const r = await tab.evaluate(async () => {
      const g = window.__game;
      const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
      for (let e = 0; e < 6 && g.fun.montureConduite && g.fun.montureConduite(); e++) { document.getElementById('ride-btn').click(); await tenir(0.5); }
      const V = await import('./src/vehicules.js');
      const entree = V.FLOTTE.find((e) => e.fichier === 'lamborghini-revuelto.glb');
      for (let i = V.FLOTTE.length - 1; i >= 0; i--) { const e = V.FLOTTE[i]; if (e !== entree && !e.fabrique) V.FLOTTE.splice(i, 1); }
      const P = await import('./src/paris.js');
      const cs = P.circuitsParis((x, z) => g.world.terrainHeight(Math.round(x), Math.round(z)));
      const c = cs[0]; const q0 = c.pts[2], q1 = c.pts[3];
      const x = (q0.x + q1.x) / 2, z = (q0.z + q1.z) / 2;
      // sur le trottoir, à quatre blocs de côté, face à la rue
      const dx = q1.x - q0.x, dz = q1.z - q0.z, L = Math.hypot(dx, dz) || 1;
      const px = x - dz / L * 4.5, pz = z + dx / L * 4.5;
      g.player.flying = false;
      g.player.pos.set(px, g.world.sommetColonne(Math.floor(px), Math.floor(pz)) + 1.01, pz); g.player.vel.set(0, 0, 0);
      g.player.yaw = Math.atan2(-(x - px + dx / L * 6), -(z - pz + dz / L * 6));
      g.player.pitch = -0.06;
      await tenir(18);
      let rev = 0; g.scene.traverse((o) => { if (o.userData && o.userData.flotte === 'lamborghini-revuelto.glb' && o.visible) rev++; });
      return { revueltosVisibles: rev };
    });
    await attendreMonde(tab);
    return r;
  },
};

// Avant chaque capture de la rue : la Revuelto de la circulation la plus
// proche, vue de côté à sept blocs, à hauteur d'enfant (elle roule : on se
// recadre sur elle juste avant de prendre l'image).
const RECADRER = {
  rue: (tab) => tab.evaluate(async () => {
    const g = window.__game, THREE = await import('three');
    const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
    const t0 = performance.now();
    while (performance.now() - t0 < 40000) {
      let best = null, dm = Infinity;
      g.scene.traverse((o) => {
        if (!o.userData || o.userData.flotte !== 'lamborghini-revuelto.glb' || !o.parent || o.userData.roues === undefined) return;
        const p = o.getWorldPosition(new THREE.Vector3());
        const d = p.distanceTo(g.player.pos);
        if (d < dm) { dm = d; best = { o, p }; }
      });
      if (best && dm < 400) {
        const q = new THREE.Quaternion(); best.o.getWorldQuaternion(q);
        const cote = new THREE.Vector3(1, 0, 0).applyQuaternion(q).setY(0).normalize();
        const av = new THREE.Vector3(0, 0, 1).applyQuaternion(q).setY(0).normalize();
        const oeil = best.p.clone().addScaledVector(cote, 6).addScaledVector(av, 3);
        g.player.flying = true;
        g.player.pos.set(oeil.x, best.p.y + 0.6, oeil.z); g.player.vel.set(0, 0, 0);
        g.player.yaw = Math.atan2(-(best.p.x - oeil.x), -(best.p.z - oeil.z));
        g.player.pitch = -0.12;
        await tenir(1.2);
        const p2 = best.o.getWorldPosition(new THREE.Vector3());
        return { distance: +dm.toFixed(0), visible: best.o.visible, bouge: +p2.distanceTo(best.p).toFixed(1) };
      }
      await tenir(1);
    }
    return { err: 'aucune Revuelto dans la rue en 40 s' };
  }),
};

(async () => {
  const banc = new Banc({ portJeu: 8442, portPairs: 9442 });
  await banc.ouvrir();
  const journal = [];
  const noter = (l) => { console.log(l); journal.push(l); };
  try {
    for (const vue of vuesVoulues) {
      for (const bras of BRAS) {
        for (const nomEtat of Object.keys(ETATS).filter((n) => !etatsVoulus.length || etatsVoulus.includes(n))) {
          // une page par état et par bras : la rue mutile FLOTTE, et l'on ne
          // veut pas qu'un état hérite de ce que le précédent a laissé (v279)
          const tab = await banc.jouerSeul('Rev' + vue + bras + nomEtat, { tactile: true, viewport: VUES[vue], rr: 9, params: '&ombres=1&hd=3', pret: true });
          try {
            const asset = await choisir(tab, bras);
            const r = await ETATS[nomEtat](tab);
            noter(`· ${vue} ${bras} ${nomEtat} (${asset}) ${JSON.stringify(r)}`);
            for (const [h, t] of HEURES) {
              await tab.evaluate((t) => window.__setDayTime(t), t);
              await dormir(3000);
              if (RECADRER[nomEtat]) noter(`  cadrage ${h} ${JSON.stringify(await RECADRER[nomEtat](tab))}`);
              const f = path.join(dossier, `${vue}-${nomEtat}-${h}-${bras}.png`);
              await tab.screenshot({ path: f, timeout: 120000 });
              noter('📸 ' + path.basename(f));
            }
          } catch (e) { noter(`❌ ${vue} ${bras} ${nomEtat} : ${String(e.message).split('\n')[0]}`); }
          await tab.close().catch(() => {});
          banc.pages = banc.pages.filter((p) => p !== tab);
        }
      }
    }
  } finally {
    fs.writeFileSync(path.join(dossier, 'journal.txt'), journal.join('\n') + '\n');
    await banc.fermer();
  }
  // les planches : ancienne | neuve
  const py = `
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
for f in sorted(os.listdir(d)):
    if not f.endswith('-ancienne.png'): continue
    g = f.replace('-ancienne.png', '-neuve.png')
    if not os.path.exists(os.path.join(d, g)): continue
    a = Image.open(os.path.join(d, f)).convert('RGB'); b = Image.open(os.path.join(d, g)).convert('RGB')
    w, h = a.size; p = Image.new('RGB', (w * 2 + 12, h + 40), (255, 255, 255)); p.paste(a, (0, 40)); p.paste(b, (w + 12, 40))
    t = ImageDraw.Draw(p); t.text((10, 12), 'ancienne', fill=(0, 0, 0)); t.text((w + 22, 12), 'neuve (adaptation CC-BY, BRO)', fill=(0, 0, 0))
    p.save(os.path.join(d, 'planche-' + f.replace('-ancienne.png', '.png')))
`;
  try { execFileSync('python3', ['-I', '-c', py, dossier]); } catch (e) { console.log('planches : ' + e.message); }
  console.log('→', dossier);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
