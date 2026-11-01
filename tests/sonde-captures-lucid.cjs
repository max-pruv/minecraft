// LA LUCID AIR SAPPHIRE EN JEU : au volant dans une rue de Paris, garée vue de
// trois quarts avant et arrière, portière ouverte et habitacle vu par l'ouverture,
// à la taille de l'iPhone et de l'iPad, de jour et de nuit, couche HD et ombres
// forcées comme la revue d'écran (v506). Recopiée de la sonde de la SF90 (v561).
//
//   cd tests && node sonde-captures-lucid.cjs [dossier] [--vues=iphone,ipad] [--etats=volant,troisquarts,arriere,porte,interieur]
//
// Isolée (aucune suite ne l'importe).
const { Banc, dormir } = require('./banc.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

const args = process.argv.slice(2);
const dossier = args.find((a) => !a.startsWith('--')) || path.join(os.tmpdir(), 'lucid-air');
fs.mkdirSync(dossier, { recursive: true });
const vuesVoulues = (args.find((a) => a.startsWith('--vues=')) || '--vues=iphone,ipad').slice(7).split(',');
const etatsVoulus = (args.find((a) => a.startsWith('--etats=')) || '').slice(8).split(',').filter(Boolean);
const VUES = { iphone: { width: 430, height: 932 }, ipad: { width: 820, height: 1180 } };
const HEURES = [['jour', 0.42], ['nuit', 0.75]];
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
      const a = g.animalManager.invoquer('voiture', x - 3, z, false, { flotte: 'lucid-air-sapphire.glb' });
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
      const a = g.animalManager.invoquer('voiture', x0, z0, false, { flotte: 'lucid-air-sapphire.glb' });
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
  // de trois quarts arrière
  arriere: async (tab) => {
    const r = await ETATS.troisquarts(tab);
    await tab.evaluate(async () => {
      const g = window.__game, THREE = await import('three');
      const a = g.animalManager.animals.find((x) => x.def.key === 'voiture');
      const c = new THREE.Box3().setFromObject(a.mesh).getCenter(new THREE.Vector3());
      const oeil = g.player.pos.clone().sub(c).setY(0).multiplyScalar(-1).add(c);
      g.player.pos.set(oeil.x, g.player.pos.y, oeil.z);
      g.player.yaw = Math.atan2(-(c.x - oeil.x), -(c.z - oeil.z));
    });
    return r;
  },
  // la portière gauche ouverte, vue de côté : la porte et l'habitacle
  porte: async (tab) => {
    const r = await ETATS.troisquarts(tab);
    const o = await tab.evaluate(async () => {
      const g = window.__game, THREE = await import('three');
      const P = await import('./src/portieres.js');
      const a = g.animalManager.animals.find((x) => x.def.key === 'voiture');
      const eq = P.equiperPortieres(a.mesh);
      P.ouvrir(eq['-1'], 1);
      const c = new THREE.Box3().setFromObject(a.mesh).getCenter(new THREE.Vector3());
      const q = a.mesh.getWorldQuaternion(new THREE.Quaternion());
      const gauche = new THREE.Vector3(-1, 0, 0).applyQuaternion(q), av = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
      const oeil = c.clone().addScaledVector(gauche, 4.6).addScaledVector(av, -1.2);
      g.player.pos.set(oeil.x, g.player.pos.y, oeil.z);
      g.player.yaw = Math.atan2(-(c.x + av.x * 0.3 - oeil.x), -(c.z + av.z * 0.3 - oeil.z));
      g.player.pitch = -0.12;
      return { vraie: !!eq.plan.vraie, plan: { z0: eq.plan.z0, z1: eq.plan.z1, demiLarg: eq.plan.demiLarg } };
    });
    return { ...r, ...o };
  },
  // l'œil du conducteur et le conducteur vu par la vitre : rendus par une caméra à
  // part, la caméra de poursuite ne va pas là, et chacun écrit son image lui-même
  interieur: async (tab) => {
    const r = await ETATS.volant(tab);
    const images = await tab.evaluate(async () => {
      const g = window.__game, THREE = await import('three');
      const a = g.fun.montureConduite();
      // rendue sur l'écran et lue dans la même tâche : correspondance tonale comprise
      const rendre = (pos, vise, fov) => {
        const cam = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, 0.03, 300);
        cam.layers.enableAll();
        cam.position.copy(new THREE.Vector3(...pos).applyMatrix4(a.mesh.matrixWorld));
        cam.lookAt(new THREE.Vector3(...vise).applyMatrix4(a.mesh.matrixWorld));
        g.renderer.render(g.scene, cam);
        return g.renderer.domElement.toDataURL('image/png');
      };
      const P = await import('./src/portieres.js');
      const eq = P.equiperPortieres(a.mesh);
      if (eq) P.ouvrir(eq['-1'], 1);
      await new Promise((f) => setTimeout(f, 1500));
      // vu d'en haut, le toit coupé par le plan proche : où l'enfant est assis
      const dessus = (() => { const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 1.45, 300); cam.layers.enableAll(); cam.position.copy(new THREE.Vector3(-0.1, 2.75, 0.1).applyMatrix4(a.mesh.matrixWorld)); cam.up.set(0,0,-1).applyQuaternion(a.mesh.quaternion); cam.lookAt(new THREE.Vector3(-0.1, 0, 0.1).applyMatrix4(a.mesh.matrixWorld)); g.renderer.render(g.scene, cam); return g.renderer.domElement.toDataURL('image/png'); })();
      return { dessus, planche: rendre([-0.33, 1.0, -0.05], [-0.28, 0.82, -1], 75), porte: rendre([-3, 1.1, 0.0], [-0.33, 0.8, 0.1], 38), haut: rendre([-1.7, 1.75, 0.5], [-0.33, 0.7, 0.0], 45) };
    });
    for (const [n, u] of Object.entries(images)) fs.writeFileSync(path.join(dossier, `interieur-${n}.png`), Buffer.from(u.split(',')[1], 'base64'));
    return r;
  },
};

(async () => {
  const banc = new Banc({ portJeu: 8443, portPairs: 9443 });
  await banc.ouvrir();
  const journal = [];
  const noter = (l) => { console.log(l); journal.push(l); };
  try {
    for (const vue of vuesVoulues) {
      for (const nomEtat of Object.keys(ETATS).filter((n) => !etatsVoulus.length || etatsVoulus.includes(n))) {
        const tab = await banc.jouerSeul('Lucid' + vue + nomEtat, { tactile: true, viewport: VUES[vue], rr: 9, params: '&ombres=1&hd=3', pret: true });
        try {
          const r = await ETATS[nomEtat](tab);
          noter(`· ${vue} ${nomEtat} ${JSON.stringify(r)}`);
          for (const [h, t] of HEURES) {
            await tab.evaluate((t) => window.__setDayTime(t), t);
            await dormir(3000);
            const f = path.join(dossier, `${vue}-${nomEtat}-${h}.png`);
            await tab.screenshot({ path: f, timeout: 120000 });
            noter('📸 ' + path.basename(f));
          }
        } catch (e) { noter(`❌ ${vue} ${nomEtat} : ${String(e.message).split('\n')[0]}`); }
        await tab.close().catch(() => {});
        banc.pages = banc.pages.filter((p) => p !== tab);
      }
    }
  } finally {
    fs.writeFileSync(path.join(dossier, 'journal.txt'), journal.join('\n') + '\n');
    await banc.fermer();
  }
  console.log('→', dossier);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
