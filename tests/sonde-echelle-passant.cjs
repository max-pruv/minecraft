// UN PASSANT CONTRE LE REZ-DE-CHAUSSÉE, MESURÉ DANS LE MONDE RENDU (chantier
// échelle, après le retrait de la validation de Max : « les personnages sont
// plus grands que le niveau rez-de-chaussée »). Les captures de la terrasse ne
// montraient aucun passant contre une façade : rien ne permettait de juger ce
// qu'il reproche. Ici un adulte Rocketbox (1,76 m) et un enfant (1,48 m) sont
// posés debout, dos au mur, contre la façade du café de Saint-Germain, et la
// caméra est à hauteur d'œil sur le trottoir d'en face — de face, puis de trois
// quarts, au format de l'iPhone. La sonde mesure dans la scène : le sommet du
// crâne (boîte monde du corps dessiné) au-dessus du trottoir, et la colonne de
// façade telle que le monde la rend (les blocs, rang par rang), donc le haut du
// vitrage, le bandeau d'enseigne, la porte, l'entresol. La règle : une personne
// de 1,8 m tient sous le haut d'une vitrine de 3 m avec de la marge.
//   node tests/sonde-echelle-passant.cjs <dossier> [tag] [--port=8399]
const { Banc, souffler } = require('./banc.js');
const path = require('path');
const dossier = process.argv[2] || '.';
const tag = process.argv[3] || 'avant';
const opt = (n, d) => { const a = process.argv.find((s) => s.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const port = +opt('port', 8399);
const IPHONE = { width: 430, height: 932 };
// La façade du café de Saint-Germain, face ouest, autour de x = −434, z 419 à
// 427 ; la rue est à l'ouest. La trame de Paris est en biais : le mur est un
// escalier de colonnes, et la sonde CHERCHE pour chaque z la première colonne
// bâtie en venant de la rue (un emplacement se mesure, v223) — les corps se
// posent contre elle, et c'est elle qu'on lit rang par rang.
const MUR = { x0: -437, x1: -428, z0: 418, z1: 428 };
// L'adulte devant une vitrine, l'enfant devant une porte (ou une vitrine à défaut).
const GENS = [{ nom: 'adulte', devant: /VITRINE/, p: { tenue: 'passant', modeleHumain: 'homme-chemise' } }, { nom: 'enfant', devant: /PORTE/, p: { tenue: 'enfant', haut: 0x3060c0 } }];
// Les vues sont calculées depuis la façade trouvée : la caméra à hauteur d'œil,
// sur le trottoir d'en face (face), décalée (trois quarts), ou à quatre blocs (près).
const VUES = [
  { nom: 'face', recul: 7.5, cote: 0 },
  { nom: 'trois-quarts', recul: 7.0, cote: 6 },
  { nom: 'pres', recul: 4.0, cote: 1 },
];
(async () => {
  const banc = new Banc({ portJeu: port, portPairs: port + 1000 });
  await banc.ouvrir();
  try {
    await souffler();
    const page = await banc.jouerSeul('Mesure', { rr: 7, viewport: IPHONE, dpr: 1, params: '&ombres=1&hd=4&arbres=1' });
    const mesures = await page.evaluate(async ({ MUR, GENS, VUES }) => {
      const g = window.__game;
      const THREE = await import('three');
      const H = await import('./src/humains.js');
      const { ARCHI, BLOCK, CITY_BLOCK } = await import('./src/blocks.js');
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      const AIR = BLOCK.AIR;
      const nom = (id) => { for (const k in ARCHI) if (ARCHI[k] === id) return k; for (const k in BLOCK) if (BLOCK[k] === id) return k; for (const k in CITY_BLOCK) if (CITY_BLOCK[k] === id) return 'CITY.' + k; return String(id); };
      // on se pose au large de la fenêtre pour que les morceaux arrivent
      const zc = (MUR.z0 + MUR.z1) / 2;
      const hRue = g.world.terrainHeight(MUR.x0 - 2, zc | 0);
      g.player.flying = true;
      g.player.pos.set(MUR.x0 - 6, hRue + 1 + 0.01, zc); g.player.vel.set(0, 0, 0);
      g.player.yaw = -Math.PI / 2; g.player.pitch = 0;
      window.__setDayTime(0.42);
      const t0 = performance.now();
      let n0 = -1;
      while (performance.now() - t0 < 40000) { await dodo(1000); const n = g.chunkMeshes.size; if (n === n0) break; n0 = n; }
      // la façade : pour chaque z, la première colonne bâtie en venant de la rue
      // (un bloc de façade ARCHI au premier rang visible, x croissant), et le trottoir juste devant
      const facade = {};
      for (let z = MUR.z0; z <= MUR.z1; z++) {
        for (let x = MUR.x0; x <= MUR.x1; x++) {
          const h = g.world.terrainHeight(x, z);
          const b1 = g.world.getBlock(x, h + 1, z);
          if (b1 === AIR) continue;
          const n1 = nom(b1);
          if (!/VITRINE|PORTE|ENSEIGNE|ENTRESOL|CHAINAGE|PIERRE|ETAGE|NOBLE/.test(n1)) continue;
          const hT = g.world.terrainHeight(x - 1, z);
          const col = [];
          for (let dy = 0; dy < 12; dy++) col.push(nom(g.world.getBlock(x, h + dy, z)));
          facade[z] = { x, h, hTrottoir: hT, trottoir: nom(g.world.getBlock(x - 1, hT, z)), col };
          break;
        }
      }
      const zs = Object.keys(facade).map(Number);
      if (!zs.length) return { err: 'aucune façade trouvée dans la fenêtre', facade };
      // le choix de la colonne de chaque figure : ce qu'elle a DEVANT elle au rang visible 1
      const choisir = (re, deja) => zs.find((z) => re.test(facade[z].col[1]) && facade[z].trottoir.includes('SIDEWALK') && !deja.includes(z));
      const pris = [];
      for (const d of GENS) { let z = choisir(d.devant, pris); if (z === undefined) z = choisir(/VITRINE|PORTE/, pris); if (z === undefined) z = zs.find((z) => !pris.includes(z)); d.z = z; pris.push(z); }
      // les corps réalistes (chargés après l'accueil)
      let essai = null;
      while (performance.now() - t0 < 90000 && !(essai = H.construireCorpsRealiste(GENS[0].p))) await dodo(1000);
      if (!essai) return { err: 'les corps réalistes ne sont pas arrivés' };
      g.scene.remove(essai);
      // on écarte les passants qui traînent
      for (const q of (g.npcs || [])) if (q.pos && q.name === 'passant') q.pos.set(q.pos.x + 400, q.pos.y, q.pos.z);
      // les deux figures, dos au mur (le modèle regarde en −z ; tourné de +π/2 il regarde en −x, vers la rue)
      const gens = [];
      for (const d of GENS) {
        const f = facade[d.z];
        const sol = f.hTrottoir + 1;
        const corps = H.construireCorpsRealiste(d.p);
        corps.position.set(f.x - 0.5, sol, d.z + 0.5);
        corps.rotation.y = Math.PI / 2;
        g.scene.add(corps); corps.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(corps);
        const crane = +(b.max.y - sol).toFixed(2);
        // les bandes de la façade au-dessus du sol où il se tient, et ce que son crâne a en face
        const bandes = {};
        f.col.forEach((n, dy) => { const bas = f.h + dy - sol; (bandes[n] = bandes[n] || []).push([bas, bas + 1]); });
        const hautDe = (re) => { let m = null; for (const n in bandes) if (re.test(n)) for (const [, ht] of bandes[n]) m = m === null ? ht : Math.max(m, ht); return m; };
        const basDe = (re) => { let m = null; for (const n in bandes) if (re.test(n)) for (const [bs] of bandes[n]) m = m === null ? bs : Math.min(m, bs); return m; };
        const face = f.col[Math.floor(crane - (f.h - sol))];
        gens.push({ nom: d.nom, z: d.z, xFacade: f.x, declare: corps.userData.hauteur, crane, pieds: +(b.min.y - sol).toFixed(2),
          enFaceDuCrane: face, hautVitrage: hautDe(/VITRINE/), basEnseigne: basDe(/ENSEIGNE/), hautPorte: hautDe(/PORTE/), basEntresol: basDe(/ENTRESOL/), basEtage: basDe(/CHAINAGE|ETAGE|NOBLE/),
          margeVitrage: hautDe(/VITRINE/) === null ? null : +(hautDe(/VITRINE/) - crane).toFixed(2), bandes });
        window['__corps_' + d.nom] = corps;
      }
      // un rayon horizontal à la hauteur du crâne de l'adulte, vers le mur : ce que la caméra verrait derrière la tête
      const a0 = GENS[0], fa = facade[a0.z], solA = fa.hTrottoir + 1;
      const ray = new THREE.Raycaster(); ray.layers.enableAll();
      const touche = (y) => { ray.set(new THREE.Vector3(fa.x - 2.5, y, a0.z + 0.5), new THREE.Vector3(1, 0, 0)); const hs = ray.intersectObjects(g.scene.children, true).filter((h) => h.object.visible && !(h.object.userData && h.object.userData.anatomie)); const h0 = hs[0]; return h0 ? { d: +h0.distance.toFixed(2), xTouche: +(fa.x - 2.5 + h0.distance).toFixed(2), objet: h0.object.name || h0.object.type } : null; };
      const sommet = solA + gens[0].crane;
      window.__sondeFacade = { x: fa.x, z: a0.z, sol: solA };
      return { sol: solA, gens, facade, rayonCrane: touche(sommet), rayonCranePlus30: touche(sommet + 0.3), morceaux: g.chunkMeshes.size };
    }, { MUR, GENS, VUES });
    console.log('MESURES', JSON.stringify(mesures));
    if (mesures.err) { console.log('ERREUR', mesures.err); return; }
    for (const v of VUES) {
      try {
        await page.evaluate(async ({ v }) => {
          const g = window.__game;
          const f = window.__sondeFacade;
          const x = f.x - 0.5 - v.recul, z = f.z + 0.5 + v.cote;
          g.player.flying = true;
          g.player.pos.set(x, f.sol + 0.01, z); g.player.vel.set(0, 0, 0);
          const dx = (f.x - 0.5) - x, dz = (f.z + 0.5) - z;
          g.player.yaw = Math.atan2(-dx, -dz); g.player.pitch = 0.02;
          await new Promise((r) => setTimeout(r, 2500));
        }, { v });
        const f = path.join(dossier, `${tag}-iphone-passant-${v.nom}.png`);
        await page.screenshot({ path: f, timeout: 120000 });
        console.log(v.nom, '→', f);
      } catch (e) { console.log(v.nom, 'ÉCHEC :', String(e && e.message || e).split('\n')[0]); }
    }
  } finally {
    await banc.fermer();
    process.exit(0);
  }
})();
