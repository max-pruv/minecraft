// La carte : celle qu'on ouvre pour décider où aller.
//
// Elle n'était qu'une image fixe ; elle se fait maintenant glisser et écarter
// à deux doigts. Ces scénarios suivent le geste d'un enfant du début à la fin
// — ouvrir, se promener, zoomer, toucher un nom — parce que c'est précisément
// là qu'on a trouvé les défauts : chacun des mécanismes marchait séparément.
//
//     cd tests && npm install && npm run carte

const { Banc, dormir, pincer } = require('./banc.js');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

const vue = (p) => p.evaluate(() => ({ ...window.__carte.vue }));
const cadre = (p) => p.evaluate(() => {
  const r = document.getElementById('map-modal-canvas').getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width };
});
const lieuxVus = (p) => p.evaluate(() => window.__carte.etiquettes.map((e) => e.lieu.name));
const carteOuverte = (p) => p.evaluate(() =>
  getComputedStyle(document.getElementById('map-modal')).display !== 'none');
const position = (p) => p.evaluate(() => ({
  x: Math.round(window.__game.player.pos.x), z: Math.round(window.__game.player.pos.z),
}));

(async () => {
  const banc = new Banc({ portJeu: 8323, portPairs: 9323 });
  await banc.ouvrir();
  try {
    // --- une tablette, comme à la maison -------------------------------------
    const tab = await banc.jouerSeul('Marlon', { tactile: true });
    await banc.ouvrirLaCarte(tab);

    const depart = await vue(tab);
    const moi = await position(tab);
    verifier('la carte s\'ouvre sur le joueur',
      Math.abs(depart.cx - moi.x) < 2 && Math.abs(depart.cz - moi.z) < 2,
      JSON.stringify({ vue: [depart.cx, depart.cz], joueur: [moi.x, moi.z] }));

    // Le menu de pause du jeu s'invitait par-dessus la carte dès qu'on la
    // rendait interactive : elle relâche la souris, et le jeu prenait cela
    // pour une mise en pause. Rien ne répondait plus.
    verifier('le menu du jeu ne recouvre pas la carte',
      (await tab.evaluate(() => getComputedStyle(document.getElementById('overlay')).display)) === 'none');

    // --- se promener ---------------------------------------------------------
    const c = await cadre(tab);
    // Un coin plutôt que le centre : au centre il y a le joueur, et souvent
    // une étiquette — on éprouverait le voyage, pas le déplacement.
    const milieu = { x: c.x + c.w * 0.75, y: c.y + c.w * 0.25 };
    await tab.mouse.move(milieu.x, milieu.y);
    await tab.mouse.down();
    for (let i = 1; i <= 8; i++) await tab.mouse.move(milieu.x - i * 12, milieu.y - i * 8);
    await tab.mouse.up();
    await dormir(400);
    const glisse = await vue(tab);
    verifier('glisser promène la carte',
      glisse.cx > depart.cx + 20 && glisse.cz > depart.cz + 10,
      JSON.stringify({ dx: Math.round(glisse.cx - depart.cx), dz: Math.round(glisse.cz - depart.cz) }));

    // --- écarter deux doigts -------------------------------------------------
    // Au centre de la carte : plus loin, un doigt du geste large sortirait du
    // cadre et le navigateur n'annoncerait qu'un seul contact.
    const centre = { x: c.x + c.w / 2, y: c.y + c.w / 2 };
    const avantPince = await vue(tab);
    await pincer(tab, centre, 60, 200);
    const apresPince = await vue(tab);
    verifier('écarter deux doigts rapproche la carte',
      apresPince.bpp < avantPince.bpp * 0.75,
      `${avantPince.bpp.toFixed(2)} → ${apresPince.bpp.toFixed(2)}`);

    await pincer(tab, centre, 200, 60);
    verifier('les rapprocher éloigne',
      (await vue(tab)).bpp > apresPince.bpp * 1.3,
      `${apresPince.bpp.toFixed(2)} → ${(await vue(tab)).bpp.toFixed(2)}`);

    // Un zoom se termine par deux doigts levés l'un après l'autre. Le second
    // ressemble à s'y méprendre à un appui bref : s'il est pris pour tel, un
    // enfant qui zoome sur une ville se retrouve dedans sans l'avoir demandé.
    const surUnLieu = await tab.evaluate(() => {
      const c2 = window.__carte;
      const e = c2.etiquettes.find((x) => x.lieu.name === 'Paris') || c2.etiquettes[0];
      if (!e) return null;
      const r = document.getElementById('map-modal-canvas').getBoundingClientRect();
      const cx = Math.min(Math.max((e.rect.x0 + e.rect.x1) / 2, 90), r.width - 90);
      return { x: r.left + cx, y: r.top + Math.min(Math.max((e.rect.y0 + e.rect.y1) / 2, 60), r.height - 60) };
    });
    const avantZoomSurLieu = await position(tab);
    await pincer(tab, surUnLieu, 110, 145, 2, 0);   // un geste vif, comme celui d'un enfant
    await dormir(500);
    const apresZoomSurLieu = await position(tab);
    verifier('zoomer sur une ville n\'y emmène pas',
      apresZoomSurLieu.x === avantZoomSurLieu.x && apresZoomSurLieu.z === avantZoomSurLieu.z
      && (await carteOuverte(tab)),
      JSON.stringify({ avant: avantZoomSurLieu, apres: apresZoomSurLieu }));

    // --- voir le monde entier ------------------------------------------------
    await tab.click('#map-tout');
    await dormir(700);
    const monde = await vue(tab);
    verifier('le bouton 🌍 montre tout le monde', monde.bpp > 3, monde.bpp.toFixed(2));

    // Une destination sans repère à l'écran est une destination inatteignable.
    // Les noms, eux, ont le droit de manquer quand la place manque : c'est la
    // pastille d'icône qui garantit qu'on peut toujours partir.
    const vus = await lieuxVus(tab);
    const grands = ['Paris', 'New York', 'San Francisco', 'Nice', 'Lille', 'Chine', 'Planète Mars',
      'Château de Villandry', 'Aéroport Charles-de-Gaulle', 'Village gaulois', 'Base spatiale',
      'Circuit de F1', 'Volcan', 'Désert', 'Île tropicale', 'Château médiéval', "Parc d'attractions"];
    const absents = grands.filter((n) => !vus.includes(n));
    verifier('toutes les grandes destinations restent repérables',
      absents.length === 0, absents.join(', '));

    // Rien ne doit déborder du cadre : un nom coupé n'est ni lisible ni touchable.
    const debord = await tab.evaluate(() => {
      const c2 = window.__carte;
      const css = c2.taille().css;
      return c2.etiquettes.filter((e) => e.rect.x0 < -1 || e.rect.x1 > css + 1
        || e.rect.y0 < -1 || e.rect.y1 > css + 1).map((e) => e.lieu.name);
    });
    verifier('aucun nom ne déborde de la carte', debord.length === 0, debord.join(', '));

    // --- toucher un nom ------------------------------------------------------
    const cible = await tab.evaluate(() => {
      const e = window.__carte.etiquettes.find((x) => x.lieu.name === 'Nice');
      if (!e) return null;
      const r = document.getElementById('map-modal-canvas').getBoundingClientRect();
      return { x: r.left + (e.rect.x0 + e.rect.x1) / 2, y: r.top + (e.rect.y0 + e.rect.y1) / 2,
        lieu: { x: e.lieu.x, z: e.lieu.z } };
    });
    if (!cible) verifier('Nice est repérable sur la carte du monde', false);
    else {
      await tab.mouse.click(cible.x, cible.y);
      await dormir(700);
      const arrive = await position(tab);
      verifier('toucher un lieu emmène en voyage',
        Math.hypot(arrive.x - cible.lieu.x, arrive.z - cible.lieu.z) < 6 && !(await carteOuverte(tab)),
        JSON.stringify(arrive));
    }

    // --- appui long n'importe où ---------------------------------------------
    await banc.ouvrirLaCarte(tab);
    await tab.evaluate(() => { const c2 = window.__carte; c2.vue.cx = 0; c2.vue.cz = -320; c2.vue.bpp = 1.2; });
    await dormir(400);
    const attendu = await tab.evaluate(() => {
      const c2 = window.__carte;
      const r = document.getElementById('map-modal-canvas').getBoundingClientRect();
      return { ecran: { x: r.left + 90, y: r.top + 90 }, monde: c2.versMonde(90, 90) };
    });
    await tab.mouse.move(attendu.ecran.x, attendu.ecran.y);
    await tab.mouse.down();
    await dormir(900);
    await tab.mouse.up();
    await dormir(600);
    const pose = await position(tab);
    verifier('un appui long dépose n\'importe où',
      Math.hypot(pose.x - attendu.monde.x, pose.z - attendu.monde.z) < 6 && !(await carteOuverte(tab)),
      JSON.stringify({ voulu: [Math.round(attendu.monde.x), Math.round(attendu.monde.z)], obtenu: [pose.x, pose.z] }));

    // --- plus on s'approche, plus la carte montre ----------------------------
    await banc.ouvrirLaCarte(tab);

    // Les rues de Paris : elles sont calculées, elles doivent donc apparaître
    // même sans avoir mis un pied dans la ville.
    const rues = await tab.evaluate(() => {
      const c2 = window.__carte;
      const bitume = () => {
        const f = c2.fond;
        const d = f.getContext('2d').getImageData(0, 0, f.width, f.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 100 && Math.abs(d[i] - d[i + 2]) < 30) n++;
        }
        return n / (f.width * f.height);
      };
      c2.vue.cx = -240; c2.vue.cz = 200; c2.vue.bpp = 3;
      c2.rendreFond();
      const loin = bitume();
      c2.vue.bpp = 0.35;
      c2.rendreFond();
      return { loin, pres: bitume() };
    });
    verifier('en s\'approchant, Paris révèle ses rues',
      rues.pres > 0.015 && rues.pres > rues.loin * 4,
      JSON.stringify({ loin: rues.loin.toFixed(3), pres: rues.pres.toFixed(3) }));

    // Et ce qu'un enfant construit finit sur la carte : c'est la promesse de
    // « plus précise » — une carte qui ne montrerait que le terrain d'origine
    // ne dirait rien de son monde à lui.
    const construit = await tab.evaluate(() => {
      const g = window.__game, c2 = window.__carte;
      const x0 = Math.round(g.player.pos.x) + 8, z0 = Math.round(g.player.pos.z) + 8;
      for (let dx = 0; dx < 8; dx++) {
        for (let dz = 0; dz < 8; dz++) {
          const y = g.world.terrainHeight(x0 + dx, z0 + dz) + 1;
          g.world.setBlock(x0 + dx, y, z0 + dz, 19);   // de l'or : rien de tel en surface
        }
      }
      const compterOr = () => {
        const f = c2.fond;
        const d = f.getContext('2d').getImageData(0, 0, f.width, f.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 190 && d[i + 1] > 140 && d[i + 2] < 110) n++;
        }
        return n;
      };
      c2.vue.cx = x0 + 4; c2.vue.cz = z0 + 4;
      c2.vue.bpp = 0.35; c2.rendreFond();
      const pres = compterOr();
      c2.vue.bpp = 2.5; c2.rendreFond();
      return { pres, loin: compterOr() };
    });
    verifier('ce que l\'enfant construit apparaît sur la carte de près',
      construit.pres > 20 && construit.loin === 0, JSON.stringify(construit));

    // Les créatures restent visibles en dézoomant. Elles disparaissaient sans
    // un mot au-delà d'un seuil de zoom — « je ne vois plus de Pokémon sur la
    // carte » — pendant que la légende continuait de les promettre. Elles
    // vivent près du joueur : de loin, elles se regroupent autour de sa
    // flèche, et c'est la vérité. Mesuré avant correction : 0 pixel violet
    // dès bpp 1,6.
    const violets = await tab.evaluate(() => {
      const c2 = window.__carte, g = window.__game;
      // La ponte est opportuniste : près du spawn il peut n'y avoir qu'une
      // seule créature, et une seule se cache facilement. On en garantit une
      // poignée par le vrai chemin de ponte avant de mesurer.
      for (let i = 0; i < 60 && g.creatureManager.creatures.length < 6; i++) {
        g.creatureManager.trySpawn();
      }
      if (!g.creatureManager.creatures.length) return { erreur: 'aucune créature à dessiner' };
      c2.vue.cx = Math.round(g.player.pos.x); c2.vue.cz = Math.round(g.player.pos.z);
      const compter = () => {
        const cv = document.getElementById('map-modal-canvas');
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (Math.abs(d[i] - 200) < 30 && Math.abs(d[i + 1] - 110) < 30 && Math.abs(d[i + 2] - 224) < 30) n++;
        }
        return n;
      };
      const par = {};
      for (const bpp of [0.7, 2.5]) { c2.vue.bpp = bpp; c2.limiter(); c2.peindre(); par[bpp] = compter(); }
      return par;
    });
    verifier('les créatures restent visibles en dézoomant',
      !violets.erreur && violets['0.7'] > 0 && violets['2.5'] > 0, JSON.stringify(violets));

    // --- les bornes ----------------------------------------------------------
    const bornes = await tab.evaluate(() => {
      const c2 = window.__carte;
      for (let i = 0; i < 40; i++) c2.zoomerVers(100, 100, 1.5);
      const pres = c2.vue.bpp;
      for (let i = 0; i < 60; i++) c2.zoomerVers(100, 100, 1 / 1.5);
      const loin = c2.vue.bpp;
      for (let i = 0; i < 60; i++) { c2.vue.cx += 500; c2.limiter(); }
      return { pres, loin, cx: c2.vue.cx };
    });
    verifier('on ne peut ni zoomer à l\'infini ni sortir du monde',
      bornes.pres >= 0.2 && bornes.loin <= 5 && bornes.cx < 1500, JSON.stringify(bornes));

    // --- le bas de Manhattan -------------------------------------------------
    //
    // Le bas de l'île tenait en quinze blocs : de la pointe de Battery à la 14e
    // Rue, il y avait moins de place que dans un seul pâté de Midtown. Aucun
    // plan réel n'y entrait, et les quartiers dont un enfant connaît le nom —
    // TriBeCa, SoHo, Chinatown, le Village, Wall Street — se retrouvaient les
    // uns sur les autres. On vérifie donc les deux choses qu'il verrait :
    // qu'on peut y aller, et qu'une fois là-bas ce n'est pas la même ville
    // qu'au nord.
    const NY = { x: 295, z: -110 };
    const sonder = (us, v0, v1) => tab.evaluate(({ ny, us: cols, v0: a, v1: b }) => {
      const w = window.__game.world;
      const RUE = [562, 563, 564, 566, 569];   // bitume, ligne, trottoir, pavé, passage
      return cols.map((u) => {
        const rues = [];
        let terre = 0;
        for (let v = a; v <= b; v++) {
          const x = ny.x + u, z = ny.z + v;
          const h = w.terrainHeight(x, z);
          if (h < 31) continue;                // le fleuve
          // Les deux voies rapides suivent la rive en diagonale : près du bord,
          // toutes les rangées finissent par être de la rue, quel que soit le
          // plan. On sonde donc l'intérieur de l'île, et lui seul.
          if (w.terrainHeight(x + 4, z) < 31 || w.terrainHeight(x - 4, z) < 31) continue;
          terre++;
          const sol = w.getBlock(x, h, z);
          let sommet = h;
          for (let y = h + 60; y > h; y--) if (w.getBlock(x, y, z)) { sommet = y; break; }
          if (RUE.includes(sol) && sommet === h) rues.push(v);
        }
        return { u, terre, rues };
      });
    }, { ny: NY, us, v0, v1 });

    // Les quartiers du bas ont enfin la place d'exister. Tout le bas de l'île
    // tenait dans quinze blocs — moins qu'un pâté de Midtown — et TriBeCa,
    // SoHo, Chinatown, le Village et Wall Street s'y superposaient. On regarde
    // donc ce qu'un enfant regarde : la carte, zoomée sur la pointe de l'île.
    await banc.ouvrirLaCarte(tab);
    await tab.evaluate(({ ny }) => {
      const c2 = window.__carte;
      c2.vue.cx = ny.x; c2.vue.cz = ny.z + 86; c2.vue.bpp = 0.4;
      c2.limiter(); c2.peindre();
    }, { ny: NY });
    await dormir(600);
    const quartiers = await tab.evaluate(() =>
      Object.fromEntries(window.__carte.etiquettes.map((e) => [e.lieu.name, [e.lieu.x, e.lieu.z]])));
    const attendus = ['Wall Street', 'SoHo', 'TriBeCa', 'Chinatown', 'Greenwich Village'];
    const manquants = attendus.filter((n) => !quartiers[n]);
    const zs = attendus.filter((n) => quartiers[n]).map((n) => quartiers[n][1]);
    const etendue = zs.length ? Math.max(...zs) - Math.min(...zs) : 0;
    verifier('les quartiers du bas de l\'île ont la place d\'exister',
      manquants.length === 0 && etendue > 25,
      manquants.length ? `absents : ${manquants.join(', ')}` : `${etendue} blocs entre Wall Street et le Village`);
    await tab.evaluate(() => document.getElementById('map-modal-close').click());
    await dormir(300);

    // Au nord de la 14e Rue, une rue tous les six blocs : c'est le plan des
    // commissaires de 1811, et presque toutes les rangées de rue tombent sur un
    // multiple de six. Au sud, chaque quartier a sa propre trame, à son propre
    // angle — la proportion s'effondre. C'est ce contraste qu'on mesure, et lui
    // seul dit que le bas de l'île a un plan à lui : mesuré 0,63 quand la
    // grille descendait jusqu'à la mer, 0,28 avec le vrai plan.
    // On écarte les colonnes qui tombent sur une avenue : une avenue est de la
    // rue du haut en bas, elle ne dirait rien.
    const surLaGrille = (colonnes) => {
      let n = 0, dessus = 0;
      for (const c of colonnes) {
        if (!c.terre || c.rues.length > c.terre * 0.5) continue;
        for (const v of c.rues) { n++; if (((v % 6) + 6) % 6 === 0) dessus++; }
      }
      return n ? dessus / n : -1;
    };
    const colonnes = [2, -4, 6, -9, 13, 17];
    const haut = surLaGrille(await sonder(colonnes, 20, 50));
    const bas = surLaGrille(await sonder(colonnes, 66, 100));
    verifier('la grille de 1811 s\'arrête bien à la 14e Rue',
      haut > 0.4 && bas < 0.4 && bas < haut * 0.8,
      `sur la grille : au nord ${haut.toFixed(2)}, au sud ${bas.toFixed(2)}`);

    // --- Paris et ses deux rives ---------------------------------------------
    //
    // Paris avait reçu son fleuve, mais rien n'était placé : la Tour Eiffel se
    // dressait sur la rive droite, le Louvre sur la rive gauche, et l'Opéra, le
    // Panthéon, les Invalides, la Bastille, le Luxembourg n'existaient pas du
    // tout. Une rive, ça ne se discute pas — c'est la première chose qu'un
    // enfant vérifie quand il compare avec un vrai plan.
    const PARIS = { x: -240, z: 200 };
    await banc.ouvrirLaCarte(tab);
    await tab.evaluate(({ p }) => {
      const c2 = window.__carte;
      c2.vue.cx = p.x; c2.vue.cz = p.z; c2.vue.bpp = 0.24;
      c2.limiter(); c2.peindre();
    }, { p: PARIS });
    await dormir(600);
    const vusParis = await lieuxVus(tab);
    const attendusParis = ['Tour Eiffel', 'Arc de Triomphe', 'Panthéon', 'Invalides',
      'Opéra', 'Bastille', 'Luxembourg', 'Concorde'];
    const absentsParis = attendusParis.filter((n) => !vusParis.includes(n));
    verifier('les lieux de Paris sont sur la carte', absentsParis.length === 0,
      absentsParis.length ? `absents : ${absentsParis.join(', ')}` : `${attendusParis.length} lieux`);

    // Sur quelle rive ? On cherche la Seine dans le monde, à l'aplomb du
    // monument, et on regarde de quel côté il tombe. Rien n'est supposé : si
    // le fleuve bougeait, la mesure bougerait avec lui.
    const rives = await tab.evaluate(({ p, noms }) => {
      const w = window.__game.world;
      const EAU = 7;
      const out = {};
      for (const [nom, x, z] of noms) {
        const fil = [];
        for (let zz = p.z - 45; zz <= p.z + 45; zz++) if (w.getBlock(x, 30, zz) === EAU) fil.push(zz);
        const axe = fil.length ? fil.reduce((a, b) => a + b, 0) / fil.length : null;
        const sol = w.terrainHeight(x, z);
        out[nom] = { axe, rive: axe === null ? '?' : (z < axe ? 'droite' : 'gauche'), sec: sol > 31 };
      }
      return out;
    }, { p: PARIS, noms: (await tab.evaluate(({ noms }) => noms.map((n) => {
      const e = window.__carte.etiquettes.find((x) => x.lieu.name === n);
      return e ? [n, Math.round(e.lieu.x), Math.round(e.lieu.z)] : null;
    }).filter(Boolean), { noms: ['Tour Eiffel', 'Invalides', 'Panthéon', 'Luxembourg', 'Concorde', 'Opéra', 'Bastille', 'Arc de Triomphe'] })) });

    const GAUCHE = ['Tour Eiffel', 'Invalides', 'Panthéon', 'Luxembourg'];
    const DROITE = ['Concorde', 'Opéra', 'Bastille', 'Arc de Triomphe'];
    const faux = [...GAUCHE.map((n) => [n, 'gauche']), ...DROITE.map((n) => [n, 'droite'])]
      .filter(([n, r]) => !rives[n] || rives[n].rive !== r || !rives[n].sec)
      .map(([n, r]) => `${n} devrait être rive ${r}, il est ${rives[n] ? rives[n].rive : 'absent'}${rives[n] && !rives[n].sec ? ' et dans l\'eau' : ''}`);
    verifier('chaque monument de Paris est sur sa rive et au sec',
      faux.length === 0, faux.join(' · '));
    await tab.evaluate(() => document.getElementById('map-modal-close').click());
    await dormir(300);

    // --- le tissu de Paris ----------------------------------------------------
    //
    // Le fleuve, les places et les percées étaient au bon endroit. Entre elles,
    // il n'y avait rien : la trame générique posait un immeuble par lot de
    // douze blocs, mais elle écartait tout lot voisin d'un repère, et le repère
    // « Caserne & Commissariat » couvre Paris entière. Le pâté d'immeubles
    // haussmannien n'a donc jamais été bâti une seule fois — Paris était un
    // plan de rues posé sur une prairie.
    //
    // Trois choses le disent, et aucune n'a besoin d'une capture d'écran : la
    // pierre de taille et le zinc dont la ville est faite, les cours au milieu
    // des îlots, et l'herbe qu'on ne foule plus en la traversant.
    const tissu = await tab.evaluate(() => {
      const w = window.__game.world;
      const P = { x: -240, z: 200 };
      const PIERRE = 560, ZINC = 561, PAVE_DE_COUR = 9, HERBE = 1, TERRE = 2;
      let bati = 0, cours = 0, nu = 0, total = 0;
      for (let u = -40; u <= 40; u++) {
        for (let v = -40; v <= 40; v++) {
          if (Math.hypot(u, v) > 40) continue;
          total++;
          const x = P.x + u, z = P.z + v;
          const h = w.terrainHeight(x, z);
          const sol = w.getBlock(x, h, z);
          if (sol === PAVE_DE_COUR) cours++;
          let pierre = false, rien = true;
          for (let y = h + 1; y < h + 20; y++) {
            const id = w.getBlock(x, y, z);
            if (!id) continue;
            rien = false;
            if (id === PIERRE || id === ZINC) pierre = true;
          }
          if (pierre) bati++;
          if (rien && (sol === HERBE || sol === TERRE)) nu++;
        }
      }
      return { bati, cours, nu, total };
    });
    verifier('Paris est bâtie de pierre de taille et de zinc',
      tissu.bati > 700,
      `${tissu.bati} colonnes sur ${tissu.total}`);
    verifier('ses îlots ont une cour', tissu.cours > 40,
      `${tissu.cours} pavés de cour`);
    verifier('et on ne la traverse plus dans l\'herbe', tissu.nu < 400,
      `${tissu.nu} colonnes d'herbe nue`);

    // --- le parc d'attractions -----------------------------------------------
    //
    // « Le parc d'attractions n'est pas dingue » — il tenait dans cinquante
    // blocs : une grande roue, un carrousel, un anneau de rails, et une allée
    // dallée posée un bloc trop bas, donc enterrée et invisible. On mesure
    // maintenant ce qui fait un parc : du relief, un lac, et des villages qu'on
    // peut viser sur la carte.
    const PARC = { x: 150, z: -60 };
    const releve = await tab.evaluate(({ p }) => {
      const w = window.__game.world;
      const EAU = 7;
      let plusHaut = 0, eau = 0;
      const hautes = [];
      for (let u = -50; u <= 50; u++) {
        for (let v = -50; v <= 50; v++) {
          if (Math.hypot(u, v) > 50) continue;
          const x = p.x + u, z = p.z + v;
          if (w.getBlock(x, 33, z) === EAU) eau++;
          let haut = 33;
          for (let y = 90; y > 33; y--) if (w.getBlock(x, y, z)) { haut = y; break; }
          const h = haut - 33;
          if (h > plusHaut) plusHaut = h;
          if (h >= 12) hautes.push([u, v]);
        }
      }
      // Combien de bâtiments distincts dépassent douze blocs ? On regroupe les
      // colonnes hautes par paquets de dix blocs : deux attractions à dix
      // blocs l'une de l'autre, c'est la même.
      const paquets = new Set(hautes.map(([u, v]) => `${Math.floor(u / 10)},${Math.floor(v / 10)}`));
      return { plusHaut, eau, hautes: hautes.length, paquets: paquets.size };
    }, { p: PARC });
    verifier('le parc a du relief, un lac et des attractions',
      releve.plusHaut >= 35 && releve.eau >= 250 && releve.paquets >= 12,
      `plus haut ${releve.plusHaut} blocs · ${releve.eau} blocs d'eau · ${releve.paquets} ensembles bâtis`);

    await banc.ouvrirLaCarte(tab);
    await tab.evaluate(({ p }) => {
      const c2 = window.__carte;
      c2.vue.cx = p.x; c2.vue.cz = p.z; c2.vue.bpp = 0.35;
      c2.limiter(); c2.peindre();
    }, { p: PARC });
    await dormir(600);
    const vusParc = await lieuxVus(tab);
    const villages = ['Entrée du parc', 'Village allemand', 'Village italien', 'Village grec',
      'Village scandinave', 'Village russe', 'Village néerlandais', 'Village espagnol'];
    const sansVillage = villages.filter((n) => !vusParc.includes(n));
    verifier('et ses villages sont des destinations', sansVillage.length === 0,
      sansVillage.length ? `absents : ${sansVillage.join(', ')}` : `${villages.length} villages`);
    await tab.evaluate(() => document.getElementById('map-modal-close').click());
    await dormir(300);

    // --- San Francisco : les collines et la presqu'île ------------------------
    //
    // « Il n'y a pas les collines, il n'y a pas la cartographie exacte » : la
    // ville était un disque de maisons pastel posé sur un bruit de terrain,
    // sans côte et sans relief. Or c'est de ses collines et de sa presqu'île
    // qu'on la reconnaît — et de Market Street, la couture entre ses deux
    // quadrillages qui ne sont pas parallèles.
    const SF = { x: 0, z: -320 };
    const releveSF = await tab.evaluate(({ p }) => {
      const w = window.__game.world;
      // La plaine d'une ville n'est pas un défaut — le Sunset et SoMa sont
      // plats pour de vrai. Ce qu'on compte, ce sont les BUTTES : les endroits
      // qui montent d'au moins dix blocs au-dessus du niveau de la ville, et
      // combien il y en a de distincts. Une ville sans collines n'en a aucune.
      let sommet = 0, mer = 0, terre = 0, hautes = 0;
      const parRang = new Set();
      for (let u = -60; u <= 60; u += 2) {
        for (let v = -60; v <= 60; v += 2) {
          if (Math.hypot(u, v) > 60) continue;
          const h = w.terrainHeight(p.x + u, p.z + v);
          if (h <= 30) { mer++; continue; }
          terre++;
          sommet = Math.max(sommet, h);
          if (h >= 43) { hautes++; parRang.add(`${Math.floor(u / 10)},${Math.floor(v / 10)}`); }
        }
      }
      return { sommet, mer, terre, collines: parRang.size, hautes };
    }, { p: SF });
    verifier('San Francisco a ses collines et sa presqu\'île',
      releveSF.sommet >= 55 && releveSF.collines >= 6 && releveSF.mer > releveSF.terre * 0.4,
      `sommet ${releveSF.sommet} · ${releveSF.collines} buttes distinctes `
      + `(${releveSF.hautes} points à dix blocs au-dessus de la ville) · `
      + `${releveSF.mer} points en mer pour ${releveSF.terre} à terre`);

    await banc.ouvrirLaCarte(tab);
    await tab.evaluate(({ p }) => {
      const c2 = window.__carte;
      c2.vue.cx = p.x; c2.vue.cz = p.z; c2.vue.bpp = 0.3;
      c2.limiter(); c2.peindre();
    }, { p: SF });
    await dormir(600);
    const vusSF = await lieuxVus(tab);
    const quartiersSF = ['Twin Peaks', 'Golden Gate Park', 'Mission', 'Castro', 'Chinatown', 'Le Presidio'];
    const sansQuartier = quartiersSF.filter((n) => !vusSF.includes(n));
    verifier('et ses quartiers sont des destinations', sansQuartier.length === 0,
      sansQuartier.length ? `absents : ${sansQuartier.join(', ')}` : `${quartiersSF.length} quartiers`);
    await tab.evaluate(() => document.getElementById('map-modal-close').click());
    await dormir(300);

    // --- Nice et Lille --------------------------------------------------------
    //
    // Deux disques de maisons génériques, l'un « au bord de la mer » sans mer,
    // l'autre avec un beffroi posé au milieu de rien. Or chacune tient dans une
    // forme : la baie des Anges pour Nice, et pour Lille l'étoile à cinq
    // branches de la citadelle de Vauban, qu'on ne lit que vue du ciel.
    const releveVilles = await tab.evaluate(() => {
      const w = window.__game.world;
      const EAU = 7;
      // Nice : la mer occupe le sud de la baie, et trois collines se lèvent.
      let mer = 0, terre = 0, sommetNice = 0;
      for (let u = -44; u <= 44; u += 2) {
        for (let v = -44; v <= 44; v += 2) {
          if (Math.hypot(u, v) > 44) continue;
          const h = w.terrainHeight(300 + u, 260 + v);
          if (h <= 30) mer++; else { terre++; sommetNice = Math.max(sommetNice, h); }
        }
      }
      // Lille : l'étoile se compte par ses douves. Cinq bastions, cinq
      // courtines : le contour est bien plus long que celui d'un cercle de même
      // aire — c'est cela, une étoile, et c'est mesurable.
      let douves = 0;
      for (let u = -40; u <= -4; u++) {
        for (let v = -34; v <= 2; v++) {
          // Les douves sont creusées sous le niveau de la mer : c'est le remplissage
          // général du monde qui les met en eau, à la cote trente.
          if (w.getBlock(-300 + u, 30, -200 + v) === EAU) douves++;
        }
      }
      return { mer, terre, sommetNice, douves };
    });
    verifier('Nice a sa baie et ses collines',
      releveVilles.mer > 200 && releveVilles.sommetNice >= 44,
      `${releveVilles.mer} points en mer pour ${releveVilles.terre} à terre · sommet ${releveVilles.sommetNice}`);
    verifier('Lille a sa citadelle en étoile, entourée d\'eau',
      releveVilles.douves > 260,
      `${releveVilles.douves} blocs de douves`);

    // --- Lille, relevée sur documents ----------------------------------------
    //
    // « La ville de Lille ne ressemble pas du tout à la réalité. » La fiche de
    // terrain (Wikipédia, offices de tourisme) dit ce qu'un enfant lillois
    // vérifie au premier regard, et on mesure exactement cela : la rue
    // Faidherbe file droit de la Grand'Place à la gare, dont l'horloge ferme
    // la vue ; la Déesse est au centre du damier de la Grand'Place et la
    // Vieille Bourse, à CÔTÉ d'elle et non dessus, garde sa cour intérieure ;
    // trois tours ont trois tailles (beffroi CCI 76 m < beffroi de l'hôtel de
    // ville 104 m < tour de Lille 120 m, blanche et en porte-à-faux — la
    // « chaussure de ski ») ; et l'eau : le quai du Wault, doigt de la Deûle
    // pointé vers le centre, et la façade translucide de la Treille.
    const fidele = await tab.evaluate(() => {
      const w = window.__game.world;
      const Lx = -300, Lz = -200, OR = 19, VERRE = 10, EAU = 7, BLANC = 310;
      const haut = (u, v) => {
        const h = w.terrainHeight(Lx + u, Lz + v);
        for (let y = h + 40; y > h; y--) { const id = w.getBlock(Lx + u, y, Lz + v); if (id) return { y: y - h, id }; }
        return { y: 0, id: 0 };
      };
      const colonne = (u, v, id) => {
        const h = w.terrainHeight(Lx + u, Lz + v);
        for (let y = h; y < h + 40; y++) if (w.getBlock(Lx + u, y, Lz + v) === id) return true;
        return false;
      };
      // la rue Faidherbe : rien au-dessus de la chaussée sur toute sa longueur
      let rueLibre = true;
      for (let u = 2; u <= 10; u++) if (haut(u, 0).y > 0) rueLibre = false;
      const horloge = colonne(11, 0, OR);
      // la Grand'Place : la Déesse au centre, le damier sous elle
      const deesse = haut(0, 0).id === OR;
      const p1 = w.getBlock(Lx + 2, w.terrainHeight(Lx + 2, Lz + 1), Lz + 1);
      const p2 = w.getBlock(Lx + 3, w.terrainHeight(Lx + 3, Lz + 1), Lz + 1);
      const damier = p1 !== p2 && p1 !== 0 && p2 !== 0;
      // la Vieille Bourse : des murs tout autour, une cour au milieu
      const cour = haut(4, -6).y <= 1 && haut(4, -10).y >= 5 && haut(0, -6).y >= 5;
      // les trois tours, chacune à sa place
      const cci = haut(6, -13).y, hdv = haut(6, 14).y, ski = haut(17, -3).y;
      // la chaussure de ski : blanche, et son porte-à-faux au-dessus du vide
      const bout = haut(17, 0);
      const hb = w.terrainHeight(Lx + 17, Lz);
      const videSous = w.getBlock(Lx + 17, hb + 6, Lz) === 0;
      // l'eau du quai du Wault, remplie à la cote trente comme les douves —
      // sondée à son bout EST, le seul hors de l'étoile de la citadelle : au
      // bout ouest, les douves du bastion mettaient déjà de l'eau avant.
      const wault = w.getBlock(Lx - 7, 30, Lz - 4) === EAU;
      // la façade claire de la Treille, percée de sa rosace de verre
      const treille = haut(-2, -16).y >= 7 && colonne(-2, -16, VERRE);
      return { rueLibre, horloge, deesse, damier, cour, cci, hdv, ski,
        blanc: bout.id === BLANC, videSous, wault, treille };
    });
    verifier("la rue Faidherbe file droit vers l'horloge de la gare",
      fidele.rueLibre && fidele.horloge,
      JSON.stringify({ rueLibre: fidele.rueLibre, horloge: fidele.horloge }));
    verifier('la Déesse veille sur le damier, la Vieille Bourse sur sa cour',
      fidele.deesse && fidele.damier && fidele.cour,
      JSON.stringify({ deesse: fidele.deesse, damier: fidele.damier, cour: fidele.cour }));
    verifier('trois tours, trois tailles : CCI, beffroi, chaussure de ski',
      fidele.cci >= 15 && fidele.hdv > fidele.cci && fidele.ski > fidele.hdv && fidele.blanc && fidele.videSous,
      `CCI ${fidele.cci} < hôtel de ville ${fidele.hdv} < tour de Lille ${fidele.ski}`
      + ` · blanche ${fidele.blanc} · porte-à-faux ${fidele.videSous}`);
    verifier('le quai du Wault est en eau, la Treille montre sa façade de verre',
      fidele.wault && fidele.treille,
      JSON.stringify({ wault: fidele.wault, treille: fidele.treille }));

    // --- Nice, relevée sur documents -----------------------------------------
    //
    // La fiche de terrain dit ce qui manquait : le port Lympia est un bassin
    // RECTANGULAIRE caché derrière la colline (pas un ovale), avec ses pointus
    // colorés à quai ; le Negresco lève sa coupole rose sur la Promenade ;
    // Saint-Nicolas porte cinq bulbes VERTS (pas un arc-en-ciel) ; Masséna a
    // SEPT statues perchées, pas six ; et la Promenade a ses chaises bleues et
    // ses palmiers, le cours Saleya ses stores rayés, le Paillon sa baleine de
    // bois — le mobilier que tout enfant niçois reconnaît avant les monuments.
    const nicoise = await tab.evaluate(() => {
      const w = window.__game.world;
      const Nx = 300, Nz = 260, EAU = 7, LOG = 5, ROUGE = 23, BLEU_CH = 24, JAUNE = 25;
      const VERT = 90, ROSE = 200, BLANC = 310, STATUE = 230;
      const haut = (u, v) => {
        const h = w.terrainHeight(Nx + u, Nz + v);
        for (let y = h + 40; y > h; y--) { const id = w.getBlock(Nx + u, y, Nz + v); if (id) return { y: y - h, id }; }
        return { y: 0, id: 0 };
      };
      const colonne = (u, v, id) => {
        const h = w.terrainHeight(Nx + u, Nz + v);
        for (let y = h; y < h + 40; y++) if (w.getBlock(Nx + u, y, Nz + v) === id) return true;
        return false;
      };
      const surface = (u, v) => w.getBlock(Nx + u, w.terrainHeight(Nx + u, Nz + v), Nz + v);
      // le bassin rectangulaire : ses coins, hors de l'ancien ovale, sont en
      // eau — dont celui du sud-est, là où le bassin gagne sur la plage
      const bassin = surface(12, 1) === EAU && surface(16, 5) === EAU;
      const pointu = colonne(13, 1, ROUGE);
      // la coupole rose sur la façade blanche, les bulbes verts sur l'ocre
      const negresco = colonne(-10, 2, BLANC) && colonne(-8, 2, ROSE);
      const stNicolas = haut(-11, -7).y >= 10 && colonne(-11, -7, VERT);
      // les statues perchées de Masséna, comptées une à une
      let statues = 0;
      for (let du = -7; du <= 7; du++) {
        for (let dv = -6; dv <= 6; dv++) {
          const t = haut(du, dv);
          if (t.id === STATUE && t.y >= 6) statues++;
        }
      }
      // le mobilier de la Promenade, de Saleya et du Paillon
      let chaises = 0, palmiers = 0;
      for (const u of [-28, -21, -14, -7]) {
        for (let v = 2; v <= 12; v++) if (colonne(u, v, BLEU_CH)) { chaises++; break; }
      }
      for (const u of [-40, -35, -30, -25, -20, -15, -5]) {
        for (let v = 2; v <= 14; v++) if (colonne(u, v, LOG)) { palmiers++; break; }
      }
      const saleya = colonne(6, 5, ROUGE) && colonne(5, 5, JAUNE);
      const baleine = colonne(0, -6, LOG);
      return { bassin, pointu, negresco, stNicolas, statues, chaises, palmiers, saleya, baleine };
    });
    verifier('le port Lympia est un vrai bassin, et ses pointus sont à quai',
      nicoise.bassin && nicoise.pointu,
      JSON.stringify({ bassin: nicoise.bassin, pointu: nicoise.pointu }));
    verifier('la coupole rose du Negresco, les bulbes verts de Saint-Nicolas',
      nicoise.negresco && nicoise.stNicolas,
      JSON.stringify({ negresco: nicoise.negresco, stNicolas: nicoise.stNicolas }));
    verifier('sept statues perchées veillent sur Masséna',
      nicoise.statues === 7, `${nicoise.statues} statues`);
    verifier('chaises bleues, palmiers, stores rayés et la baleine du Paillon',
      nicoise.chaises >= 3 && nicoise.palmiers >= 6 && nicoise.saleya && nicoise.baleine,
      JSON.stringify({ chaises: nicoise.chaises, palmiers: nicoise.palmiers,
        saleya: nicoise.saleya, baleine: nicoise.baleine }));

    // --- San Francisco, relevée sur documents --------------------------------
    //
    // La fiche de terrain énumère les erreurs classiques, et l'ancien code les
    // faisait toutes : un pont ROUGE VIF couché est-ouest qui ne menait nulle
    // part (l'orange international est un rouge-orangé brûlé, et le pont va du
    // Presidio aux Marin Headlands, plein nord) ; pas de Headlands du tout ;
    // pas de brouillard ; le Bay Bridge de la même couleur que le Golden Gate ;
    // et aucune des icônes que cherchent les enfants — les otaries de Pier 39,
    // les épingles fleuries de Lombard Street, le Dragon Gate de Chinatown.
    const frisco = await tab.evaluate(() => {
      const w = window.__game.world;
      const Sx = 0, Sz = -320;
      const ORANGE = 40, ICE = 18, MARRON = 210, BRIQUE = 11, VIOLET = 27;
      const VERT_TOIT = 90, DORE = 260, OLIVE = 250, GRIS = 33, ROUGE_LAINE = 23;
      const haut = (u, v) => {
        const h = w.terrainHeight(Sx + u, Sz + v);
        for (let y = h + 45; y > h; y--) { const id = w.getBlock(Sx + u, y, Sz + v); if (id) return { y: y - h, id }; }
        return { y: 0, id: 0 };
      };
      const colonne = (u, v, id) => {
        const h = w.terrainHeight(Sx + u, Sz + v);
        for (let y = h; y < h + 45; y++) if (w.getBlock(Sx + u, y, Sz + v) === id) return true;
        return false;
      };
      // le pont : orange, pylône sud dressé, tablier filant vers le nord.
      // Le rivage sous le pylône est à la cote 33 : le sommet à 54 fait une
      // hauteur relative de 21 — bien au-dessus du brouillard, qui plafonne à 14.
      const pylone = colonne(-22, -35, ORANGE) && haut(-22, -35).y >= 18;
      const tablier = colonne(-21, -46, 562);
      // les Marin Headlands : de la terre dorée là où il n'y avait que la mer
      const hMarin = w.terrainHeight(Sx - 22, Sz - 52);
      const solMarin = w.getBlock(Sx - 22, hMarin, Sz - 52);
      const marin = hMarin >= 32 && (solMarin === DORE || solMarin === OLIVE);
      // Karl the Fog : la nappe translucide sur la passe, sous les pylônes
      const brouillard = colonne(-27, -44, ICE) && colonne(-15, -44, ICE);
      // le Bay Bridge est gris — c'est la couleur qui empêche de le confondre
      const bayGris = colonne(38, 1, GRIS) && !colonne(38, 1, ROUGE_LAINE);
      // les icônes des enfants
      const otaries = colonne(29, -29, MARRON);
      const lombard = colonne(32, -18, BRIQUE) && colonne(32, -17, VIOLET);
      const dragon = colonne(36, -9, VERT_TOIT) && colonne(36, -9, 19);
      return { pylone, tablier, marin, brouillard, bayGris, otaries, lombard, dragon };
    });
    verifier('le Golden Gate, orange, va du Presidio aux Marin Headlands',
      frisco.pylone && frisco.tablier && frisco.marin,
      JSON.stringify({ pylone: frisco.pylone, tablier: frisco.tablier, marin: frisco.marin }));
    verifier('Karl the Fog coule sur la passe, et les pylônes en dépassent',
      frisco.brouillard && frisco.pylone,
      JSON.stringify({ brouillard: frisco.brouillard }));
    verifier('le Bay Bridge est gris — on ne le confond plus avec le Golden Gate',
      frisco.bayGris, JSON.stringify({ bayGris: frisco.bayGris }));
    verifier('les otaries de Pier 39, Lombard fleurie et le Dragon Gate',
      frisco.otaries && frisco.lombard && frisco.dragon,
      JSON.stringify({ otaries: frisco.otaries, lombard: frisco.lombard, dragon: frisco.dragon }));

    // --- la Chine : une région entière dans l'ancienne zone morte -------------
    //
    // Entre San Francisco et le Pôle Nord, il n'y avait RIEN : des collines de
    // bruit. La fiche de terrain a posé une région culturelle complète, et on
    // mesure ses signatures : la muraille qui serpente SUR les crêtes (jamais
    // en fond de vallée), la Cité interdite vermillon et or avec ses lions de
    // bronze, les karsts de Guilin au bord de la rivière turquoise, les
    // rizières en marches d'eau, et les pandas dans leur bambouseraie.
    const chine = await tab.evaluate(() => {
      const w = window.__game.world;
      const Cx = -60, Cz = -520;
      const GRIS_MUR = 33, VERMILLON = 40, JAUNE = 60, ORB = 19, EAU = 7, NOIR = 28, TIGE = 5;
      const creteV = (u) => -34 + Math.round(6 * Math.sin(u / 9) + u * 0.12);
      const colonne = (u, v, id) => {
        const h = w.terrainHeight(Cx + u, Cz + v);
        for (let y = h - 2; y < h + 20; y++) if (w.getBlock(Cx + u, y, Cz + v) === id) return true;
        return false;
      };
      const surface = (u, v) => w.getBlock(Cx + u, w.terrainHeight(Cx + u, Cz + v), Cz + v);
      // la muraille : présente sur la crête en cinq points, et la crête domine
      let surCrete = 0, domine = 0;
      for (const u of [-40, -20, 0, 20, 40]) {
        const vc = creteV(u);
        if (colonne(u, vc, GRIS_MUR)) surCrete++;
        if (w.terrainHeight(Cx + u, Cz + vc) - w.terrainHeight(Cx + u, Cz + vc + 20) >= 6) domine++;
      }
      // la Cité interdite : la porte vermillon au pavillon jaune, les lions
      const porte = colonne(-6, 10, VERMILLON) && colonne(-6, 10, JAUNE);
      const lions = colonne(-8, 13, ORB);
      // les karsts et la rivière turquoise
      const karst = w.terrainHeight(Cx + 27, Cz + 4) - 34 >= 15;
      const riviere = surface(34 + Math.round(5 * Math.sin(10 / 11)), 10) === EAU;
      // les rizières : de l'eau en marches
      const rizEau = surface(19, 40) === EAU;
      const marches = w.terrainHeight(Cx + 19, Cz + 40) - w.terrainHeight(Cx + 19, Cz + 46) >= 1;
      // les pandas dans leur bambouseraie
      const panda = colonne(-18, 40, NOIR);
      let bambous = 0;
      for (let du = -8; du <= 8; du += 2) {
        for (let dv = -6; dv <= 6; dv += 2) if (colonne(-14 + du, 40 + dv, TIGE)) { bambous++; }
      }
      return { surCrete, domine, porte, lions, karst, riviere, rizEau, marches, panda, bambous };
    });
    verifier('la Grande Muraille serpente sur les crêtes',
      chine.surCrete >= 4 && chine.domine >= 3,
      `${chine.surCrete}/5 points sur la crête · la crête domine en ${chine.domine}/5`);
    verifier('la Cité interdite : vermillon, tuiles jaunes et lions de bronze',
      chine.porte && chine.lions, JSON.stringify({ porte: chine.porte, lions: chine.lions }));
    verifier('les karsts de Guilin au bord de la rivière turquoise',
      chine.karst && chine.riviere, JSON.stringify({ karst: chine.karst, riviere: chine.riviere }));
    verifier('les rizières en marches d\'eau, les pandas dans les bambous',
      chine.rizEau && chine.marches && chine.panda && chine.bambous >= 5,
      JSON.stringify({ rizEau: chine.rizEau, marches: chine.marches,
        panda: chine.panda, bambous: chine.bambous }));

    await banc.ouvrirLaCarte(tab);
    for (const [nom, cx, cz, attendus] of [
      ['Nice', 300, 260, ['Place Masséna', 'Vieux-Nice', 'Promenade des Anglais', 'Port Lympia']],
      ['Lille', -300, -200, ["Grand'Place", 'Vieux-Lille', 'Citadelle', 'Euralille']],
    ]) {
      await tab.evaluate(({ x, z }) => {
        const c2 = window.__carte;
        c2.vue.cx = x; c2.vue.cz = z; c2.vue.bpp = 0.35;
        c2.limiter(); c2.peindre();
      }, { x: cx, z: cz });
      await dormir(500);
      const vusV = await lieuxVus(tab);
      const manque = attendus.filter((n) => !vusV.includes(n));
      verifier(`les lieux de ${nom} sont sur la carte`, manque.length === 0,
        manque.length ? `absents : ${manque.join(', ')}` : `${attendus.length} lieux`);
    }
    await tab.evaluate(() => document.getElementById('map-modal-close').click());
    await dormir(300);

    verifier('aucune erreur JavaScript sur la tablette', tab.erreurs.length === 0,
      JSON.stringify(tab.erreurs));

    // --- et sur un ordinateur, à la souris -----------------------------------
    // C'est là que la carte était complètement inerte : la souris capturée par
    // le jeu envoyait tous les clics dans la fenêtre 3D.
    const bureau = await banc.jouerSeul('Alice');
    await banc.ouvrirLaCarte(bureau);
    const boutonRecoit = await bureau.evaluate(() => {
      const b = document.getElementById('map-tout');
      const r = b.getBoundingClientRect();
      const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return dessus === b;
    });
    verifier('à la souris, les commandes de la carte sont bien atteignables', boutonRecoit);

    const avant = await vue(bureau);
    await bureau.click('#map-tout');
    await dormir(600);
    verifier('et le bouton 🌍 répond vraiment au clic',
      (await vue(bureau)).bpp > avant.bpp * 2,
      `${avant.bpp.toFixed(2)} → ${(await vue(bureau)).bpp.toFixed(2)}`);

    const c3 = await cadre(bureau);
    const avantMolette = (await vue(bureau)).bpp;
    await bureau.mouse.move(c3.x + c3.w / 2, c3.y + c3.w / 2);
    await bureau.mouse.wheel(0, -400);
    await dormir(400);
    const apresMolette = (await vue(bureau)).bpp;
    verifier('la molette zoome', apresMolette < avantMolette * 0.9,
      `${avantMolette.toFixed(2)} → ${apresMolette.toFixed(2)}`);

    verifier('aucune erreur JavaScript sur l\'ordinateur', bureau.erreurs.length === 0,
      JSON.stringify(bureau.erreurs));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ la carte se laisse promener, zoomer et toucher');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
