// CAPTURES DE LA CAMÉRA DE POURSUITE (v474) : virage à gauche, virage à
// droite, rue étroite (deux murs à 2,5 blocs de l'axe) et mur derrière le
// coffre. Chaque vue publie ce qui se LIT dans la matrice : l'angle signé de
// la caméra derrière la voiture (β), le flanc que la caméra regarde (produit
// scalaire caméra → voiture avec la DROITE de la voiture, lue dans la matrice
// monde du maillage), le recul et la place de la voiture dans le cadre.
// CAPTURES=dossier ; SENS=0 rejoue `?sensations=0`.
const { Banc, souffler } = require('./banc.js');
const DOSSIER = process.env.CAPTURES || require('os').tmpdir() + '/captures-camera';
require('fs').mkdirSync(DOSSIER, { recursive: true });
(async () => {
  const banc = new Banc({ portJeu: 8417, portPairs: 9417 });
  await banc.ouvrir();
  try {
    await souffler();
    const params = process.env.SENS === '0' ? '&sensations=0' : '';
    const page = await banc.jouerSeul('SondeCamVolant', { rr: 6, params });
    const tenir = (n) => page.evaluate((n) => new Promise((fin) => { let c = 0, p = performance.now(); const f = (t) => { c += Math.min(0.05, (t - p) / 1000); p = t; if (c >= n) fin(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
    const depart = await page.evaluate(() => {
      const g = window.__game, P = g.player, w = g.world;
      for (let r = 0; r < 1600; r += 16) for (let k = 0; k < 16; k++) {
        const x0 = Math.round(P.pos.x + r * Math.cos(k)), z0 = Math.round(P.pos.z + r * Math.sin(k));
        for (const [dx, dz, yaw] of [[1, 0, -Math.PI / 2], [-1, 0, Math.PI / 2], [0, -1, 0], [0, 1, Math.PI]]) {
          const h0 = w.sommetColonne(x0, z0); let ok = true;
          for (let d = -12; d <= 90 && ok; d++) for (let l = -4; l <= 4 && ok; l++) {
            const x = x0 + dx * d + (dz ? l : 0), z = z0 + dz * d + (dx ? l : 0);
            const h = w.sommetColonne(x, z);
            if (Math.abs(h - h0) > 1 || w.getBlock(x, h + 1, z) !== 0 || w.getBlock(x, h, z) === 9) ok = false;
          }
          if (ok) return { x: x0 + 0.5, z: z0 + 0.5, y: h0 + 1.01, h0, yaw, dx, dz };
        }
      }
      return null;
    });
    console.log('départ', JSON.stringify(depart));
    if (!depart) throw new Error('pas de ligne droite dégagée');
    const mesurer = () => page.evaluate(() => {
      const g = window.__game, P = g.player, a = g.fun.montureConduite();
      if (!a) return { err: 'pas au volant' };
      const cam = P.camera; a.mesh.updateMatrixWorld(true);
      const e = a.mesh.matrixWorld.elements;
      // la droite de la voiture dans le monde : son nez est en −z local, donc
      // sa droite est +x local, lue dans la matrice (colonne 0)
      const rx = e[0], rz = e[2], n = Math.hypot(rx, rz) || 1;
      const cx = cam.position.x - P.pos.x, cz = cam.position.z - P.pos.z, d = Math.hypot(cx, cz) || 1;
      const flanc = (cx * rx + cz * rz) / (d * n);
      const bx = Math.sin(P.yaw), bz = Math.cos(P.yaw);
      const beta = Math.atan2(bx * (cz / d) - bz * (cx / d), bx * (cx / d) + bz * (cz / d));
      const v = new (cam.position.constructor)(P.pos.x, P.pos.y + 0.6, P.pos.z).project(cam);
      return { beta: +(beta * 180 / Math.PI).toFixed(1), flanc: +flanc.toFixed(2),
        cote: flanc > 0.08 ? 'droit' : flanc < -0.08 ? 'gauche' : 'arrière',
        recul: +d.toFixed(2), hCam: +(cam.position.y - P.pos.y).toFixed(2),
        ecranX: +v.x.toFixed(2), ecranY: +v.y.toFixed(2), fov: +cam.fov.toFixed(1),
        v: +(P.vitesseVoiture || 0).toFixed(1), yaw: +P.yaw.toFixed(2) };
    });
    const poser = (yaw, x = depart.x, z = depart.z) => page.evaluate(([d, yaw, x, z]) => {
      const g = window.__game, P = g.player;
      P.pos.set(x, d.y, z); P.yaw = yaw; P.pitch = -0.08; P.vel.set(0, 0, 0);
      P.vitesseVoiture = 0; P.gaz = 0; P.keys.clear();
    }, [depart, yaw, x, z]);
    await page.evaluate((d) => {
      const g = window.__game, P = g.player;
      for (const b of [...g.animalManager.animals]) g.animalManager.scene.remove(b.mesh);
      g.animalManager.animals.length = 0;
      P.pos.set(d.x, d.y, d.z); P.yaw = d.yaw; P.pitch = -0.08;
      g.animalManager.invoquer('voiture', d.x - Math.sin(d.yaw) * 3, d.z - Math.cos(d.yaw) * 3);
    }, depart);
    await tenir(1);
    for (let e = 0; e < 8 && !(await page.evaluate(() => !!window.__game.fun.montureConduite())); e++) { await page.evaluate(() => document.getElementById('ride-btn').click()); await tenir(0.5); }
    const releves = {};
    const vue = async (nom) => { releves[nom] = await mesurer(); await page.screenshot({ path: `${DOSSIER}/${nom}.png` }); console.log(nom, JSON.stringify(releves[nom])); };

    // 1. ligne droite, pleins gaz
    await poser(depart.yaw); await tenir(2);
    await vue('1-arret');
    await page.evaluate(() => { window.__game.player.gaz = 1; }); await tenir(2.2);
    await vue('2-ligne-droite');
    // 2. virage à gauche tenu
    await page.evaluate(() => window.__game.player.keys.add('KeyA')); await tenir(0.7);
    await vue('3-virage-gauche'); await tenir(0.8);
    await vue('4-virage-gauche-tenu');
    // 3. virage à droite tenu
    await poser(depart.yaw); await tenir(1.5);
    await page.evaluate(() => { window.__game.player.gaz = 1; }); await tenir(2.2);
    await page.evaluate(() => window.__game.player.keys.add('KeyD')); await tenir(0.7);
    await vue('5-virage-droite'); await tenir(0.8);
    await vue('6-virage-droite-tenu');

    // 4. la rue étroite : deux murs de six blocs à 2,5 blocs de l'axe, 70 de long
    const rue = await page.evaluate((d) => {
      const w = window.__game.world; let n = 0;
      for (let s = -6; s <= 70; s++) for (const l of [-3, 3]) for (let y = 1; y <= 6; y++) {
        const x = Math.floor(d.x + d.dx * s + (d.dz ? l : 0)), z = Math.floor(d.z + d.dz * s + (d.dx ? l : 0));
        w.setBlock(x, d.h0 + y, z, 11); n++;
      }
      return n;
    }, depart);
    console.log('rue', rue);
    await poser(depart.yaw); await tenir(2);
    await vue('7-rue-etroite-arret');
    await page.evaluate(() => { window.__game.player.gaz = 0.7; }); await tenir(1.6);
    await page.evaluate(() => window.__game.player.keys.add('KeyA')); await tenir(0.35);
    await page.evaluate(() => window.__game.player.keys.clear());
    await vue('8-rue-etroite-coup-de-volant'); await tenir(0.4);
    await vue('9-rue-etroite-apres');

    // 5. un mur juste derrière le coffre (à 3 blocs du centre)
    await page.evaluate((d) => {
      const w = window.__game.world;
      for (let s = -6; s <= 70; s++) for (const l of [-3, 3]) for (let y = 1; y <= 6; y++) {
        const x = Math.floor(d.x + d.dx * s + (d.dz ? l : 0)), z = Math.floor(d.z + d.dz * s + (d.dx ? l : 0));
        w.setBlock(x, d.h0 + y, z, 0);
      }
      for (let l = -6; l <= 6; l++) for (let y = 1; y <= 7; y++) {
        const x = Math.floor(d.x - d.dx * 3.2 + (d.dz ? l : 0)), z = Math.floor(d.z - d.dz * 3.2 + (d.dx ? l : 0));
        w.setBlock(x, d.h0 + y, z, 11);
      }
    }, depart);
    await poser(depart.yaw); await tenir(2.5);
    await vue('10-mur-derriere');
  } catch (e) { console.log('ÉCHEC', e.message); }
  finally { await banc.fermer(); process.exit(0); }
})();
